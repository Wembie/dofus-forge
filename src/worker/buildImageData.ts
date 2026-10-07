import { computeStats } from '../engine/stats.ts'
import { CHARACTERISTICS } from '../engine/types.ts'
import type { AllocatedCharacteristics, DofusClass, ScrolledCharacteristics, StatBlock } from '../engine/types.ts'
import type { BuildMeta } from './supabase.ts'
import type { Lang, WorkerAppItem, WorkerAppSet } from './data.ts'
import type { OgBadge, OgCharRow, OgItemRow } from './ogImage.ts'
import { statIconDataUri, toDataUri } from './data.ts'

// Mirrors store/buildStore.ts's ALL_SLOTS — duplicated (not imported) so this
// Worker bundle never has to resolve that module's own '@/engine/...' path
// aliases, which wrangler's bundler isn't configured to follow.
const ALL_SLOTS = [
  'hat', 'cape', 'amulet', 'ring1', 'ring2',
  'belt', 'boots', 'weapon', 'shield', 'companion',
  'sidekick',
  'dofus1', 'dofus2', 'dofus3', 'dofus4', 'dofus5', 'dofus6',
] as const

const CHAR_COLOR: Record<string, string> = {
  vitality: '#e05252', wisdom: '#9b6dff', strength: '#c49a2a',
  intelligence: '#dc4e22', chance: '#2a8fd4', agility: '#6ab04c',
}

function decodeSnapshot(build: BuildMeta) {
  const snap = build.snapshot
  const allocated = Object.fromEntries(
    CHARACTERISTICS.map((c, i) => [c, snap.a[i] ?? 0]),
  ) as AllocatedCharacteristics
  const scrolled = Object.fromEntries(
    CHARACTERISTICS.map((c, i) => [c, Boolean(snap.s & (1 << i))]),
  ) as ScrolledCharacteristics
  const equipped = Object.fromEntries(
    ALL_SLOTS.map((slot, i) => [slot, snap.e[i] ?? undefined]).filter(([, v]) => v != null),
  ) as Partial<Record<string, number>>
  return { allocated, scrolled, equipped }
}

function computeBuildStats(build: BuildMeta, equipment: WorkerAppItem[], sets: WorkerAppSet[]): { stats: StatBlock | null; equippedItems: WorkerAppItem[] } {
  const { allocated, scrolled, equipped } = decodeSnapshot(build)
  const equipMap = new Map(equipment.map(it => [it.ankama_id, it]))
  const equippedItems = ALL_SLOTS
    .map(slot => {
      const id = equipped[slot]
      if (id == null) return null
      return equipMap.get(id) ?? null
    })
    .filter((x): x is WorkerAppItem => x !== null)

  const dofusClass = (build.class_slug || null) as DofusClass | null
  if (!dofusClass) return { stats: null, equippedItems }

  const items = equippedItems.map(it => ({ ankama_id: it.ankama_id, effects: it.effects, set_id: it.set_id, slot: it.slot }))
  const stats = computeStats({ class: dofusClass, level: build.level, allocated, scrolled, items, sets })
  return { stats, equippedItems }
}

export async function buildOgImageData(
  assets: Fetcher,
  origin: string,
  build: BuildMeta,
  equipment: WorkerAppItem[],
  sets: WorkerAppSet[],
  classLabel: string,
  labels: Record<string, string>,  // translation.json's slot_<slot> and char_<characteristic> keys
) {
  const { stats, equippedItems } = computeBuildStats(build, equipment, sets)
  const { equipped } = decodeSnapshot(build)

  const itemRows: OgItemRow[] = await Promise.all(
    ALL_SLOTS
      .map(slot => ({ slot: slot as string, id: equipped[slot] }))
      .filter((x): x is { slot: string; id: number } => x.id != null)
      .map(async ({ slot, id }) => {
        const item = equippedItems.find(it => it.ankama_id === id)
        return {
          label: labels[`slot_${slot}`] ?? slot,
          name: item?.name ?? '?',
          iconUri: item?.image_url ? await toDataUri(assets, origin, item.image_url) : undefined,
        }
      }),
  )

  const badgeDefs = stats
    ? [
        { icon: 'ap', label: 'AP', value: stats.ap, color: '#f5c518' },
        { icon: 'mp', label: 'MP', value: stats.mp, color: '#6ab04c' },
        { icon: 'vitality', label: 'HP', value: stats.maxHp, color: '#e05252' },
        ...(stats.range > 0 ? [{ icon: 'range', label: 'Range', value: stats.range, color: '#2a8fd4' }] : []),
      ]
    : []
  const badges: OgBadge[] = await Promise.all(
    badgeDefs.map(async b => ({ ...b, iconUri: await statIconDataUri(assets, origin, b.icon) })),
  )

  const charDefs = stats
    ? (['vitality', 'wisdom', 'strength', 'intelligence', 'chance', 'agility'] as const)
        .map(key => ({ icon: key, label: labels[`char_${key}`] ?? key, value: stats[key], color: CHAR_COLOR[key] }))
        .filter(c => c.value !== 0)
    : []
  const chars: OgCharRow[] = await Promise.all(
    charDefs.map(async c => ({ ...c, iconUri: await statIconDataUri(assets, origin, c.icon) })),
  )

  return {
    title: build.name || classLabel,
    classLabel,
    level: build.level,
    gender: (build.gender === 'f' ? 'female' : 'male') as 'male' | 'female',
    ownerLabel: build.profiles?.username ? `by ${build.profiles.username}` : undefined,
    items: itemRows,
    badges,
    chars,
    footerText: 'dofusforge.com',
  }
}

export type { Lang }
