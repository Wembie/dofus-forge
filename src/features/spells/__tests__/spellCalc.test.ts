import { describe, it, expect } from 'vitest'
import type { AppSpellEffect } from '@/data/spellLoaders.ts'
import { dedupEffects, hasDescargaPattern, hasTieredOutcomes, conditionKey, sameCondition } from '../spellCalc.ts'

// Exact grade-1 raw `effects` arrays as shipped in public/data/en/spells/*.json
// (2026-11-13) for the spells named in docs/SPELL_EFFECTS_AUDIT.md — pinned here so a
// future `pnpm fetch-spells` refresh or a logic change can't silently regress them.
const e = (kind: AppSpellEffect['kind'], min: number, max = 0, element: AppSpellEffect['element'] = 'fire'): AppSpellEffect =>
  ({ element, min, max, kind })

describe('dedupEffects + hasTieredOutcomes — Topkaj (Ecaflip, id 12846)', () => {
  // "Inflicts Fire damage on enemies or heals allies. Draws a Jack of Hearts." — one of
  // 7/10/13 Fire damage per cast, never all three (Finding 1).
  const raw = [e('damage', 7), e('damage', 7), e('damage', 10), e('damage', 10), e('damage', 13), e('damage', 13)]

  it('collapses the exact-duplicate pairs to 3 distinct values', () => {
    expect(dedupEffects(raw)).toEqual([e('damage', 7), e('damage', 10), e('damage', 13)])
  })

  it('flags the 3 survivors as tiered (mutually exclusive draws, not simultaneous hits)', () => {
    expect(hasTieredOutcomes(dedupEffects(raw))).toBe(true)
  })
})

describe('dedupEffects + hasTieredOutcomes — Tyrannical Arrow (Cra, id 32448)', () => {
  // Instant hit + a separately-arriving poison tick must never share one Σ (Finding 2).
  const raw = [e('damage', 28, 32), { ...e('poison', 20, 22), turns: 2 }, e('damage', 28, 32)]

  it('collapses the duplicate instant-hit entry, keeps the poison tick', () => {
    expect(dedupEffects(raw)).toEqual([e('damage', 28, 32), { ...e('poison', 20, 22), turns: 2 }])
  })

  it('the surviving damage effect alone is not "tiered" (only one value)', () => {
    const survivors = dedupEffects(raw).filter(x => x.kind !== 'poison')
    expect(hasTieredOutcomes(survivors)).toBe(false)
    expect(survivors).toHaveLength(1) // too few for a Σ row regardless
  })
})

describe('hasDescargaPattern + hasTieredOutcomes — Devouring Arrow (Cra, id 32446)', () => {
  // 3 steal tiers (charge) + 3 damage tiers (discharge payout, mutually exclusive) — Finding 3.
  const raw = [
    e('steal', 9, 11), e('steal', 9, 11), e('steal', 19, 22), e('steal', 27, 31), e('steal', 27, 31),
    e('damage', 27, 31), e('damage', 27, 31), e('damage', 42, 46), e('damage', 42, 46),
    e('damage', 56, 60), e('damage', 56, 60), e('damage', 56, 60),
  ]
  const survivors = dedupEffects(raw)

  it('dedups to 3 steal tiers + 3 damage tiers', () => {
    expect(survivors).toEqual([
      e('steal', 9, 11), e('steal', 19, 22), e('steal', 27, 31),
      e('damage', 27, 31), e('damage', 42, 46), e('damage', 56, 60),
    ])
  })

  it('is detected as a charge/discharge spell (steal before damage, multiple tiers)', () => {
    expect(hasDescargaPattern(survivors)).toBe(true)
  })

  it('the 3 discharge-phase damage tiers are flagged as mutually exclusive, not summed', () => {
    const dischargePhase = survivors.filter(x => x.kind === 'damage')
    expect(hasTieredOutcomes(dischargePhase)).toBe(true)
  })
})

describe('hasDescargaPattern — Crobak Call (Osamodas, id 31110)', () => {
  // "Steals HP from enemies or heals allies... also increases MP" — one steal tier + one
  // damage tier, same value, no recast/charge language at all (Finding 4's false positive).
  const survivors = [e('steal', 8, 10, 'air'), e('damage', 8, 10, 'air')]

  it('is NOT a charge/discharge spell (only one tier per kind)', () => {
    expect(hasDescargaPattern(survivors)).toBe(false)
  })

  it('is not tiered either (same value on both kinds) — sums normally', () => {
    expect(hasTieredOutcomes(survivors)).toBe(false)
  })
})

describe('dedupEffects — spell_buff is exempt even on an exact key collision', () => {
  it('keeps both stack tiers of Atonement Arrow (Cra, id 32438)', () => {
    const buffs: AppSpellEffect[] = [
      { element: 'neutral', min: 29, max: 0, kind: 'spell_buff', spellId: 32438, stack: 2 },
      { element: 'neutral', min: 29, max: 0, kind: 'spell_buff', spellId: 32438, stack: 4 },
    ]
    expect(dedupEffects(buffs)).toHaveLength(2)
  })
})

describe('conditionKey + sameCondition', () => {
  it('distinguishes every condition kind, and each by its own parameter', () => {
    expect(conditionKey(undefined)).toBe('')
    expect(conditionKey({ kind: 'shield' })).toBe('shield')
    expect(conditionKey({ kind: 'low_target_hp', threshold: 50 })).not.toBe(conditionKey({ kind: 'low_target_hp', threshold: 30 }))
    expect(conditionKey({ kind: 'state', id: 441, label: 'Tactic A' })).not.toBe(conditionKey({ kind: 'state', id: 442, label: 'Tactic B' }))
  })

  it('two states with the same id but different labels (different language) are the same condition', () => {
    expect(sameCondition({ kind: 'state', id: 99, label: 'Psychopathic' }, { kind: 'state', id: 99, label: 'Sáikopat' })).toBe(true)
  })

  it('a conditioned effect never groups with the unconditioned base case', () => {
    expect(sameCondition(undefined, { kind: 'shield' })).toBe(false)
  })
})

describe('dedupEffects + hasTieredOutcomes — Lethal Attack (Sram, id 12917)', () => {
  // "Inflicts Earth damage. The damage is greater on targets with less than 50% of their HP."
  // Real shipped data (public/data/en/spells/sram.json, grade 1) as of 2026-11-13: the two
  // values never collapse into each other (different values) and must never share one Σ —
  // the stronger hit only lands when the target is already below 50% HP.
  const raw: AppSpellEffect[] = [
    { element: 'earth', min: 43, max: 48, kind: 'damage' },
    { element: 'earth', min: 54, max: 60, kind: 'damage', condition: { kind: 'low_target_hp', threshold: 50 } },
  ]

  it('both effects survive dedup (different values, different condition)', () => {
    expect(dedupEffects(raw)).toEqual(raw)
  })

  it('each condition group holds exactly one effect, never both at once', () => {
    const base      = raw.filter(e => sameCondition(e.condition, undefined))
    const lowHpOnly = raw.filter(e => sameCondition(e.condition, { kind: 'low_target_hp', threshold: 50 }))
    expect(base).toHaveLength(1)
    expect(lowHpOnly).toHaveLength(1)
    // Within either single-effect group there's nothing to sum — hasTieredOutcomes only
    // matters once a group has 2+ effects of the same kind, which neither does here.
    expect(hasTieredOutcomes(base)).toBe(false)
    expect(hasTieredOutcomes(lowHpOnly)).toBe(false)
  })
})
