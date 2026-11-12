import { CHARACTERISTICS, type AllocatedCharacteristics, type ScrolledCharacteristics, type StatBlock, type DofusClass } from '@/engine/types.ts'
import type { AppItem, AppSet } from '@/data/loaders.ts'
import { ALL_SLOTS, recompute, type SlotId, type BuildSnapshot, type RuneMap } from '@/store/buildStore.ts'
import { fetchBenchmarkSnapshots } from '@/features/builds/api.ts'

export type BenchmarkKey = 'maxHp' | 'ap' | 'mp' | 'critChance'
export const BENCHMARK_KEYS: BenchmarkKey[] = ['maxHp', 'ap', 'mp', 'critChance']

export type CommunityBenchmark = {
  sampleSize:  number
  levelMin:    number
  levelMax:    number
  percentiles: Partial<Record<BenchmarkKey, number>>
}

function decodeForStats(snap: BuildSnapshot) {
  const allocated = Object.fromEntries(CHARACTERISTICS.map((c, i) => [c, snap.a[i] ?? 0])) as AllocatedCharacteristics
  const scrolled  = Object.fromEntries(CHARACTERISTICS.map((c, i) => [c, Boolean(snap.s & (1 << i))])) as ScrolledCharacteristics
  const equipped  = Object.fromEntries(
    ALL_SLOTS.map((slot, i) => [slot, snap.e[i] ?? undefined]).filter(([, v]) => v != null),
  ) as Partial<Record<SlotId, number>>
  return { allocated, scrolled, equipped, runes: (snap.r ?? {}) as Partial<Record<SlotId, RuneMap>> }
}

// A build the player already published might land in its own sample (one
// extra point out of ~60) — negligible noise, not worth excluding by id.
const SAMPLE_LEVEL_SPAN = 10
const MIN_SAMPLE_SIZE   = 5
const CACHE_TTL_MS      = 10 * 60 * 1000

const cache = new Map<string, { at: number; levelMin: number; levelMax: number; samples: Record<BenchmarkKey, number[]> }>()

export async function fetchCommunityBenchmark(
  classSlug:  DofusClass,
  level:      number,
  mine:       StatBlock,
  equipment:  AppItem[],
  sets:       AppSet[],
): Promise<CommunityBenchmark | null> {
  if (equipment.length === 0 || sets.length === 0) return null

  const levelMin = Math.max(1, level - SAMPLE_LEVEL_SPAN)
  const levelMax = Math.min(200, level + SAMPLE_LEVEL_SPAN)
  const bucket   = `${classSlug}:${levelMin}-${levelMax}`

  let entry = cache.get(bucket)
  if (!entry || Date.now() - entry.at > CACHE_TTL_MS) {
    const { data } = await fetchBenchmarkSnapshots({ classSlug, levelMin, levelMax, limit: 60 })
    const samples: Record<BenchmarkKey, number[]> = { maxHp: [], ap: [], mp: [], critChance: [] }
    for (const row of data) {
      const { allocated, scrolled, equipped, runes } = decodeForStats(row.snapshot)
      const stats = recompute(classSlug, row.level, allocated, scrolled, equipped, equipment, sets, runes)
      if (!stats) continue
      for (const key of BENCHMARK_KEYS) samples[key].push(stats[key] as number)
    }
    entry = { at: Date.now(), levelMin, levelMax, samples }
    cache.set(bucket, entry)
  }

  const sampleSize = entry.samples.maxHp.length
  if (sampleSize < MIN_SAMPLE_SIZE) return null

  const percentiles: Partial<Record<BenchmarkKey, number>> = {}
  for (const key of BENCHMARK_KEYS) {
    const arr = entry.samples[key]
    if (arr.length === 0) continue
    const below = arr.filter(v => v < (mine[key] as number)).length
    percentiles[key] = Math.round((below / arr.length) * 100)
  }

  return { sampleSize, levelMin: entry.levelMin, levelMax: entry.levelMax, percentiles }
}
