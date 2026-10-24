import { OPTIMIZER_STATS, STAT_GROUPS } from '@/features/optimizer/statList.ts'
import type { OptimizerStatKey } from '@/features/optimizer/types.ts'

// The item catalog's effect filter follows La Forjadora's own groups and
// order (statList.ts STAT_GROUPS), so a stat sits in the same place in both
// and a change there moves it here too. Stats are matched by translation
// key, which covers the catalog's spelling variants ("Neutral Damage" /
// "Neutral damage" share stat_neutral_damage).
export type FilterSection = { titleKey?: string; tKeys: string[] }
export type FilterGroup   = { key: string; titleKey: string; sections: FilterSection[] }

const TKEY = new Map(OPTIMIZER_STATS.map(s => [s.key, s.tKey]))
const tKeys = (keys: OptimizerStatKey[]) => keys.map(k => TKEY.get(k)!)
const forge = (key: string) => STAT_GROUPS.find(g => g.key === key)!

/** A Forge group's sub-sections, with catalog-only stats appended per section. */
function sectionsOf(key: string, extra: Record<number, string[]> = {}): FilterSection[] {
  return forge(key).sections.map((s, i) => ({ titleKey: s.tKey, tKeys: [...tKeys(s.statKeys), ...(extra[i] ?? [])] }))
}

export const FILTER_LAYOUT: FilterGroup[] = [
  {
    key: 'primary', titleKey: 'stat_group_primary', sections: [
      // Item effects that raise a game cap belong with the stat they cap.
      { titleKey: forge('core').tKey, tKeys: [...tKeys(forge('core').statKeys), 'stat_ap_cap', 'stat_mp_cap', 'stat_range_cap', 'stat_summons_cap'] },
      { titleKey: forge('chars').tKey, tKeys: tKeys(forge('chars').statKeys) },
    ],
  },
  { key: 'damage', titleKey: 'stat_group_damage',      sections: sectionsOf('damage') },
  { key: 'res',    titleKey: 'stat_group_resistance',  sections: sectionsOf('res', { 1: ['stat_spell_res', 'stat_weapon_res'] }) },
  { key: 'combat', titleKey: 'optimizer_group_combat', sections: sectionsOf('combat') },
]

const POSITION = new Map<string, { group: number; section: number; order: number }>()
FILTER_LAYOUT.forEach((g, group) => g.sections.forEach((s, section) => s.tKeys.forEach((tKey, order) => {
  if (!POSITION.has(tKey)) POSITION.set(tKey, { group, section, order })
})))

export type LaidOutGroup = { key: string; titleKey: string; sections: { titleKey?: string; stats: string[] }[] }

/**
 * Places each stat in its group and sub-section, in the Forge's order. Empty
 * sections and groups are left out; stats the layout doesn't know go to
 * `other` (sorted by `label`).
 */
export function layoutStats(stats: string[], tKeyOf: (stat: string) => string | undefined, label: (stat: string) => string): { groups: LaidOutGroup[]; other: string[] } {
  const placed = FILTER_LAYOUT.map(g => g.sections.map(() => [] as { stat: string; order: number }[]))
  const other: string[] = []
  for (const stat of stats) {
    const tKey = tKeyOf(stat)
    const at = tKey ? POSITION.get(tKey) : undefined
    if (at) placed[at.group][at.section].push({ stat, order: at.order })
    else other.push(stat)
  }
  const groups = FILTER_LAYOUT.map((g, gi) => ({
    key: g.key,
    titleKey: g.titleKey,
    sections: g.sections
      .map((s, si) => ({ titleKey: s.titleKey, stats: placed[gi][si].sort((a, b) => a.order - b.order).map(x => x.stat) }))
      .filter(s => s.stats.length > 0),
  })).filter(g => g.sections.length > 0)
  return { groups, other: other.sort((a, b) => label(a).localeCompare(label(b))) }
}
