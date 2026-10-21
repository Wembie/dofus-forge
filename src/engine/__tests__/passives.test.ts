import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { StatBlock } from '../types.ts'
import {
  ITEM_PASSIVES, TEXT_ONLY_PASSIVES, hasPassive, controlMax, controlBonus, controlRoom, setControl,
  passiveBonus, sanitizePassiveState, withPassives,
} from '../passives.ts'

type RawItem = { ankama_id: number; name: string; type: string; ability?: string }
const ROOT = join(__dirname, '..', '..', '..')
const items = JSON.parse(readFileSync(join(ROOT, 'public', 'data', 'en', 'equipment.json'), 'utf8')) as RawItem[]
const byId = new Map(items.map(i => [i.ankama_id, i]))

// Abilities that are not combat passives: titles, sidekick signals, a minigame ball.
const notAPassive = (i: RawItem) => /^Title:/.test(i.ability!) || i.type === 'Sidekick' || /Boufbowl/.test(i.ability!)

const TURQUOISE = 739
const ABYSSAL   = 18043
const SURPRYZ   = 22001
const PRYNYANG  = 22004

describe('passives table vs the real item data', () => {
  it('every real passive in the data is modelled or listed as text-only', () => {
    const missing = items.filter(i => i.ability && !notAPassive(i) && !hasPassive(i.ankama_id)).map(i => `${i.ankama_id} ${i.name}`)
    expect(missing).toEqual([])
  })

  it('every modelled id is an item that has a passive text', () => {
    for (const id of [...ITEM_PASSIVES.keys(), ...TEXT_ONLY_PASSIVES]) {
      const item = byId.get(id)
      expect(item?.ability, String(id)).toBeTruthy()
      expect(notAPassive(item!), item!.name).toBe(false)
    }
  })

  it('every value and stack cap in the table appears in the item text (no typos)', () => {
    // Caps the game text does not give ("for each MP used", "for each enemy
    // hit"): a safe bound, see passives.ts.
    const ESTIMATED_MAX = new Set(['20354.0', '22023.0', '29136.0', '32116.0'])
    const wrong: string[] = []
    for (const [id, controls] of ITEM_PASSIVES) {
      const numbers = new Set((byId.get(id)!.ability!.match(/\d+/g) ?? []).map(Number))
      for (const c of controls) {
        const bonuses = c.kind === 'stacks' ? [c.perStack] : c.options.map(o => o.bonus)
        for (const bonus of bonuses) {
          for (const [stat, v] of Object.entries(bonus)) if (!numbers.has(Math.abs(v as number))) wrong.push(`${c.id} ${stat}=${v}`)
        }
        if (c.kind === 'stacks' && !ESTIMATED_MAX.has(c.id) && !numbers.has(c.max)) wrong.push(`${c.id} max=${c.max}`)
        if (c.kind === 'stacks' && c.shared && !numbers.has(c.shared)) wrong.push(`${c.id} shared=${c.shared}`)
      }
    }
    expect(wrong).toEqual([])
  })

  it('no item is both modelled and text-only, and control ids are unique', () => {
    expect([...ITEM_PASSIVES.keys()].filter(id => TEXT_ONLY_PASSIVES.has(id))).toEqual([])
    const ids = [...ITEM_PASSIVES.values()].flat().map(c => c.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('passive bonus', () => {
  it('stacks multiply (Turquoise: 10 crits → +10% final damage)', () => {
    expect(passiveBonus([TURQUOISE], { [`${TURQUOISE}.0`]: 10 })).toEqual({ finalDamagePercent: 10 })
  })

  it('a choice gives only the picked case (Abyssal: +1 MP or +1 AP)', () => {
    expect(passiveBonus([ABYSSAL], { [`${ABYSSAL}.0`]: 1 })).toEqual({ mp: 1 })
    expect(passiveBonus([ABYSSAL], { [`${ABYSSAL}.0`]: 2 })).toEqual({ ap: 1 })
    expect(passiveBonus([ABYSSAL], {})).toEqual({})
  })

  it('Prysmaradite turns (Surpryz 100 / 35 / 15 crit; Prynyang mixes stats)', () => {
    expect(passiveBonus([SURPRYZ], { [`${SURPRYZ}.0`]: 2 })).toEqual({ critChance: 35 })
    expect(passiveBonus([PRYNYANG], { [`${PRYNYANG}.0`]: 1 })).toMatchObject({ finalDamagePercent: 10, fireResPercent: -10 })
  })

  it('only equipped items count, each once', () => {
    const state = { [`${TURQUOISE}.0`]: 4 }
    expect(passiveBonus([], state)).toEqual({})
    expect(passiveBonus([TURQUOISE, TURQUOISE, null], state)).toEqual({ finalDamagePercent: 4 })
  })

  it('bonuses of several items add up and cancel to nothing when they offset', () => {
    // Pryssure-O-Mat: −10% final, +1 AP; Turquoise 10 stacks: +10% final.
    expect(passiveBonus([21996, TURQUOISE], { '21996.0': 1, [`${TURQUOISE}.0`]: 10 })).toEqual({ ap: 1 })
  })

  it('uncapped "per MP used" / "per enemy" passives allow 8 MP or enemies over their two counts', () => {
    // Sylvan (+8 Power per MP, 2 turns): a 16-stack max covers 8 MP on two turns.
    expect(controlMax(ITEM_PASSIVES.get(29136)![0])).toBe(16)
    expect(passiveBonus([29136], { '29136.0': 16 })).toEqual({ power: 128 })
    expect(controlMax(ITEM_PASSIVES.get(32116)![0])).toBe(16)
    expect(controlMax(ITEM_PASSIVES.get(22023)![0])).toBe(16)
  })

  it('shared stacks never exceed their common cap (Jahash 5 across elements, Meriana 8)', () => {
    // Raw state over the cap: trimmed in control order.
    expect(sanitizePassiveState({ '20362.0': 3, '20362.2': 4 })).toEqual({ '20362.0': 3, '20362.2': 2 })
    expect(passiveBonus([20362], { '20362.0': 5, '20362.1': 5 })).toEqual({ neutralResPercent: 20 })
    // Setting one keeps it within the room the others leave.
    expect(setControl({ '32121.0': 6 }, '32121.1', 8)).toEqual({ '32121.0': 6, '32121.1': 2 })
    expect(controlRoom(ITEM_PASSIVES.get(32121)![1], { '32121.0': 6 })).toBe(2)
    // Lowering one frees room for the other.
    expect(setControl({ '32121.0': 6, '32121.1': 2 }, '32121.0', 1)).toEqual({ '32121.0': 1, '32121.1': 2 })
  })

  it('Domakuro counts in steps of 8 (16 without attacking, 8 with one attack) up to +64', () => {
    expect(passiveBonus([23237], { '23237.0': 3 })).toEqual({ damage: 24 })
    expect(controlMax(ITEM_PASSIVES.get(23237)![0])).toBe(8)
  })

  it('damage-suffered increases on targets count as final damage (Thanatena +4%, Scissors +6%)', () => {
    expect(passiveBonus([32117], { '32117.1': 1 })).toEqual({ finalDamagePercent: 4 })
    expect(passiveBonus([20354], { '20354.1': 1 })).toEqual({ finalDamagePercent: 6 })
  })

  it('controlBonus is clamped to the control', () => {
    const control = ITEM_PASSIVES.get(TURQUOISE)![0]
    expect(controlMax(control)).toBe(10)
    expect(controlBonus(control, 99)).toEqual({ finalDamagePercent: 10 })
    expect(controlBonus(control, 0)).toEqual({})
  })
})

describe('sanitizePassiveState (share links, DB rows)', () => {
  it('keeps known controls with clamped integer values, drops the rest', () => {
    expect(sanitizePassiveState({
      [`${TURQUOISE}.0`]: 99, [`${ABYSSAL}.0`]: 1.7, '1.0': 3, [`${SURPRYZ}.0`]: -2, x: 'y', __proto__: 5,
    })).toEqual({ [`${TURQUOISE}.0`]: 10, [`${ABYSSAL}.0`]: 1 })
    expect(sanitizePassiveState(null)).toEqual({})
    expect(sanitizePassiveState([1, 2])).toEqual({})
  })
})

describe('withPassives (in-combat stats)', () => {
  const base = {
    ap: 12, mp: 6, damage: 10, earthDamage: 10, fireDamage: 10, waterDamage: 10, airDamage: 10, neutralDamage: 10,
    finalDamagePercent: 0, critChance: 5,
    neutralResPercent: 48, earthResPercent: 20, fireResPercent: 20, waterResPercent: 20, airResPercent: 20,
    neutralResPercentRaw: 48, earthResPercentRaw: 20, fireResPercentRaw: 20, waterResPercentRaw: 20, airResPercentRaw: 20,
  } as StatBlock

  it('returns the same object when nothing is active', () => {
    expect(withPassives(base, {})).toBe(base)
  })

  it('adds the bonus; generic Damage reaches every element; AP is not capped by the gear limit', () => {
    const s = withPassives(base, { ap: 1, damage: 20, finalDamagePercent: 10 })
    expect(s.ap).toBe(13)
    expect(s.damage).toBe(30)
    expect([s.earthDamage, s.fireDamage, s.neutralDamage]).toEqual([30, 30, 30])
    expect(s.finalDamagePercent).toBe(10)
    expect(base.ap).toBe(12)
  })

  it('% resistances keep the 50% cap', () => {
    const s = withPassives(base, { neutralResPercent: 4, earthResPercent: 4 })
    expect(s.neutralResPercent).toBe(50)
    expect(s.neutralResPercentRaw).toBe(52)
    expect(s.earthResPercent).toBe(24)
  })
})
