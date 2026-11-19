import { useTranslation } from 'react-i18next'
import type { StatBlock } from '@/engine/types.ts'
import { useBuildStore } from '@/store/buildStore.ts'
import { useClassName } from '@/features/class-picker/useClassName.ts'

/** Same limit as the name fields that write it. */
export const BUILD_NAME_MAX = 60

const ELEMENTAL = ['strength', 'intelligence', 'chance', 'agility'] as const
type Elemental = (typeof ELEMENTAL)[number]
// Within 15 % of the highest, a characteristic counts as a main one too.
const CLOSE = 0.85

type NameStats = Pick<StatBlock, 'ap' | 'mp' | 'range' | Elemental>

/** The characteristics a build is built on: the highest, plus any within
 * 15 % of it. Power is left out, it raises all four alike. */
export function mainCharacteristics(stats: Pick<StatBlock, Elemental>): Elemental[] {
  const sorted = [...ELEMENTAL].sort((a, b) => stats[b] - stats[a])
  const top = stats[sorted[0]]
  if (top <= 0) return []
  return sorted.filter(c => stats[c] >= top * CLOSE)
}

/**
 * "Iop Strength 12/6/3", "Cra Chance-Agility 11/6/6 · Lvl 150": the class in
 * the reader's language, its main characteristic (two joined, "Mixed" past
 * that), AP/MP/range and the level when it is not 200. The name a build goes
 * by until its owner gives it one.
 */
export function defaultBuildName(
  className: string,
  stats: NameStats | null | undefined,
  level: number,
  label: { characteristic: (c: Elemental) => string; mixed: string; level: (n: number) => string },
): string {
  if (!className) return ''
  const parts = [className]
  if (stats) {
    const main = mainCharacteristics(stats)
    if (main.length > 2) parts.push(label.mixed)
    else if (main.length > 0) parts.push(main.map(label.characteristic).join('-'))
    parts.push(`${stats.ap}/${stats.mp}/${stats.range}`)
  }
  const name = parts.join(' ') + (level < 200 ? ` · ${label.level(level)}` : '')
  return name.slice(0, BUILD_NAME_MAX)
}

/** The workshop build's default name, kept in step with its class, stats and level. */
export function useDefaultBuildName(): string {
  const { t } = useTranslation()
  const selectedClass = useBuildStore(s => s.selectedClass)
  const stats = useBuildStore(s => s.stats)
  const level = useBuildStore(s => s.level)
  return defaultBuildName(useClassName(selectedClass), stats, level, {
    characteristic: c => t(`stat_${c}`),
    mixed: t('elem_mixed'),
    level: n => t('level_short', { level: n }),
  })
}
