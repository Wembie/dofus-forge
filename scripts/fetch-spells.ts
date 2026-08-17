/**
 * ETL: dofusdude/dofus3-main GitHub releases -> per-class spell JSON + images
 *
 * Usage: pnpm fetch-spells [--force]
 *
 * Data source: https://github.com/dofusdude/dofus3-main/releases
 * Files used:
 *   breeds.json          — breed (class) definitions + spell ID lists
 *   spells.json          — spell metadata (nameId, iconId, spellLevels IDs)
 *   spell_levels.json    — per-grade stats (AP cost, range, effects)
 *   spell_variants.json  — pairs of [normalSpellId, variantSpellId] per breed
 *   spell_images_48.tar.gz — 48px spell icon PNGs (sort_{iconId}-48.png)
 *   {lang}.json          — string ID -> translated text
 *
 * effectElement mapping (verified 2026-08-05 from effects.json descriptions):
 *   0=neutral, 1=earth, 2=fire, 3=water, 4=air
 *
 * Output: public/data/{lang}/spells/{classSlug}.json
 *         public/data/spells/img/sort_{iconId}-48.png  (extracted from tar)
 */

import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { createGunzip } from 'node:zlib'

const LANGS    = ['en', 'es', 'fr', 'pt'] as const
const DATA_DIR = join(process.cwd(), 'public', 'data')
const FORCE    = process.argv.includes('--force')

const ELEMENT_OF: Record<number, AppSpellElement> = {
  0: 'neutral',
  1: 'earth',
  2: 'fire',
  3: 'water',
  4: 'air',
}

const CLASS_SLUG: Record<string, string> = {
  Feca:          'feca',
  Osamodas:      'osamodas',
  Enutrof:       'enutrof',
  Sram:          'sram',
  Xelor:         'xelor',
  Ecaflip:       'ecaflip',
  Eniripsa:      'eniripsa',
  Iop:           'iop',
  Cra:           'cra',
  Sadida:        'sadida',
  Sacrier:       'sacrier',
  Pandawa:       'pandawa',
  Rogue:         'rogue',
  Masqueraider:  'masqueraider',
  Foggernaut:    'foggernaut',
  Eliotrope:     'eliotrope',
  Huppermage:    'huppermage',
  Ouginak:       'ouginak',
  Forgelance:    'forgelance',
}

export type AppSpellElement = 'earth' | 'fire' | 'water' | 'air' | 'neutral' | 'mixed'

export type AppSpellEffectKind =
  | 'damage' | 'steal' | 'poison' | 'push'
  | 'ap' | 'ap_gain'
  | 'mp' | 'mp_gain'
  | 'erosion' | 'heal_mod' | 'spell_buff'

export type AppSpellEffect = {
  element:    Exclude<AppSpellElement, 'mixed'>
  min:        number
  max:        number
  kind:       AppSpellEffectKind
  condition?: 'shield'
  spellId?:    number
  stack?:      number
  turns?:      number
  deathReset?: boolean
}

export type AppSpellLevel = {
  grade:       number
  ap:          number
  minRange:    number
  maxRange:    number   // 0 = melee
  maxPerTurn:  number   // 0 = unlimited
  critChance:  number   // %
  effects:     AppSpellEffect[]
  critEffects?: AppSpellEffect[]  // crit hit effects (absent = same as normal or no crit)
  buffs?:      string[]
}

export type AppSpell = {
  id:          number
  name:        string
  element:     AppSpellElement
  is_variant:  boolean
  image_url:   string | null
  levels:      AppSpellLevel[]
  description?: string
}

// Script-internal types (not exported to spellLoaders.ts)
type RawBuff = { effectId: number; min: number; max: number; turns: number }
type AppSpellLevelInternal = AppSpellLevel & { _rawBuffs?: RawBuff[] }

export type ClassSpells = {
  classSlug: string
  spells:    AppSpell[]
}

function parseRefs(raw: unknown): Map<number, Record<string, unknown>> {
  const result = new Map<number, Record<string, unknown>>()
  const refs = ((raw as Record<string, unknown>)?.references as Record<string, unknown>)?.RefIds as unknown[]
  if (!Array.isArray(refs)) return result
  for (const ref of refs) {
    const data = (ref as Record<string, unknown>)?.data as Record<string, unknown> | undefined
    if (data?.id != null) result.set(Number(data.id), data)
  }
  return result
}

async function download(url: string): Promise<unknown> {
  process.stdout.write(`  ↓ ${url.split('/').pop()} ... `)
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed: ${url} → ${res.status}`)
  const data = await res.json()
  console.log('ok')
  return data
}

async function downloadBuffer(url: string): Promise<Buffer> {
  process.stdout.write(`  ↓ ${url.split('/').pop()} ... `)
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed: ${url} → ${res.status}`)
  const data = Buffer.from(await res.arrayBuffer())
  console.log(`ok (${(data.length / 1024 / 1024).toFixed(1)}MB)`)
  return data
}

function t(entries: Record<string, string>, id: number | null | undefined): string {
  if (id == null) return ''
  return entries[String(id)] ?? ''
}

function dominantElement(effects: AppSpellEffect[]): AppSpellElement {
  const elems = new Set(effects.map(e => e.element).filter(e => e !== 'neutral'))
  if (elems.size === 0) return 'neutral'
  if (elems.size > 1)  return 'mixed'
  return [...elems][0]
}

// effectId constants (verified from dofus3-main Unity data, 2026-08-09):
//   5    = push (diceNum = cells)
//   128  = steal/modify AP (diceNum = amount)
//   141  = steal/modify MP (diceNum = amount)
//   96-100 = elemental damage (elem=3,1,4,2,0 → water,earth,air,fire,neutral)
//   91-95  = elemental steal/lifesteal (same elem pattern)
//   2822 = best-element damage (effectElement=-1, diceNum/diceSide = base dmg)
//   2832 = worst-element damage (effectElement=-1, diceNum/diceSide = base dmg)
//   118,119,123,126 = lifesteal % modifiers (category=0, NOT actual damage — filter out)
const PUSH_ID   = 5
// AP: 84=steal from enemy, 111=gain for caster
const AP_STEAL_IDS = new Set([84])
const AP_GAIN_IDS  = new Set([111])
// MP: 127/169=steal from enemy, 128=gain for caster
const MP_STEAL_IDS = new Set([127, 169])
const MP_GAIN_IDS  = new Set([128])
// Best/worst element damage (effectElement=-1, treated as neutral for display)
const OMNI_DMG_IDS = new Set([2822, 2832])
// Percentage modifiers accompanying steal effects — skip these (not damage values)
const LIFESTEAL_PCT_IDS = new Set([118, 119, 123, 126])
// Elemental steal/lifesteal effectIds (same element pattern as 96-100 damage effectIds)
const STEAL_IDS = new Set([91, 92, 93, 94, 95])
// Special effect IDs
const EROSION_ID    = 776   // "#1~#2% Erosion" (incurable damage %)
const HEAL_MOD_ID   = 1159  // "Heals received x#1%"
const SPELL_BUFF_ID = 293   // "#1: +#3 base damage" stacking spell buff
// Internal counter/trigger — no display value (3793 = internal counter, silently ignored)
const COUNTER_IDS = new Set([3793])
void COUNTER_IDS

// All effectIds already handled by specific extraction logic — skip from generic buff pass
const SKIP_BUFF_IDS = new Set([
  5,                           // push
  84, 111,                     // AP steal/gain
  77, 127, 128, 169,           // MP steal/gain
  91, 92, 93, 94, 95,          // elemental steal (also caught by effectElement check)
  96, 97, 98, 99, 100,         // elemental damage (also caught by effectElement check)
  118, 119, 123, 126,          // lifesteal % modifiers — not damage values
  293,                         // spell_buff (stacking charge buff)
  776,                         // erosion
  1159,                        // heal_mod
  2822, 2832,                  // omni damage
  3793,                        // internal counter
])

type RawEffect = { effect: AppSpellEffect; mask: string }

// Deduplicate effects that are mutually exclusive alternatives (each fires on one of
// several state conditions *e<id>/*E<id>). Keeps first representative per (element,min,max,kind).
function deduplicateConditional(items: RawEffect[]): AppSpellEffect[] {
  const keepIdx = new Set<number>(items.map((_, i) => i))
  const groups = new Map<string, number[]>()
  for (let i = 0; i < items.length; i++) {
    const e = items[i].effect
    const key = `${e.element}|${e.min}|${e.max}|${e.kind}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(i)
  }
  for (const [, indices] of groups) {
    if (indices.length <= 1) continue
    // Only deduplicate when ALL duplicates have explicit state conditions (*e or *E in mask)
    // — those are mutually exclusive, only one fires per cast. Multi-hits with no state
    // conditions (different AoE zones) are NOT deduplicated.
    const allStateConditional = indices.every(i => /\*[eE]\d/.test(items[i].mask))
    if (allStateConditional) {
      for (let j = 1; j < indices.length; j++) keepIdx.delete(indices[j])
    }
  }
  return items.filter((_, i) => keepIdx.has(i)).map(r => r.effect)
}

function extractDamageEffects(rawEffects: Record<string, unknown>[]): AppSpellEffect[] {
  const items: RawEffect[] = []

  // Elemental damage/steal effects (effectElement 0-4); skip lifesteal % modifiers
  for (const e of rawEffects) {
    const el   = Number(e.effectElement)
    const eid  = Number(e.effectId)
    const mask = String(e.targetMask ?? '')
    if (el >= 0 && el <= 4 && !LIFESTEAL_PCT_IDS.has(eid)) {
      const triggerTurns = Number(e.effectTriggerDuration)
      const isDoT = !STEAL_IDS.has(eid) && triggerTurns > 0
      items.push({
        effect: {
          element: ELEMENT_OF[el] as Exclude<AppSpellElement, 'mixed'>,
          min:     Number(e.diceNum),
          max:     Number(e.diceSide),
          kind:    STEAL_IDS.has(eid) ? 'steal' : (isDoT ? 'poison' : 'damage'),
          ...(isDoT ? { turns: triggerTurns } : {}),
        },
        mask,
      })
    }
  }

  // Best/worst-element damage (effectElement=-1, displayed as neutral)
  for (const e of rawEffects) {
    const eid  = Number(e.effectId)
    const mask = String(e.targetMask ?? '')
    if (OMNI_DMG_IDS.has(eid)) {
      const min = Number(e.diceNum)
      if (min > 0) items.push({ effect: { element: 'neutral', min, max: Number(e.diceSide), kind: 'damage' }, mask })
    }
  }

  // Detect shield condition (PB = "Protection Bouclier" in targetMask)
  // Only separate into groups when BOTH shielded and non-shielded effects exist.
  const hasShield   = items.some(r => /\bPB\b/.test(r.mask))
  const hasNoShield = items.some(r => /\bpb\b/.test(r.mask))

  if (hasShield && hasNoShield) {
    const baseItems   = items.filter(r => !/\bPB\b/.test(r.mask))
    const shieldItems = items.filter(r =>  /\bPB\b/.test(r.mask))
    return [
      ...deduplicateConditional(baseItems),
      ...deduplicateConditional(shieldItems).map(e => ({ ...e, condition: 'shield' as const })),
    ]
  }

  return deduplicateConditional(items)
}

function buildLevels(raw: Record<string, unknown>): AppSpellLevelInternal {
  const rawEffects    = ((raw.effects        as Record<string, unknown>)?.Array ?? []) as Record<string, unknown>[]
  const rawCritEffs   = ((raw.criticalEffect as Record<string, unknown>)?.Array ?? []) as Record<string, unknown>[]

  const effects     = extractDamageEffects(rawEffects)
  // criticalEffect contains the COMPLETE crit-hit damage set (not additive bonus).
  // If empty, no crit display. extractDamageEffects filters to damage-only effects.
  const critEffects = extractDamageEffects(rawCritEffs)

  // Push effects (effectId=5, normal effects only)
  for (const e of rawEffects) {
    if (Number(e.effectId) === PUSH_ID) {
      const cells = Number(e.diceNum)
      if (cells > 0 && cells <= 20) {
        effects.push({ element: 'neutral', min: cells, max: cells, kind: 'push' })
        break
      }
    }
  }

  // AP/MP effects (steal vs gain distinguished by effectId)
  const seenAPSteal = new Set<number>(), seenAPGain = new Set<number>()
  const seenMPSteal = new Set<number>(), seenMPGain = new Set<number>()
  for (const e of rawEffects) {
    const eid = Number(e.effectId)
    const amt = Number(e.diceNum)
    if (AP_STEAL_IDS.has(eid) && amt > 0 && amt <= 20 && !seenAPSteal.has(amt)) {
      effects.push({ element: 'neutral', min: amt, max: amt, kind: 'ap' })
      seenAPSteal.add(amt)
    }
    if (AP_GAIN_IDS.has(eid) && amt > 0 && amt <= 20 && !seenAPGain.has(amt)) {
      effects.push({ element: 'neutral', min: amt, max: amt, kind: 'ap_gain' })
      seenAPGain.add(amt)
    }
    if (MP_STEAL_IDS.has(eid) && amt > 0 && amt <= 20 && !seenMPSteal.has(amt)) {
      effects.push({ element: 'neutral', min: amt, max: amt, kind: 'mp' })
      seenMPSteal.add(amt)
    }
    if (MP_GAIN_IDS.has(eid) && amt > 0 && amt <= 20 && !seenMPGain.has(amt)) {
      effects.push({ element: 'neutral', min: amt, max: amt, kind: 'mp_gain' })
      seenMPGain.add(amt)
    }
  }

  // Erosion (% incurable damage)
  for (const e of rawEffects) {
    if (Number(e.effectId) === EROSION_ID) {
      const pct   = Number(e.diceNum)
      const turns = Number(e.duration)
      if (pct > 0) effects.push({ element: 'neutral', min: pct, max: 0, kind: 'erosion', turns })
    }
  }

  // Heal modifier (heals received x%)
  for (const e of rawEffects) {
    if (Number(e.effectId) === HEAL_MOD_ID) {
      const pct = Number(e.diceNum)
      if (pct > 0) effects.push({ element: 'neutral', min: pct, max: 0, kind: 'heal_mod' })
    }
  }

  // Spell stacking buff (e.g. "Flecha Castigadora: +24 base dmg - 1t(on cast 1)")
  for (const e of rawEffects) {
    if (Number(e.effectId) === SPELL_BUFF_ID) {
      const spellId    = Number(e.diceNum)
      const buffAmount = Number(e.value)
      const stack      = Number(e.delay)
      const turns      = Number(e.duration)
      const deathReset = Number(e.dispellable) === 2
      if (spellId > 0 && buffAmount > 0) {
        effects.push({ element: 'neutral', min: buffAmount, max: 0, kind: 'spell_buff', spellId, stack, turns, deathReset })
      }
    }
  }

  // Collect unhandled effects as raw buffs for per-lang label rendering
  const rawBuffs: RawBuff[] = []
  for (const e of rawEffects) {
    const eid = Number(e.effectId)
    if (SKIP_BUFF_IDS.has(eid)) continue
    const el = Number(e.effectElement)
    if (el >= 0 && el <= 4) continue  // caught by elemental damage extraction
    const min   = Number(e.diceNum)
    const max   = Number(e.diceSide)
    const turns = Number(e.duration)
    if (min === 0 && max === 0) continue  // empty — no display value
    rawBuffs.push({ effectId: eid, min, max, turns })
  }

  const level: AppSpellLevelInternal = {
    grade:      Number(raw.grade),
    ap:         Number(raw.apCost),
    minRange:   Number(raw.minRange) || 0,
    maxRange:   Number(raw.range)    || 0,
    maxPerTurn: Number(raw.maxCastPerTurn) || 0,
    critChance: Number(raw.criticalHitProbability) || 0,
    effects,
    ...(rawBuffs.length ? { _rawBuffs: rawBuffs } : {}),
  }
  if (critEffects.length > 0) level.critEffects = critEffects
  return level
}

// Decompress gzip buffer using Node's built-in zlib
async function gunzipBuffer(compressed: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const gunzip = createGunzip()
    const chunks: Buffer[] = []
    gunzip.on('data', (chunk: Buffer) => chunks.push(chunk))
    gunzip.on('end', () => resolve(Buffer.concat(chunks)))
    gunzip.on('error', reject)
    gunzip.end(compressed)
  })
}

// Extract specific files from a tar buffer
// Returns Map<basename, content>
function extractFromTar(tar: Buffer, filter: (name: string) => boolean): Map<string, Buffer> {
  const files = new Map<string, Buffer>()
  let offset = 0

  while (offset + 512 <= tar.length) {
    // Check for end-of-archive (two zero blocks)
    let allZero = true
    for (let i = offset; i < offset + 512; i++) {
      if (tar[i] !== 0) { allZero = false; break }
    }
    if (allZero) break

    // Parse header
    const nameBytes  = tar.slice(offset, offset + 100)
    const prefixBytes = tar.slice(offset + 345, offset + 500)
    const sizeStr    = tar.slice(offset + 124, offset + 136).toString('ascii').replace(/\0.*/, '').trim()
    const typeFlag   = String.fromCharCode(tar[offset + 156])

    const name   = nameBytes.toString('utf8').replace(/\0.*/, '')
    const prefix = prefixBytes.toString('utf8').replace(/\0.*/, '')
    const fullName = prefix ? `${prefix}/${name}` : name
    const size   = parseInt(sizeStr, 8) || 0

    offset += 512

    if (typeFlag !== '5' && fullName && filter(fullName)) {
      files.set(fullName, tar.slice(offset, offset + size))
    }

    offset += Math.ceil(size / 512) * 512
  }

  return files
}

async function extractSpellImages(tarGzUrl: string, neededIconIds: Set<number>, outDir: string) {
  console.log(`Downloading spell images for ${neededIconIds.size} spells...`)
  const compressed = await downloadBuffer(tarGzUrl)
  console.log('  Decompressing...')
  const tar = await gunzipBuffer(compressed)
  console.log(`  Parsing tar (${(tar.length / 1024 / 1024).toFixed(1)}MB uncompressed)...`)

  const files = extractFromTar(tar, (name) => {
    const match = name.match(/sort_(\d+)-48\.png$/)
    if (!match) return false
    return neededIconIds.has(Number(match[1]))
  })

  mkdirSync(outDir, { recursive: true })
  let written = 0
  for (const [fullPath, content] of files) {
    const basename = fullPath.split('/').pop()!
    writeFileSync(join(outDir, basename), content)
    written++
  }
  console.log(`  Extracted ${written}/${neededIconIds.size} spell images.`)
}

function renderEffectLabel(
  rb: RawBuff,
  entries: Record<string, string>,
  effectDescMap: Map<number, number>,
): string | null {
  const descId = effectDescMap.get(rb.effectId)
  if (!descId) return null
  const template = entries[String(descId)]
  if (!template) return null

  const { min, max, turns } = rb
  const isRange = max > 0 && max !== min
  let s = template
  // {{~1~2 TEXT}} — include TEXT only when isRange
  s = s.replace(/\{\{~1~2([^}]*)\}\}/g, (_, txt: string) => isRange ? txt : '')
  // Remove all other conditional/pluralization tokens
  s = s.replace(/\{\{~[^}]*\}\}/g, '')
  // Substitute values
  s = s.replace(/#1/g, String(min))
  s = s.replace(/#2/g, isRange ? String(max) : '')
  s = s.trim().replace(/\s{2,}/g, ' ')
  if (!s) return null
  if (turns > 0) s += ` (${turns}T)`
  return s
}

async function main() {
  const versionFile      = join(DATA_DIR, 'version.json')
  const spellVersionFile = join(DATA_DIR, 'spells-version.json')

  let gameVersion: string
  if (existsSync(versionFile)) {
    gameVersion = (JSON.parse(readFileSync(versionFile, 'utf-8')) as { gameVersion: string }).gameVersion
  } else {
    const meta = await fetch('https://api.dofusdu.de/dofus3/v1/meta/version').then(r => r.json()) as { version: string }
    gameVersion = meta.version
  }

  if (!FORCE && existsSync(spellVersionFile)) {
    const sv = (JSON.parse(readFileSync(spellVersionFile, 'utf-8')) as { gameVersion: string }).gameVersion
    if (sv === gameVersion) {
      console.log(`Spell data up to date (${gameVersion}). Pass --force to refresh.`)
      process.exit(0)
    }
  }

  console.log(`Generating spell data for version ${gameVersion}...`)
  const base = `https://github.com/dofusdude/dofus3-main/releases/download/${gameVersion}`

  console.log('Downloading game data (spell_levels.json is large ~88MB):')
  const [breedsRaw, spellsRaw, levelsRaw, variantsRaw, effectsRaw] = await Promise.all([
    download(`${base}/breeds.json`),
    download(`${base}/spells.json`),
    download(`${base}/spell_levels.json`),
    download(`${base}/spell_variants.json`),
    download(`${base}/effects.json`),
  ])

  const breeds      = parseRefs(breedsRaw)
  const spells      = parseRefs(spellsRaw)
  const levels      = parseRefs(levelsRaw)
  const variants    = parseRefs(variantsRaw)
  const effectsMeta = parseRefs(effectsRaw)
  console.log(`Parsed: ${breeds.size} breeds, ${spells.size} spells, ${levels.size} spell levels, ${variants.size} variant pairs`)

  // effectId → descriptionId (for buff label rendering per-lang)
  const effectDescMap = new Map<number, number>()
  for (const [, eff] of effectsMeta) {
    const descId = Number(eff.descriptionId)
    if (descId > 0) effectDescMap.set(Number(eff.id), descId)
  }

  // Build variant map: breedId -> Map<normalSpellId, variantSpellId>
  const variantsByBreed = new Map<number, Map<number, number>>()
  for (const [, v] of variants) {
    const breedId = Number(v.breedId)
    const pair    = ((v.spellIds as Record<string, unknown>)?.Array ?? []) as number[]
    if (pair.length >= 2) {
      if (!variantsByBreed.has(breedId)) variantsByBreed.set(breedId, new Map())
      variantsByBreed.get(breedId)!.set(pair[0], pair[1])
    }
  }
  console.log(`  ${variantsByBreed.size} breeds with variant spell data`)

  // Build iconId map: spellId -> iconId
  const iconIdMap = new Map<number, number>()
  for (const [spellId, spell] of spells) {
    const iconId = Number(spell.iconId)
    if (iconId > 0) iconIdMap.set(spellId, iconId)
  }

  // Pre-index: spellId -> sorted AppSpellLevelInternal[]
  const levelsBySpell = new Map<number, AppSpellLevelInternal[]>()
  for (const [, sl] of levels) {
    const spellId = Number(sl.spellId)
    if (!levelsBySpell.has(spellId)) levelsBySpell.set(spellId, [])
    levelsBySpell.get(spellId)!.push(buildLevels(sl))
  }
  for (const grds of levelsBySpell.values()) {
    grds.sort((a, b) => a.grade - b.grade)
  }

  // Resolve breed -> classSlug using English names
  const enRaw     = await download(`${base}/en.json`)
  const enEntries = (enRaw as Record<string, unknown>).entries as Record<string, string>
  const breedSlugMap = new Map<number, string>()
  for (const [breedId, breed] of breeds) {
    const name = t(enEntries, Number(breed.shortNameId as unknown))
    const slug = CLASS_SLUG[name]
    if (slug) breedSlugMap.set(breedId, slug)
    else console.warn(`  Unknown breed "${name}" (id=${breedId}) — skipping`)
  }

  // Collect all needed iconIds across all classes + common spells
  const neededIconIds = new Set<number>()
  const allClassSpells = new Map<number, { slug: string; spells: AppSpell[] }>()

  for (const [breedId, breed] of breeds) {
    const classSlug = breedSlugMap.get(breedId)
    if (!classSlug) continue

    const normalIds      = ((breed.breedSpellsId as Record<string, unknown>)?.Array ?? []) as number[]
    const breedVariants  = variantsByBreed.get(breedId) ?? new Map<number, number>()
    const classSpells: AppSpell[] = []

    for (const normalId of normalIds) {
      // Add normal spell
      const normalSpell = spells.get(normalId)
      if (normalSpell) {
        const lvls    = levelsBySpell.get(normalId) ?? []
        const grade1  = lvls.find(l => l.grade === 1) ?? lvls[0]
        const elem    = grade1 ? dominantElement(grade1.effects) : 'neutral'
        const iconId  = iconIdMap.get(normalId) ?? 0
        if (iconId > 0) neededIconIds.add(iconId)
        classSpells.push({
          id: normalId, name: '', element: elem, is_variant: false,
          image_url: iconId > 0 ? `/data/spells/img/sort_${iconId}-48.png` : null,
          levels: lvls,
        })
      }

      // Add variant spell (if exists)
      const variantId = breedVariants.get(normalId)
      if (variantId) {
        const variantSpell = spells.get(variantId)
        if (variantSpell) {
          const lvls   = levelsBySpell.get(variantId) ?? []
          const grade1 = lvls.find(l => l.grade === 1) ?? lvls[0]
          const elem   = grade1 ? dominantElement(grade1.effects) : 'neutral'
          const iconId = iconIdMap.get(variantId) ?? 0
          if (iconId > 0) neededIconIds.add(iconId)
          classSpells.push({
            id: variantId, name: '', element: elem, is_variant: true,
            image_url: iconId > 0 ? `/data/spells/img/sort_${iconId}-48.png` : null,
            levels: lvls,
          })
        }
      }
    }

    allClassSpells.set(breedId, { slug: classSlug, spells: classSpells })
  }

  // Common spells (breedId=19 in spell_variants.json — not in breeds.json)
  // Normal spell = pair[0], variant = pair[1]
  const commonSpells: AppSpell[] = []
  for (const [, v] of variants) {
    if (Number(v.breedId) !== 19) continue
    const pair = ((v.spellIds as Record<string, unknown>)?.Array ?? []) as number[]
    if (pair.length < 2) continue

    const normalId  = Number(pair[0])
    const variantId = Number(pair[1])

    for (const [spellId, isVariant] of [[normalId, false], [variantId, true]] as [number, boolean][]) {
      const spell = spells.get(spellId)
      if (!spell) continue
      const lvls   = levelsBySpell.get(spellId) ?? []
      const grade1 = lvls.find(l => l.grade === 1) ?? lvls[0]
      const elem   = grade1 ? dominantElement(grade1.effects) : 'neutral'
      const iconId = iconIdMap.get(spellId) ?? 0
      if (iconId > 0) neededIconIds.add(iconId)
      commonSpells.push({
        id: spellId, name: '', element: elem, is_variant: isVariant,
        image_url: iconId > 0 ? `/data/spells/img/sort_${iconId}-48.png` : null,
        levels: lvls,
      })
    }
  }

  // Extract spell images
  const imgDir = join(DATA_DIR, 'spells', 'img')
  await extractSpellImages(
    `${base}/spell_images_48.tar.gz`,
    neededIconIds,
    imgDir,
  )

  // Write per-language JSON (names only differ by language)
  for (const lang of LANGS) {
    const langRaw = lang === 'en' ? enRaw : await download(`${base}/${lang}.json`)
    const entries = (langRaw as Record<string, unknown>).entries as Record<string, string>

    let written = 0
    for (const [breedId, { slug: classSlug, spells: classSpells }] of allClassSpells) {
      const namedSpells: AppSpell[] = []

      for (const sp of classSpells) {
        const spell     = spells.get(sp.id)
        if (!spell) continue
        const spellName = t(entries, Number(spell.nameId))
        if (!spellName) continue
        const spellDesc = t(entries, Number(spell.descriptionId)) || undefined

        const namedLevels: AppSpellLevel[] = (sp.levels as AppSpellLevelInternal[]).map(lvl => {
          const { _rawBuffs, ...rest } = lvl
          if (!_rawBuffs?.length) return rest
          const buffs = _rawBuffs
            .map(rb => renderEffectLabel(rb, entries, effectDescMap))
            .filter((s): s is string => s !== null)
          return { ...rest, ...(buffs.length ? { buffs } : {}) }
        })

        namedSpells.push({ ...sp, name: spellName, ...(spellDesc ? { description: spellDesc } : {}), levels: namedLevels })
      }

      const dir = join(DATA_DIR, lang, 'spells')
      mkdirSync(dir, { recursive: true })
      writeFileSync(join(dir, `${classSlug}.json`), JSON.stringify({ classSlug, spells: namedSpells }), 'utf-8')
      written++
      void breedId
    }

    // Write common spells
    const namedCommon: AppSpell[] = []
    for (const sp of commonSpells) {
      const spell     = spells.get(sp.id)
      if (!spell) continue
      const spellName = t(entries, Number(spell.nameId))
      if (!spellName) continue
      const spellDesc = t(entries, Number(spell.descriptionId)) || undefined

      const namedLevels: AppSpellLevel[] = (sp.levels as AppSpellLevelInternal[]).map(lvl => {
        const { _rawBuffs, ...rest } = lvl
        if (!_rawBuffs?.length) return rest
        const buffs = _rawBuffs
          .map(rb => renderEffectLabel(rb, entries, effectDescMap))
          .filter((s): s is string => s !== null)
        return { ...rest, ...(buffs.length ? { buffs } : {}) }
      })

      namedCommon.push({ ...sp, name: spellName, ...(spellDesc ? { description: spellDesc } : {}), levels: namedLevels })
    }
    const commonDir = join(DATA_DIR, lang, 'spells')
    mkdirSync(commonDir, { recursive: true })
    writeFileSync(join(commonDir, 'common.json'), JSON.stringify({ classSlug: 'common', spells: namedCommon }), 'utf-8')

    console.log(`  [${lang}] done — ${written} classes + ${namedCommon.length} common spells written`)
  }

  writeFileSync(spellVersionFile, JSON.stringify({ gameVersion, generatedAt: new Date().toISOString() }), 'utf-8')
  console.log(`Done. Spell data ${gameVersion} written.`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
