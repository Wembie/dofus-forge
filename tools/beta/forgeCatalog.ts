import type { AppEffect, AppItem, AppSet } from '../../src/data/loaders.ts'
import type { OptimizerBuildBase, BuildResult, RuneChoice } from '../../src/features/optimizer/types.ts'
import type { toWireConfig } from '../../src/features/optimizer/forgeConfig.ts'
import { ALL_SLOTS, type SlotId } from '../../src/store/buildStore.ts'
import { TRANSCENDENCE, bestRank } from '../../src/features/equipment/transcendence.ts'
import { RUNE_WEIGHT } from '../../src/features/equipment/runeRules.ts'
import { itemStatEffects } from '../../src/engine/stats.ts'
import { STAT_MAP } from '../../src/engine/statMap.ts'
import { ELEMENTS, transformDracorune, type Dracorune, type DracoruneMap } from './dracorunes.ts'
import { effectCaps } from './stats.ts'

type WireConfig = ReturnType<typeof toWireConfig>
type ForgeRune = { stat: string; value: number }
export type DracoruneKind = 'air' | 'earth' | 'fire' | 'water' | 'ivory' | 'ebony'
export type BetaBuildResult = BuildResult & { dracorunes?: DracoruneMap }
type Variant = { itemId: number; rune: Dracorune; fixedRune?: RuneChoice; transcendence: Map<string, ForgeRune>; pro: Map<string, ForgeRune> }
export type VariantItem = AppItem & { identity_id?: number; forge_runes?: ForgeRune[]; forge_pro_runes?: ForgeRune[]; forge_locked?: boolean; stat_caps?: number[] }
const best = (e: AppEffect) => e.max !== 0 && e.max > e.min ? e.max : e.min
const keyOf = (r: ForgeRune) => `${r.stat}:${r.value}`

export function dracoruneOptions(kinds: readonly DracoruneKind[]): Dracorune[] {
  const options: Dracorune[] = []
  for (const to of ELEMENTS) if (kinds.includes(to)) for (const from of ELEMENTS) if (from !== to) options.push({ kind: 'element', from, to })
  if (kinds.includes('ivory')) for (const from of [...ELEMENTS, 'neutral'] as const) for (const to of [...ELEMENTS, 'neutral'] as const) if (from !== to) options.push({ kind: 'ivory', from, to })
  if (kinds.includes('ebony')) options.push({ kind: 'ebony' })
  return options
}

function difference(item: AppItem, before: AppEffect[], after: AppEffect[]): ForgeRune[] {
  const sum = (rows: AppEffect[]) => {
    const values = new Map<string, number>()
    for (const e of itemStatEffects({ ...item, effects: rows })) values.set(e.stat, (values.get(e.stat) ?? 0) + best(e))
    return values
  }
  const a = sum(before), b = sum(after)
  return [...new Set([...a.keys(), ...b.keys()])].flatMap(stat => {
    const value = (b.get(stat) ?? 0) - (a.get(stat) ?? 0)
    return value ? [{ stat, value }] : []
  })
}

export function prepareBetaCatalog(config: WireConfig, items: AppItem[], sets: AppSet[], base: OptimizerBuildBase, applied: DracoruneMap, kinds: readonly DracoruneKind[]) {
  const catalog: VariantItem[] = [...items]
  const variants = new Map<number, Variant>()
  const byId = new Map(items.map(it => [it.ankama_id, it]))
  let nextId = Math.max(0, ...items.map(it => it.ankama_id)) + 1
  const options = dracoruneOptions(kinds)
  const targets = new Set<string>(config.stats.map(s => s.stat))
  const relevant = (stat: string) => {
    const key = STAT_MAP[stat]
    return targets.has(key) || (key === 'power' && ['strength', 'intelligence', 'chance', 'agility'].some(k => targets.has(k))) || (key === 'damage' && ['earthDamage', 'fireDamage', 'waterDamage', 'airDamage', 'neutralDamage'].some(k => targets.has(k))) || (key === 'vitality' && targets.has('maxHp')) || (['strength', 'intelligence', 'chance', 'agility'].includes(key) && targets.has('initiative')) || (key === 'agility' && (targets.has('lock') || targets.has('dodge'))) || (key === 'wisdom' && ['apReduction', 'mpReduction', 'apParry', 'mpParry'].some(k => targets.has(k)))
  }
  const add = (item: AppItem, rune: Dracorune, effects: AppEffect[], extra: Partial<VariantItem>, metadata: Partial<Variant> = {}) => {
    const id = nextId++
    catalog.push({ ...item, ankama_id: id, identity_id: item.ankama_id, effects, ...extra })
    variants.set(id, { itemId: item.ankama_id, rune, transcendence: new Map(), pro: new Map(), ...metadata })
    return id
  }
  for (const item of items) {
    if (item.level > config.maxLevel || config.bannedItems.includes(item.ankama_id)) continue
    const runes = config.transcendence ? TRANSCENDENCE.flatMap(row => { const rank = bestRank(item, row.stat); return rank ? [{ stat: row.stat, value: rank.value }] : [] }) : []
    for (const rune of options) {
      const effects = transformDracorune(item, {}, rune)
      if (!effects) continue
      const trans = new Map<string, ForgeRune>(), pro = new Map<string, ForgeRune>()
      const forgeRunes: ForgeRune[] = [], forgePro: ForgeRune[] = []
      for (const source of runes) {
        const after = transformDracorune(item, { [`exo:${source.stat}`]: source.value }, rune)
        if (!after) continue
        const delta = difference(item, effects, after)
        if (!delta.some(e => relevant(e.stat))) continue
        if (delta.length === 1 && delta[0].value > 0) {
          forgeRunes.push(delta[0]); trans.set(keyOf(delta[0]), source)
        } else {
          add(item, rune, after, { forge_locked: true, forge_runes: [], forge_pro_runes: [] }, { fixedRune: source })
        }
      }
      if (config.proExoMax > 0) {
        for (const stat of config.proExoLines) {
          const name = Object.keys(RUNE_WEIGHT).find(name => STAT_MAP[name] === stat)
          if (!name) continue
          const max = Math.min(Math.floor(config.proExoWeight / RUNE_WEIGHT[name]), config.proExoCaps[stat] ?? Infinity)
          const native = itemStatEffects(item).filter(e => STAT_MAP[e.stat] === stat).reduce((sum, e) => sum + best(e), 0)
          for (let value = 1; value <= max; value++) {
            if ((native + value) * RUNE_WEIGHT[name] > 101) continue
            const after = transformDracorune(item, { [name]: value }, rune)
            if (!after) continue
            const delta = difference(item, effects, after)
            if (delta.length === 1 && delta[0].value > 0 && relevant(delta[0].stat)) {
              forgePro.push(delta[0]); pro.set(keyOf(delta[0]), { stat: name, value })
            }
          }
        }
      }
      add(item, rune, effects, { forge_runes: forgeRunes, forge_pro_runes: forgePro }, { transcendence: trans, pro })
    }
  }
  const nextBase = { ...base, equipped: { ...base.equipped }, runes: { ...base.runes } }
  for (const slot of config.lockedSlots as SlotId[]) {
    const selection = applied[slot], item = byId.get(base.equipped[slot] ?? -1)
    if (!selection || !item || selection.itemId !== item.ankama_id) continue
    const effects = transformDracorune(item, base.runes[slot] ?? {}, selection.rune)
    if (!effects) throw new Error(`Invalid locked Dracorune: ${slot}`)
    nextBase.equipped[slot] = add(item, selection.rune, effects, { forge_locked: true, forge_runes: [], forge_pro_runes: [] })
    nextBase.runes[slot] = {}
  }
  return { config: { ...config, prune: false }, items: catalog.map(item => { const c = effectCaps(item.effects); return { ...item, stat_caps: [c.ap, c.mp, c.range, c.summons] } }), sets, base: nextBase, variants }
}

export function normalizeBetaResult(result: BuildResult, variants: Map<number, Variant>): BetaBuildResult {
  const equipped = { ...result.equipped }, runes = { ...result.runes }, dracorunes: DracoruneMap = {}
  for (const slot of ALL_SLOTS) {
    const variant = variants.get(equipped[slot] ?? -1)
    if (!variant) continue
    equipped[slot] = variant.itemId
    dracorunes[slot] = { itemId: variant.itemId, rune: variant.rune }
    const chosen = runes[slot]
    if (chosen) {
      const source = (chosen.exotic ? variant.pro : variant.transcendence).get(keyOf(chosen))
      if (!source) throw new Error(`No source smithmagic for ${slot}: ${keyOf(chosen)}`)
      runes[slot] = { ...source, ...(chosen.exotic ? { exotic: true } : {}) }
    } else if (variant.fixedRune) runes[slot] = variant.fixedRune
  }
  return { ...result, equipped, runes, dracorunes }
}
