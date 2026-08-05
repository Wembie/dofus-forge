/**
 * ETL: dofusdude/dofus3-main GitHub releases -> per-class spell JSON
 *
 * Usage: pnpm fetch-spells [--force]
 *
 * Data source: https://github.com/dofusdude/dofus3-main/releases
 * Files used:
 *   breeds.json       — breed (class) definitions + spell ID lists
 *   spells.json       — spell metadata (nameId, spellLevels IDs)
 *   spell_levels.json — per-grade stats (AP cost, range, effects)
 *   {lang}.json       — string ID -> translated text
 *
 * effectElement mapping (verified 2026-08-05 from effects.json descriptions):
 *   0=neutral, 1=earth, 2=fire, 3=water, 4=air
 *
 * Output: public/data/{lang}/spells/{classSlug}.json
 */

import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

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

// English class name -> DOFUS_CLASSES slug
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
  id:      number
  name:    string
  element: AppSpellElement
  levels:  AppSpellLevel[]
}

export type ClassSpells = {
  classSlug: string
  spells:    AppSpell[]
}

// Parse Unity-extracted JSON structure: references.RefIds[].data with id field
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
  const [breedsRaw, spellsRaw, levelsRaw] = await Promise.all([
    download(`${base}/breeds.json`),
    download(`${base}/spells.json`),
    download(`${base}/spell_levels.json`),
  ])

  const breeds = parseRefs(breedsRaw)
  const spells = parseRefs(spellsRaw)
  const levels = parseRefs(levelsRaw)
  console.log(`Parsed: ${breeds.size} breeds, ${spells.size} spells, ${levels.size} spell levels`)

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

  // Resolve breed -> classSlug once using English names (CLASS_SLUG keys are English)
  const enRaw     = await download(`${base}/en.json`)
  const enEntries = (enRaw as Record<string, unknown>).entries as Record<string, string>
  const breedSlugMap = new Map<number, string>()
  for (const [breedId, breed] of breeds) {
    const name = t(enEntries, Number(breed.shortNameId as unknown))
    const slug = CLASS_SLUG[name]
    if (slug) breedSlugMap.set(breedId, slug)
    else console.warn(`  Unknown breed "${name}" (id=${breedId}) — skipping`)
  }

  for (const lang of LANGS) {
    const langRaw = lang === 'en' ? enRaw : await download(`${base}/${lang}.json`)
    const entries = (langRaw as Record<string, unknown>).entries as Record<string, string>

    let written = 0
    for (const [breedId, breed] of breeds) {
      const classSlug = breedSlugMap.get(breedId)
      if (!classSlug) continue

      const spellIds = ((breed.breedSpellsId as Record<string, unknown>)?.Array ?? []) as number[]
      const classSpells: AppSpell[] = []

      for (const spellId of spellIds) {
        const spell     = spells.get(spellId)
        if (!spell) continue
        const spellName = t(entries, Number(spell.nameId))
        if (!spellName) continue

        const spellLevels = levelsBySpell.get(spellId) ?? []
        const grade1      = spellLevels.find(l => l.grade === 1) ?? spellLevels[0]
        const element     = grade1 ? dominantElement(grade1.effects) : 'neutral'

        classSpells.push({ id: spellId, name: spellName, element, levels: spellLevels })
      }

      const dir = join(DATA_DIR, lang, 'spells')
      mkdirSync(dir, { recursive: true })
      writeFileSync(join(dir, `${classSlug}.json`), JSON.stringify({ classSlug, spells: classSpells }), 'utf-8')
      written++
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
