import { ITEM_PASSIVES, controlBonus, controlRoom, sanitizePassiveState, type PassiveBonus, type PassiveStat, type PassiveState } from '@/engine/passives.ts'

// Combat passives in La Forjadora. The page resolves every passive item's
// bonus for the chosen assumption once per forge and sends it as plain
// effects; the engine adds them to the item's own stats when it starts, so
// counting passives costs nothing per evaluated build.

export type ForgePassiveMode = 'off' | 'max' | 'planner'
export const PASSIVE_MODES: ForgePassiveMode[] = ['off', 'max', 'planner']

export type PassiveEffects = { id: number; effects: { stat: string; min: number; max: number }[] }

// Passive stats an order can ask for, as the item effect names the engine
// reads. Final damage and target vulnerability are damage multipliers, not
// order stats, so they never change which build wins.
const EFFECT_NAME: Partial<Record<PassiveStat, string>> = {
  ap: 'AP', mp: 'MP', power: 'Power', damage: 'Damage', critChance: '% Critical',
  pushbackDamage: 'Pushback Damage', dodge: 'Dodge', lock: 'Lock',
  apReduction: 'AP Reduction', mpReduction: 'MP Reduction', apParry: 'AP Parry', mpParry: 'MP Parry',
  meleeDamagePercent: '% Melee Damage', rangedDamagePercent: '% Ranged Damage', spellDamagePercent: '% Spell Damage',
  strength: 'Strength', intelligence: 'Intelligence', chance: 'Chance', agility: 'Agility',
  neutralResPercent: '% Neutral Resistance', earthResPercent: '% Earth Resistance', fireResPercent: '% Fire Resistance',
  waterResPercent: '% Water Resistance', airResPercent: '% Air Resistance',
}

let maxState: PassiveState | null = null

/**
 * Every passive at its best case: full stacks, first case (or turn 1).
 * Shared stacks ("5 times, shared between elements") are handed out one at
 * a time, so they spread over every element instead of piling on the first.
 */
export function maxPassiveState(): PassiveState {
  if (maxState) return maxState
  const state: PassiveState = {}
  for (const controls of ITEM_PASSIVES.values()) {
    for (const c of controls) if (c.kind === 'choice') state[c.id] = 1
    const stacks = controls.filter(c => c.kind === 'stacks')
    for (let added = true; added;) {
      added = false
      for (const c of stacks) {
        const now = state[c.id] ?? 0
        if (controlRoom(c, state) > now) { state[c.id] = now + 1; added = true }
      }
    }
  }
  maxState = state
  return state
}

/** The passive settings La Forjadora counts for a mode. */
export function forgePassiveState(mode: ForgePassiveMode, planner: PassiveState): PassiveState {
  if (mode === 'max') return maxPassiveState()
  if (mode === 'planner') return sanitizePassiveState(planner)
  return {}
}

/** Each passive item's total bonus under `state`, as engine effects (items adding nothing are left out). */
export function forgePassiveEffects(state: PassiveState): PassiveEffects[] {
  const out: PassiveEffects[] = []
  for (const [id, controls] of ITEM_PASSIVES) {
    const total: PassiveBonus = {}
    for (const c of controls) {
      for (const [k, v] of Object.entries(controlBonus(c, state[c.id] ?? 0)) as [PassiveStat, number][]) total[k] = (total[k] ?? 0) + v
    }
    const effects = (Object.entries(total) as [PassiveStat, number][])
      .filter(([k, v]) => v !== 0 && EFFECT_NAME[k])
      .map(([k, v]) => ({ stat: EFFECT_NAME[k]!, min: v, max: v }))
    if (effects.length) out.push({ id, effects })
  }
  return out
}

/** The settings of the given items' passives, to carry into the planner with a loaded build. */
export function passiveStateFor(state: PassiveState, itemIds: Iterable<number>): PassiveState {
  const ids = new Set([...itemIds].map(String))
  return Object.fromEntries(Object.entries(state).filter(([control]) => ids.has(control.split('.')[0])))
}
