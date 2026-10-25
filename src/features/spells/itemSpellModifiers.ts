import type { AppEffect } from '@/data/loaders.ts'
import type { AppSpellLevel } from '@/data/spellLoaders.ts'

export type ItemSpellModifiers = {
  ap: number
  minRange: number
  maxRange: number
  critChance: number
  maxPerTurn: number
  baseDamage: number
  modifiableRange: boolean
}

const EMPTY_MODIFIERS: ItemSpellModifiers = {
  ap: 0,
  minRange: 0,
  maxRange: 0,
  critChance: 0,
  maxPerTurn: 0,
  baseDamage: 0,
  modifiableRange: false,
}

function formattedAmount(formatted: string | undefined): number | null {
  const match = formatted?.match(/:\s*([+-]?\d+)/)
  return match ? Number(match[1]) : null
}

export function getItemSpellModifiers(effects: AppEffect[], spellId: number): ItemSpellModifiers {
  const modifiers = { ...EMPTY_MODIFIERS }

  for (const effect of effects) {
    if (effect.min !== spellId) continue

    if (effect.effect_id === 204) {
      modifiers.modifiableRange = true
      continue
    }

    const amount = formattedAmount(effect.formatted)
    if (amount == null) continue

    switch (effect.effect_id) {
      case 207: modifiers.ap += amount; break
      case 208: modifiers.maxRange += amount; break
      case 226: modifiers.critChance += amount; break
      case 243:
      case 245: modifiers.baseDamage += amount; break
      case 274: modifiers.minRange += amount; break
      case 276: modifiers.maxPerTurn += amount; break
    }
  }

  return modifiers
}

export function applyItemSpellModifiers(level: AppSpellLevel, modifiers: ItemSpellModifiers): AppSpellLevel {
  if (
    modifiers.ap === 0 &&
    modifiers.minRange === 0 &&
    modifiers.maxRange === 0 &&
    modifiers.critChance === 0 &&
    modifiers.maxPerTurn === 0 &&
    modifiers.baseDamage === 0 &&
    !modifiers.modifiableRange
  ) return level

  const addDamage = (effects: AppSpellLevel['effects']) => effects.map(effect =>
    effect.kind === 'damage' || effect.kind === 'steal'
      ? {
          ...effect,
          min: effect.min + modifiers.baseDamage,
          max: effect.max > 0 ? effect.max + modifiers.baseDamage : effect.max,
        }
      : effect
  )

  return {
    ...level,
    ap: Math.max(0, level.ap + modifiers.ap),
    minRange: Math.max(0, level.minRange + modifiers.minRange),
    maxRange: Math.max(0, level.maxRange + modifiers.maxRange),
    critChance: Math.max(0, level.critChance + modifiers.critChance),
    maxPerTurn: level.maxPerTurn > 0
      ? Math.max(0, level.maxPerTurn + modifiers.maxPerTurn)
      : level.maxPerTurn,
    rangeModifiable: level.rangeModifiable || modifiers.modifiableRange,
    effects: addDamage(level.effects),
    ...(level.critEffects ? { critEffects: addDamage(level.critEffects) } : {}),
  }
}
