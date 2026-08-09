import type { BuildInput, StatBlock, ItemEffect } from './types.ts'
import { pointCost, statBudget, SCROLL_BONUS } from './characteristics.ts'
import { STAT_MAP, IGNORED_STATS } from './statMap.ts'

// Base AP/MP in Dofus 3.
// TODO: Verify in Dofus 3. Assumption: 6 AP / 3 MP base for all classes.
const BASE_AP = 6
const BASE_MP = 3

// Base HP formula.
// TODO: Verify class-specific base HP in Dofus 3.
// Assumption: 55 base HP at L1, +5 per additional level (same as Dofus 2).
function baseHp(level: number): number {
  return 55 + (level - 1) * 5
}

function emptyStatBlock(): StatBlock {
  return {
    ap: 0, mp: 0, range: 0,
    vitality: 0, wisdom: 0, strength: 0, intelligence: 0, chance: 0, agility: 0,
    maxHp: 0,
    power: 0,
    damage: 0,
    neutralDamage: 0, earthDamage: 0, fireDamage: 0, waterDamage: 0, airDamage: 0,
    neutralSteal: 0, earthSteal: 0, fireSteal: 0, waterSteal: 0, airSteal: 0,
    bestElemSteal: 0, bestElemDamage: 0,
    neutralResFixed: 0, earthResFixed: 0, fireResFixed: 0, waterResFixed: 0, airResFixed: 0,
    neutralResPercent: 0, earthResPercent: 0, fireResPercent: 0, waterResPercent: 0, airResPercent: 0,
    critChance: 0, critDamage: 0, critResistance: 0,
    meleeDamagePercent: 0, rangedDamagePercent: 0, spellDamagePercent: 0, weaponDamagePercent: 0,
    meleeResistPercent: 0, rangedResistPercent: 0,
    trapDamage: 0, trapPower: 0, pushbackDamage: 0, pushbackResist: 0, reflectedDamage: 0,
    heals: 0, initiative: 0, lock: 0, dodge: 0, prospecting: 0, summons: 0, pods: 0,
    apReduction: 0, mpReduction: 0, apParry: 0, mpParry: 0, mpSteal: 0,
    unknownStats: {},
    pointsBudget: 0,
    pointsSpent: 0,
  }
}

function applyEffect(block: StatBlock, effect: ItemEffect): void {
  const { stat, min, max } = effect
  if (IGNORED_STATS.has(stat)) return

  const value = (max !== 0 && max > min) ? max : min
  const key = STAT_MAP[stat]
  if (key !== undefined) {
    (block as unknown as Record<string, number>)[key] += value
  } else {
    block.unknownStats[stat] = (block.unknownStats[stat] ?? 0) + value
  }
}

function applyEffects(block: StatBlock, effects: ItemEffect[]): void {
  for (const e of effects) applyEffect(block, e)
}

/** Compute the active set bonuses for the given equipped items. */
function computeSetBonuses(items: BuildInput['items'], sets: BuildInput['sets']): ItemEffect[] {
  const bonusEffects: ItemEffect[] = []

  // Count how many items from each set are equipped
  const equippedBySet = new Map<number, number>()
  for (const item of items) {
    if (item.set_id !== null) {
      equippedBySet.set(item.set_id, (equippedBySet.get(item.set_id) ?? 0) + 1)
    }
  }

  for (const [setId, count] of equippedBySet) {
    const setData = sets.find(s => s.ankama_id === setId)
    if (!setData) continue

    // Only apply the highest reached tier (tiers are not cumulative in Dofus 3)
    const tiers = Object.entries(setData.bonuses)
      .map(([k, v]) => ({ pieces: Number(k), effects: v }))
      .filter(t => t.pieces <= count)
      .sort((a, b) => b.pieces - a.pieces)

    if (tiers.length > 0) bonusEffects.push(...tiers[0].effects)
  }

  return bonusEffects
}

/**
 * Compute the full aggregated StatBlock for a build.
 *
 * Pure function — no side effects, no React imports.
 */
export function computeStats(input: BuildInput): StatBlock {
  const block = emptyStatBlock()

  // 1. Base AP/MP (+ Dofus 2: +1 AP bonus at level 100)
  block.ap = BASE_AP + (input.level >= 100 ? 1 : 0)
  block.mp = BASE_MP

  // 2. Aggregate item effects
  for (const item of input.items) {
    applyEffects(block, item.effects)
  }

  // 3. Aggregate set bonuses
  const setBonuses = computeSetBonuses(input.items, input.sets)
  applyEffects(block, setBonuses)

  // 3.5. Rune effects (magesmithy bonuses added per item slot)
  if (input.runeEffects) applyEffects(block, input.runeEffects)

  // 4. Characteristic points (allocated + scrolls)
  const { allocated, scrolled } = input
  block.vitality     += allocated.vitality     + (scrolled.vitality     ? SCROLL_BONUS : 0)
  block.wisdom       += allocated.wisdom       + (scrolled.wisdom       ? SCROLL_BONUS : 0)
  block.strength     += allocated.strength     + (scrolled.strength     ? SCROLL_BONUS : 0)
  block.intelligence += allocated.intelligence + (scrolled.intelligence ? SCROLL_BONUS : 0)
  block.chance       += allocated.chance       + (scrolled.chance       ? SCROLL_BONUS : 0)
  block.agility      += allocated.agility      + (scrolled.agility      ? SCROLL_BONUS : 0)

  // 5. Derived stats from characteristics (official Dofus 3 formulas)
  block.initiative   += block.strength + block.intelligence + block.chance + block.agility
  block.dodge        += Math.floor(block.agility / 10)
  block.lock         += Math.floor(block.agility / 10)
  block.apParry      += Math.floor(block.wisdom  / 10)
  block.mpParry      += Math.floor(block.wisdom  / 10)
  block.apReduction  += Math.floor(block.wisdom  / 10)
  block.mpReduction  += Math.floor(block.wisdom  / 10)
  block.pods         += block.strength * 5
  block.prospecting  += Math.floor(block.chance  / 10)

  // 6. Point budget accounting

  block.pointsBudget = statBudget(input.level)
  block.pointsSpent  =
    pointCost('vitality',     allocated.vitality)     +
    pointCost('wisdom',       allocated.wisdom)       +
    pointCost('strength',     allocated.strength)     +
    pointCost('intelligence', allocated.intelligence) +
    pointCost('chance',       allocated.chance)       +
    pointCost('agility',      allocated.agility)

  // 7. HP (base + all vitality sources already summed in block.vitality)
  block.maxHp = baseHp(input.level) + block.vitality

  return block
}
