import { describe, it, expect } from 'vitest'
import { extractEffects } from '../fetch-passives.ts'

type Ref = Record<string, unknown>
const map = (rows: Ref[]) => new Map(rows.map(r => [Number(r.id), r]))
const arr = <T>(a: T[]) => ({ Array: a })

// Game data in miniature: a passive spell 100 that casts spell 200 (grade 2)
// on a critical hit, plus enemy-only and duplicate effects.
const spells = map([
  { id: 100, spellLevels: arr([1001]) },
  { id: 200, spellLevels: arr([2001, 2002]) },
])
const levels = map([
  { id: 1001, grade: 1, maxStack: -1, effects: arr([
    { actionId: 792, diceNum: 200, diceSide: 2, targetMask: 'C', duration: 0 },     // cast spell 200
    { actionId: 1020, diceNum: 550, targetMask: 'C', duration: 1 },                  // shield: diceNum is not a spell
  ]) },
  { id: 2001, grade: 1, maxStack: 10, effects: arr([
    { actionId: 1171, diceNum: 1, targetMask: 'C', duration: 3 },                    // +1% final damage, ×10
    { actionId: 168, diceNum: 2, targetMask: 'A', duration: 1 },                     // −2 AP on enemies: not ours
  ]) },
  { id: 2002, grade: 2, maxStack: 10, effects: arr([
    { actionId: 1171, diceNum: 1, targetMask: 'C', duration: 3 },                    // same buff again: one effect
    { actionId: 1172, diceNum: 35, targetMask: 'C', duration: 2 },                   // −35% final damage (malus)
    { actionId: 1163, diceNum: 106, targetMask: 'A', duration: 2 },                  // enemies suffer ×106%
    { actionId: 1163, diceNum: 80, targetMask: 'C', duration: 2 },                   // we suffer ×80%: defensive, skipped
    { actionId: 1076, diceNum: 0, diceSide: 3, targetMask: 'a', duration: 1 },       // +3% resistance to all allies
  ]) },
])
const effects = map([
  { id: 1171, characteristic: 107, descriptionId: 1 },
  { id: 1172, characteristic: 107, descriptionId: 2 },
  { id: 168, characteristic: 1, descriptionId: 3 },
  { id: 1076, characteristic: 101, descriptionId: 4 },
  { id: 1163, characteristic: 0, descriptionId: 5 },
  { id: 1020, characteristic: 0, descriptionId: 6 },
])
const texts = { 1: '#1% final damage', 2: '-#1% final damage', 3: '-#1 AP', 4: '#1% Resistance', 5: 'x#1% damage sustained', 6: 'shield' }

describe('fetch-passives extractEffects', () => {
  const out = extractEffects(100, spells, levels, effects, texts)

  it('follows cast-spell effects and keeps the bearer\'s stat effects, deduplicated', () => {
    expect(out.map(e => [e.stat, e.value, e.maxStack])).toEqual([
      ['finalDamagePercent', 1, 10],
      ['finalDamagePercent', -35, 10],
      ['finalDamagePercent', 6, 10],
      ['resPercentAll', 3, 10],
    ])
  })

  it('reads the sign from the effect description and marks target-side damage increases', () => {
    expect(out.find(e => e.value === -35)).toBeTruthy()
    expect(out.find(e => e.value === 6)?.onTargets).toBe(true)
  })

  it('ignores effects on enemies, numbers that are not spells, and a missing spell', () => {
    expect(out.some(e => e.stat === 'ap')).toBe(false)
    expect(extractEffects(999, spells, levels, effects, texts)).toEqual([])
  })
})
