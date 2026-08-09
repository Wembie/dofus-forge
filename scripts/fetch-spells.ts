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

export type AppSpellEffect = {
  element: Exclude<AppSpellElement, 'mixed'>
  min:     number
  max:     number
}

export type AppSpellLevel = {
  grade:      number
  ap:         number
  minRange:   number
  maxRange:   number   // 0 = melee
  maxPerTurn: number   // 0 = unlimited
  critChance: number   // %
  effects:    AppSpellEffect[]
}

export type AppSpell = {
  id:         number
  name:       string
  element:    AppSpellElement
  is_variant: boolean
  image_url:  string | null
  levels:     AppSpellLevel[]
}

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

function buildLevels(raw: Record<string, unknown>): AppSpellLevel {
  const rawEffects = ((raw.effects as Record<string, unknown>)?.Array ?? []) as Record<string, unknown>[]
  const effects: AppSpellEffect[] = rawEffects
    .filter(e => {
      const el = Number(e.effectElement)
      return el >= 0 && el <= 4
    })
    .map(e => ({
      element: ELEMENT_OF[Number(e.effectElement)] as Exclude<AppSpellElement, 'mixed'>,
      min:     Number(e.diceNum),
      max:     Number(e.diceSide),
    }))

  return {
    grade:      Number(raw.grade),
    ap:         Number(raw.apCost),
    minRange:   Number(raw.minRange) || 0,
    maxRange:   Number(raw.range)    || 0,
    maxPerTurn: Number(raw.maxCastPerTurn) || 0,
    critChance: Number(raw.criticalHitProbability) || 0,
    effects,
  }
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
  const [breedsRaw, spellsRaw, levelsRaw, variantsRaw] = await Promise.all([
    download(`${base}/breeds.json`),
    download(`${base}/spells.json`),
    download(`${base}/spell_levels.json`),
    download(`${base}/spell_variants.json`),
  ])

  const breeds   = parseRefs(breedsRaw)
  const spells   = parseRefs(spellsRaw)
  const levels   = parseRefs(levelsRaw)
  const variants = parseRefs(variantsRaw)
  console.log(`Parsed: ${breeds.size} breeds, ${spells.size} spells, ${levels.size} spell levels, ${variants.size} variant pairs`)

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

  // Pre-index: spellId -> sorted AppSpellLevel[]
  const levelsBySpell = new Map<number, AppSpellLevel[]>()
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

  // Collect all needed iconIds across all classes
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
        namedSpells.push({ ...sp, name: spellName })
      }

      const dir = join(DATA_DIR, lang, 'spells')
      mkdirSync(dir, { recursive: true })
      writeFileSync(join(dir, `${classSlug}.json`), JSON.stringify({ classSlug, spells: namedSpells }), 'utf-8')
      written++
      void breedId
    }

    console.log(`  [${lang}] done — ${written} classes written`)
  }

  writeFileSync(spellVersionFile, JSON.stringify({ gameVersion, generatedAt: new Date().toISOString() }), 'utf-8')
  console.log(`Done. Spell data ${gameVersion} written.`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
