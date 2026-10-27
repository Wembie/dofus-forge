/**
 * ETL: item passives (Dofus, Prysmaradites, legendaries) → stat effects.
 *
 * Usage: pnpm fetch-passives [--force]
 *
 * An item's passive is a hidden spell: its "-special spell-" effect on
 * api.dofusdu.de reads `{{spell,ID,GRADE::Name}}` (one request lists every
 * item with its effects). That spell's levels (in
 * the game data release, same source as fetch-spells) hold the real
 * effects: characteristic, value, duration, max stacks, and casts of other
 * spells. This walks each passive spell, keeps the effects that change one
 * of the bearer's stats, and writes them to src/data/passives.generated.ts.
 * When Ankama rebalances a passive, the hourly update-data workflow
 * regenerates the file — no code change needed.
 *
 * Output: src/data/passives.generated.ts
 */

import { writeFileSync, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { checkedVersion } from './lib/safety.ts'

const ROOT    = process.cwd()
const OUT     = join(ROOT, 'src', 'data', 'passives.generated.ts')
const FORCE   = process.argv.includes('--force')
// Both the game version and the item list come from the API, never from
// files on disk, so no file content ends up in a request URL.
const META_URL  = 'https://api.dofusdu.de/dofus3/v1/meta/version'
const ITEMS_URL = 'https://api.dofusdu.de/dofus3/v1/en/items/equipment/all'

/** Game characteristic id → stat key used by src/engine/passives.ts. */
const CHARACTERISTIC: Record<number, string> = {
  1: 'ap', 23: 'mp', 25: 'power', 16: 'damage', 18: 'critChance', 84: 'pushbackDamage',
  78: 'dodge', 79: 'lock', 82: 'apReduction', 83: 'mpReduction', 27: 'apParry', 28: 'mpParry',
  125: 'meleeDamagePercent', 120: 'rangedDamagePercent', 123: 'spellDamagePercent', 107: 'finalDamagePercent',
  10: 'strength', 15: 'intelligence', 13: 'chance', 14: 'agility',
  101: 'resPercentAll', 37: 'neutralResPercent', 33: 'earthResPercent', 34: 'fireResPercent', 35: 'waterResPercent', 36: 'airResPercent',
}

/** Effects whose `diceNum` is another spell to cast (the passive's real effects live there). */
const CAST_ACTIONS = new Set([792, 1017, 1018, 1160, 2017, 2160, 2793])
/** "x#1% damage sustained": on enemies, our hits deal that much more (a separate multiplier in game). */
const DAMAGE_SUSTAINED = 1163

type Ref = Record<string, unknown>

export type GeneratedEffect = {
  stat:     string
  value:    number
  /** Game stack cap; null when the game sets none. */
  maxStack: number | null
  duration: number
  spell:    number
  grade:    number
  /** Applies to the bearer's targets (a "damage sustained" increase), not to the bearer. */
  onTargets?: true
}

export { checkedVersion }

type ApiItem = { ankama_id?: unknown; effects?: { formatted?: unknown; type?: { is_meta?: unknown } }[] }

/** Item id → passive spell id, from the items' "-special spell-" meta effect. */
export function passiveSpellRefs(items: ApiItem[]): { id: number; spell: number }[] {
  const out: { id: number; spell: number }[] = []
  for (const item of items) {
    const id = item.ankama_id
    if (typeof id !== 'number' || !Number.isSafeInteger(id) || id <= 0) continue
    for (const e of item.effects ?? []) {
      const m = e.type?.is_meta === true && typeof e.formatted === 'string' ? /\{\{spell,(\d+),(\d+)/.exec(e.formatted) : null
      if (m) { out.push({ id, spell: Number(m[1]) }); break }
    }
  }
  return out
}

function parseRefs(raw: unknown): Map<number, Ref> {
  const out = new Map<number, Ref>()
  const refs = ((raw as Ref)?.references as Ref)?.RefIds as unknown[]
  for (const ref of refs ?? []) {
    const data = (ref as Ref)?.data as Ref | undefined
    if (data?.id != null) out.set(Number(data.id), data)
  }
  return out
}

async function getJson(url: string, tries = 3): Promise<unknown> {
  for (let i = 1; ; i++) {
    try {
      const res = await fetch(url)
      if (!res.ok) throw new Error(`${res.status}`)
      return await res.json()
    } catch (err) {
      if (i >= tries) throw new Error(`Failed: ${url} → ${String(err)}`)
      await new Promise(r => setTimeout(r, 1000 * i))
    }
  }
}

/** Target mask reaches the bearer: C (caster) or a (all allies, caster included). */
const reachesBearer = (mask: string) => mask.split(',').some(m => m === 'C' || m === 'a')
/** Target mask reaches enemies: A (all enemies). */
const reachesEnemies = (mask: string) => mask.split(',').some(m => m === 'A')

export function extractEffects(
  spellId: number,
  spells: Map<number, Ref>, levels: Map<number, Ref>, effects: Map<number, Ref>, texts: Record<string, string>,
): GeneratedEffect[] {
  const out: GeneratedEffect[] = []
  const seenSpells = new Set<number>()
  const seenEffects = new Set<string>()
  const walk = (sid: number) => {
    if (seenSpells.has(sid) || !spells.has(sid)) return
    seenSpells.add(sid)
    const levelIds = ((spells.get(sid)!.spellLevels as Ref)?.Array ?? []) as number[]
    const casts: number[] = []
    for (const lid of levelIds) {
      const lv = levels.get(lid)
      if (!lv) continue
      const grade = Number(lv.grade)
      const rawMax = Number(lv.maxStack)
      const maxStack = rawMax > 0 ? rawMax : null
      for (const e of ((lv.effects as Ref)?.Array ?? []) as Ref[]) {
        const action = Number(e.actionId)
        const mask = String(e.targetMask ?? '')
        const dice = Number(e.diceNum)
        if (CAST_ACTIONS.has(action)) { if (dice !== sid) casts.push(dice); continue }
        const meta = effects.get(action)
        if (!meta) continue
        let stat: string | undefined
        let value: number
        let onTargets: true | undefined
        if (action === DAMAGE_SUSTAINED) {
          if (!reachesEnemies(mask) || dice <= 100) continue
          stat = 'targetVulnerabilityPercent'
          value = dice - 100
          onTargets = true
        } else {
          stat = CHARACTERISTIC[Number(meta.characteristic)]
          if (!stat || !reachesBearer(mask)) continue
          const desc = texts[String(meta.descriptionId)] ?? ''
          const magnitude = dice || Number(e.diceSide) || 0
          if (!magnitude) continue
          value = /^\s*-/.test(desc) ? -magnitude : magnitude
        }
        const effect: GeneratedEffect = { stat, value, maxStack, duration: Number(e.duration), spell: sid, grade, ...(onTargets ? { onTargets } : {}) }
        // The same buff repeated on several grades (one per trigger) is one effect.
        const key = `${stat}|${value}|${maxStack}|${effect.duration}|${onTargets ?? ''}`
        if (seenEffects.has(key)) continue
        seenEffects.add(key)
        out.push(effect)
      }
    }
    for (const c of casts) walk(c)
  }
  walk(spellId)
  return out
}

async function main() {
  const version = checkedVersion((await getJson(META_URL) as { version?: unknown }).version)
  if (!FORCE && existsSync(OUT) && readFileSync(OUT, 'utf8').includes(`gameVersion: '${version}'`)) {
    console.log(`Passives up to date (${version}). Pass --force to refresh.`)
    return
  }
  const base = `https://github.com/dofusdude/dofus3-main/releases/download/${encodeURIComponent(version)}`
  console.log(`Generating passives for ${version}…`)
  const [spellsRaw, levelsRaw, effectsRaw, textsRaw, itemsRaw] = await Promise.all([
    ...['spells.json', 'spell_levels.json', 'effects.json', 'en.json'].map(f => getJson(`${base}/${f}`)),
    getJson(ITEMS_URL),
  ])
  const spells = parseRefs(spellsRaw), levels = parseRefs(levelsRaw), effects = parseRefs(effectsRaw)
  const texts = (textsRaw as { entries: Record<string, string> }).entries
  const refs = passiveSpellRefs((itemsRaw as { items?: ApiItem[] }).items ?? [])

  const result: Record<number, { spell: number; effects: GeneratedEffect[] }> = {}
  for (const ref of refs) {
    result[ref.id] = { spell: ref.spell, effects: extractEffects(ref.spell, spells, levels, effects, texts) }
  }
  const ids = Object.keys(result).map(Number).sort((a, b) => a - b)
  const body = ids.map(id => `  ${id}: ${JSON.stringify(result[id])},`).join('\n')
  writeFileSync(OUT, `// Generated by scripts/fetch-passives.ts from the game data — do not edit.\n` +
    `// Item passive spells and the stat effects they give the bearer.\n` +
    `export const PASSIVE_DATA_VERSION = { gameVersion: '${version}' } as const\n\n` +
    `export type GeneratedEffect = { stat: string; value: number; maxStack: number | null; duration: number; spell: number; grade: number; onTargets?: true }\n\n` +
    `export const PASSIVE_DATA: Record<number, { spell: number; effects: GeneratedEffect[] }> = {\n${body}\n}\n`)
  const withStats = ids.filter(id => result[id].effects.length > 0).length
  console.log(`Wrote ${ids.length} passives (${withStats} with stat effects) → ${OUT}`)
}

if (process.argv[1]?.endsWith('fetch-passives.ts')) {
  main().catch(err => { console.error(err); process.exit(1) })
}
