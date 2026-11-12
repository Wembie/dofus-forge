import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { AppItem, AppSet } from '@/data/loaders.ts'
import type { BuildSnapshot } from '@/store/buildStore.ts'
import { recompute, ALL_SLOTS } from '@/store/buildStore.ts'

const api = vi.hoisted(() => ({ fetchBenchmarkSnapshots: vi.fn() }))
vi.mock('@/features/builds/api.ts', async importOriginal => ({ ...(await importOriginal<object>()), ...api }))

const { fetchCommunityBenchmark } = await import('../communityBenchmark.ts')

const DUMMY_ITEMS: AppItem[] = [
  { ankama_id: 1, name: 'placeholder', level: 1, type: 'Hat', slot: 'hat', effects: [], set_id: null, image_url: null },
]
const DUMMY_SETS: AppSet[] = [{ ankama_id: 1, name: 'placeholder', items: [], bonuses: {} }]

const ZERO_ALLOC = { vitality: 0, wisdom: 0, strength: 0, intelligence: 0, chance: 0, agility: 0 }
const NO_SCROLLS = { vitality: false, wisdom: false, strength: false, intelligence: false, chance: false, agility: false }

function snapshotAt(level: number, vitality: number): BuildSnapshot {
  return { v: 1, c: 'iop', l: level, a: [vitality, 0, 0, 0, 0, 0], s: 0, e: Array(ALL_SLOTS.length).fill(null) }
}

function mineAt(level: number, vitality: number) {
  return recompute('iop', level, { ...ZERO_ALLOC, vitality }, NO_SCROLLS, {}, DUMMY_ITEMS, DUMMY_SETS, {})!
}

beforeEach(() => {
  api.fetchBenchmarkSnapshots.mockReset()
})

// Each test uses its own level bucket (±10) — the module caches by
// `${classSlug}:${levelMin}-${levelMax}`, so distinct levels keep tests from
// reading each other's cached sample.

describe('fetchCommunityBenchmark', () => {
  it('returns null when the equipment/set catalogs are not loaded yet', async () => {
    const result = await fetchCommunityBenchmark('iop', 200, mineAt(200, 300), [], [])
    expect(result).toBeNull()
    expect(api.fetchBenchmarkSnapshots).not.toHaveBeenCalled()
  })

  it('returns null when fewer than 5 public builds match', async () => {
    api.fetchBenchmarkSnapshots.mockResolvedValue({
      data: [0, 200, 400].map(v => ({ level: 140, snapshot: snapshotAt(140, v) })),
      error: null,
    })
    const result = await fetchCommunityBenchmark('iop', 140, mineAt(140, 300), DUMMY_ITEMS, DUMMY_SETS)
    expect(result).toBeNull()
  })

  it('computes a maxHp percentile against the sample distribution', async () => {
    api.fetchBenchmarkSnapshots.mockResolvedValue({
      data: [0, 200, 400, 600, 800].map(v => ({ level: 170, snapshot: snapshotAt(170, v) })),
      error: null,
    })
    const result = await fetchCommunityBenchmark('iop', 170, mineAt(170, 300), DUMMY_ITEMS, DUMMY_SETS)
    expect(result).not.toBeNull()
    expect(result!.sampleSize).toBe(5)
    // 2 of the 5 samples (vitality 0, 200) have less HP than mine (vitality 300) -> 40%
    expect(result!.percentiles.maxHp).toBe(40)
    expect(result!.levelMin).toBe(160)
    expect(result!.levelMax).toBe(180)
  })

  it('caches results for the same class/level bucket instead of refetching', async () => {
    api.fetchBenchmarkSnapshots.mockResolvedValue({
      data: [0, 200, 400, 600, 800].map(v => ({ level: 50, snapshot: snapshotAt(50, v) })),
      error: null,
    })
    const mine = mineAt(50, 300)
    await fetchCommunityBenchmark('iop', 50, mine, DUMMY_ITEMS, DUMMY_SETS)
    const callsAfterFirst = api.fetchBenchmarkSnapshots.mock.calls.length
    expect(callsAfterFirst).toBe(1)
    await fetchCommunityBenchmark('iop', 50, mine, DUMMY_ITEMS, DUMMY_SETS)
    expect(api.fetchBenchmarkSnapshots.mock.calls.length).toBe(callsAfterFirst)
  })
})
