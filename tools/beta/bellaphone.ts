import type { AppSpell, AppSpellEffect, AppSpellLevel } from '../../scripts/fetch-spells.ts'
import type { PassiveBonus } from '../../src/engine/passives.ts'

export const LINEAGES = ['ebony', 'ivory', 'crimson', 'ochre', 'turquoise', 'emerald'] as const
export const ULTIMATES = [33233, 33227, 33220, 33208, 33214, 33202] as const
export type Lineage = typeof LINEAGES[number]
export type Scenario = {
  lineage: Lineage | 'none'; radius: number; enemies: number; inside: boolean
  timing: 'instant' | 'end_turn'; element: AppSpellEffect['element']; evolution: number
  aura: boolean; states: number[]
}
export const DEFAULT_SCENARIO: Scenario = { lineage: 'none', radius: 2, enemies: 1, inside: true, timing: 'instant', element: 'air', evolution: 1, aura: false, states: [] }
export type BetaEffect = { action: number; element: number; min: number; max: number; value: number; mask: string; trigger: string; turns: number; delay: number }
export type BetaLevel = { grade: number; effects: BetaEffect[]; critEffects: BetaEffect[]; handledBuffs: string[] }
export type BellaphoneRules = {
  gameVersion: string; schema: 1; ultimates: AppSpell[]
  levels: Record<string, BetaLevel[]>
  auras: { lineage: Lineage; name: string; description: string; bonus: PassiveBonus; effects: string[] }[]
  states: { id: number; name: string }[]
}

function compare(actual: number, op: string, expected: number) {
  return op === '=' ? actual === expected : op === '>' ? actual > expected : actual < expected
}

export function matchesScenario(effect: BetaEffect, scenario: Scenario): boolean {
  for (const [, id, op, amount] of effect.mask.matchAll(/\*Ct(\d+)([=<>])(\d+)/g)) {
    const actual = Number(id) === 33276 ? scenario.radius : Number(id) === 33278 ? scenario.enemies : undefined
    if (actual == null || !compare(actual, op, Number(amount))) return false
  }
  for (const [, letter, id] of effect.mask.matchAll(/\*([eE])(\d+)/g)) {
    if (scenario.states.includes(Number(id)) !== (letter === 'E')) return false
  }
  if (/ICH\{/.test(effect.mask) && !scenario.inside) return false
  if (/HCH\{/.test(effect.mask) && scenario.inside) return false
  if (effect.delay > 0) return false
  const endTurn = effect.trigger.split('|').includes('TE')
  return scenario.timing === 'end_turn' ? endTurn : !endTurn && effect.trigger === 'I'
}

const ELEMENTS = ['neutral', 'earth', 'fire', 'water', 'air'] as const
export function attackEffect(effect: BetaEffect, scenario: Scenario): AppSpellEffect | null {
  const { action, min, max } = effect
  const fixedDamage = action >= 96 && action <= 100
  const fixedSteal = action >= 91 && action <= 95
  if (!fixedDamage && !fixedSteal && action !== 2822 && action !== 2828) return null
  if (!matchesScenario(effect, scenario)) return null
  const element = action === 2822 || action === 2828 ? scenario.element : ELEMENTS[effect.element]
  if (!element) return null
  return { element, min, max, kind: fixedSteal || action === 2828 ? 'steal' : 'damage' }
}

function projectLevel(level: AppSpellLevel, raw: BetaLevel | undefined, scenario: Scenario, ultimate: number | null): AppSpellLevel {
  if (!raw) return level
  const keep = (e: AppSpellEffect) => !['damage', 'steal', 'poison'].includes(e.kind)
  // Ivory's 25 damage and the additional Crimson/Ebony damage belong to
  // reactive effects. The one-cast preview only includes the initial attack.
  const attacks = (effects: BetaEffect[]) => (ultimate === 33227 ? [] : ultimate ? effects.filter(e => e.action === 2822).slice(0, 1) : effects).flatMap(e => { const attack = attackEffect(e, scenario); return attack ? [attack] : [] })
  return {
    ...level,
    effects: [...level.effects.filter(keep), ...attacks(raw.effects)],
    critEffects: [...(level.critEffects ?? []).filter(keep), ...attacks(raw.critEffects)],
    buffs: level.buffs?.filter(text => !raw.handledBuffs.includes(text)),
  }
}

export function projectBellaphone(spells: AppSpell[], rules: BellaphoneRules, scenario: Scenario): AppSpell[] {
  const project = (spell: AppSpell) => ({ ...spell, levels: spell.levels.map(l => projectLevel(l, rules.levels[spell.id]?.find(raw => raw.grade === l.grade), scenario, ULTIMATES.includes(spell.id as typeof ULTIMATES[number]) ? spell.id : null)) })
  const result = spells.map(project)
  const id = ULTIMATES[LINEAGES.indexOf(scenario.lineage as Lineage)]
  const ultimate = rules.ultimates.find(s => s.id === id)
  if (ultimate) {
    const projected = project(ultimate)
    const level = projected.levels.find(l => l.grade === scenario.evolution)
    if (level) result.push({ ...projected, levels: [{ ...level, grade: 1 }] })
  }
  return result
}

export function scenarioBonus(rules: BellaphoneRules, scenario: Scenario): PassiveBonus {
  return scenario.aura ? rules.auras.find(a => a.lineage === scenario.lineage)?.bonus ?? {} : {}
}
