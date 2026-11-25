import { describe, expect, it } from 'vitest'
import { activatedReq, makeDefaultConfig } from '../forgeConfig.ts'
import { decodeOrder, encodeOrder, orderCode, ORDER_PREFIX } from '../forgeShare.ts'
import type { OptimizerConfig } from '../types.ts'
import type { BuildSnapshot } from '@/store/buildStore.ts'

function order(): OptimizerConfig {
  const base = makeDefaultConfig()
  return {
    ...base,
    stats: base.stats.map(r => (r.stat === 'ap' ? activatedReq('ap') : r.stat === 'agility' ? { ...r, minimum: 1250, weight: 5, cap: null, strictCap: false } : r)),
    intensity: 'master',
    transcendence: false,
    proExo: true,
    proExoMax: 3,
    excludedKinds: ['Trophy'],
    legendary: false,
    maxLevel: 180,
    lockedSlots: new Set(['hat']),
  }
}

const BUILD: BuildSnapshot = {
  v: 1, c: 'iop', l: 200, g: 'm', a: [0, 0, 0, 0, 0, 0], s: 0,
  e: Array.from({ length: 17 }, (_, i) => (i === 0 ? 7000 : null)),
}

describe('shared Forge orders', () => {
  it('carry the goals, rules and picks, without the locked pieces unless the build goes along', () => {
    const shared = decodeOrder(encodeOrder(order(), { required: [11], banned: [12, 13] }, null))!
    expect(shared.config.stats.find(r => r.stat === 'ap')).toEqual(activatedReq('ap'))
    expect(shared.config.stats.find(r => r.stat === 'agility')).toMatchObject({ minimum: 1250, weight: 5, cap: null })
    expect(shared.config).toMatchObject({ intensity: 'master', transcendence: false, proExo: true, proExoMax: 3, excludedKinds: ['Trophy'], legendary: false, maxLevel: 180 })
    expect(shared.config.lockedSlots.size).toBe(0)
    expect(shared.picks).toEqual({ required: [11], banned: [12, 13] })
    expect(shared.build).toBeNull()
  })

  it('carry the build and its locked pieces when asked', () => {
    const shared = decodeOrder(encodeOrder(order(), { required: [], banned: [] }, BUILD))!
    expect([...shared.config.lockedSlots]).toEqual(['hat'])
    expect(shared.build).toMatchObject({ c: 'iop', l: 200 })
    expect(shared.build!.e[0]).toBe(7000)
  })

  it('read the code out of a pasted link', () => {
    const code = encodeOrder(order(), { required: [], banned: [] }, null)
    expect(orderCode(`  https://dofusforge.com/es?forge=${code}  `)).toBe(code)
    expect(orderCode(`https://dofusforge.com/?b=v1:x&forge=${code}#top`)).toBe(code)
    expect(orderCode(code)).toBe(code)
    expect(orderCode('https://dofusforge.com/es?forge=1')).toBeNull()
  })

  it('reject garbage and keep a hand-edited code inside the rules', () => {
    expect(decodeOrder('')).toBeNull()
    expect(decodeOrder(`${ORDER_PREFIX}!!!`)).toBeNull()
    expect(decodeOrder(`${ORDER_PREFIX}${btoa('[1,2]')}`)).toBeNull()
    expect(decodeOrder(ORDER_PREFIX + 'x'.repeat(30000))).toBeNull()
    const tampered = {
      o: { intensity: 'warp', maxLevel: 9999, proExoMax: 99, exo: { maxCount: 50, ap: 'yes' } },
      s: [['ap', 1e9, -5, -1, 1], ['nope', 5, 5, 0, 0], 'junk'],
      r: [5, -1, 'x', 5],
      x: [5],
      k: ['hat', 'not-a-slot'],
    }
    const shared = decodeOrder(ORDER_PREFIX + btoa(JSON.stringify(tampered)).replace(/=+$/, ''))!
    expect(shared.config.stats.find(r => r.stat === 'ap')).toMatchObject({ minimum: 10000, weight: 0, cap: null })
    expect(shared.config.stats.some(r => (r.stat as string) === 'nope')).toBe(false)
    expect(shared.config).toMatchObject({ intensity: 'standard', maxLevel: 200, proExoMax: 9 })
    expect(shared.config.exo).toMatchObject({ maxCount: 3, ap: true })
    expect(shared.config.lockedSlots.size).toBe(0)
    expect(shared.picks).toEqual({ required: [], banned: [5] })
  })

  it('reject a code whose build is broken', () => {
    const payload = { o: {}, s: [], b: { v: 99 } }
    expect(decodeOrder(ORDER_PREFIX + btoa(JSON.stringify(payload)).replace(/=+$/, ''))).toBeNull()
  })
})
