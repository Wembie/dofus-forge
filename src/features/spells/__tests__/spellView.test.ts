import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, it, expect } from 'vitest'
import type { AppItem } from '@/data/loaders.ts'
import type { ClassSpells } from '@/data/spellLoaders.ts'
import type { StatBlock } from '@/engine/types.ts'
import { spellBuffIcon, spellView, weaponView } from '../spellView.ts'

function stats(over: Partial<StatBlock> = {}): StatBlock {
  return {
    strength: 0, intelligence: 0, chance: 0, agility: 0, power: 0,
    damage: 0, bestElemDamage: 0, critDamage: 0, critChance: 0, range: 0, pushbackDamage: 0,
    earthDamage: 0, fireDamage: 0, waterDamage: 0, airDamage: 0, neutralDamage: 0,
    weaponDamagePercent: 0, spellDamagePercent: 0, meleeDamagePercent: 0, rangedDamagePercent: 0,
    finalDamagePercent: 0,
    ...over,
  } as StatBlock
}

const VAMPIRE = {
  name: 'Vampire', ap_cost: 4, min_range: 1, max_range: 1, crit_chance: 20, crit_bonus: 4,
  effects: [
    { stat: 'Neutral steal', min: 10, max: 15 },
    { stat: 'Fire damage',   min: 7,  max: 9 },
  ],
} as unknown as AppItem

describe('weaponView', () => {
  it('heals half of each steal line, rounded down, and totals both kinds of hit', () => {
    const view = weaponView({ weapon: VAMPIRE, stats: stats(), transform: null, mastery: { active: false, normal: 0, crit: 0 } })
    expect(view.steal).toHaveLength(1)
    const [steal] = view.steal
    expect(steal.heal).toEqual([Math.floor(steal.low / 2), Math.floor(steal.high / 2)])
    expect(view.total?.normal).toEqual([
      view.damage[0].low + steal.low,
      view.damage[0].high + steal.high,
    ])
    expect(view.total?.heal?.normal).toEqual(steal.heal)
  })

  it('caps the critical chance at 100 and only shows a transform on weapons with a neutral line', () => {
    const transform = { element: 'water' as const, ratio: 68 as const }
    const neutral = weaponView({ weapon: VAMPIRE, stats: stats({ critChance: 95 }), transform, mastery: { active: false, normal: 0, crit: 0 } })
    expect(neutral.crit).toBe(100)
    expect(neutral.transform).toEqual(transform)
    const fireOnly = { ...VAMPIRE, effects: [VAMPIRE.effects[1]] } as AppItem
    expect(weaponView({ weapon: fireOnly, stats: null, transform, mastery: { active: false, normal: 0, crit: 0 } }).transform).toBeNull()
  })

  it('adds weapon mastery as power, with its own value on critical hits', () => {
    const view = weaponView({ weapon: VAMPIRE, stats: stats(), transform: null, mastery: { active: true, normal: 300, crit: 360 } })
    expect(view.normalMods.power).toBe(300)
    expect(view.critMods.power).toBe(360)
  })
})

describe('spellView', () => {
  const cra = JSON.parse(readFileSync(resolve(process.cwd(), 'public/data/en/spells/cra.json'), 'utf8')) as ClassSpells

  it('never adds poison ticks into a spell total', () => {
    for (const spell of cra.spells) {
      const view = spellView({ spell, grade: 6, stats: stats({ strength: 500 }), itemEffects: [], characterLevel: 200 })
      for (const group of view.groups) {
        if (!group.total) continue
        const instant = group.entries.flatMap(e => (e.kind === 'hit' && e.effect.kind !== 'poison' ? [e.effect] : []))
        expect(group.total.normal[0]).toBe(instant.reduce((s, e) => s + e.calcMin, 0))
      }
    }
  })

  it('extends the range of modifiable spells with the build range', () => {
    const spell = cra.spells.find(s => {
      const level = s.levels.at(-1)
      return level && level.maxRange > 1 && level.rangeModifiable !== false
    })!
    const grade = spell.levels.at(-1)!.grade
    const base = spellView({ spell, grade, stats: stats(), itemEffects: [], characterLevel: 200 })
    const ranged = spellView({ spell, grade, stats: stats({ range: 3 }), itemEffects: [], characterLevel: 200 })
    if (base.range.melee || ranged.range.melee) throw new Error('expected a ranged spell')
    expect(ranged.range.max).toBe(base.range.max + 3)
  })
})

describe('spellBuffIcon', () => {
  it('reads buff lines in the four languages', () => {
    expect(spellBuffIcon('+2 AP')).toBe('ap')
    expect(spellBuffIcon('-1 PM')).toBe('mp_reduction')
    expect(spellBuffIcon('+50 Fuerza')).toBe('strength')
    expect(spellBuffIcon('+10% dommages finaux')).toBe('damage')
    expect(spellBuffIcon('Bouclier: 20% du niveau')).toBeNull()
  })
})
