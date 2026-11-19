import type { StatBlock } from '@/engine/types.ts'
import { useBuildStore } from '@/store/buildStore.ts'
import { useClassName } from '@/features/class-picker/useClassName.ts'

/** "Iop 12/6/3": the class in the reader's language, then AP/MP/range. The
 * name a build goes by until its owner gives it one. */
export function defaultBuildName(className: string, stats: Pick<StatBlock, 'ap' | 'mp' | 'range'> | null | undefined): string {
  if (!className) return ''
  return stats ? `${className} ${stats.ap}/${stats.mp}/${stats.range}` : className
}

/** The workshop build's default name, kept in step with its class and stats. */
export function useDefaultBuildName(): string {
  const selectedClass = useBuildStore(s => s.selectedClass)
  const stats = useBuildStore(s => s.stats)
  return defaultBuildName(useClassName(selectedClass), stats)
}
