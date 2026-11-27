import { EXCLUSIVE_SLUGS, exclusiveAssetPaths, type ExclusiveSlug } from './exclusiveAppearance.ts'
export { effectiveAvatarUrl, effectiveBannerUrl } from './exclusiveAppearance.ts'

// Display catalog mirrors exclusive_rewards; entitlement remains server-owned.
export const EXCLUSIVE_CHAPTERS = [
  { id: 'first_steps', nameKey: 'streak_chapter_first_steps' },
  { id: 'feats', nameKey: 'streak_chapter_feats' },
  { id: 'legends', nameKey: 'streak_chapter_legends' },
] as const
export type ExclusiveChapter = (typeof EXCLUSIVE_CHAPTERS)[number]['id']

export type ExclusiveReward = {
  slug:       ExclusiveSlug
  threshold:  number
  chapter:    ExclusiveChapter
  family?:    'bakara'
  nameKey:    string
  avatarPath: string
  bannerPath: string
}

const details: Record<ExclusiveSlug, Pick<ExclusiveReward, 'threshold' | 'chapter' | 'family'>> = {
  kerubim: { threshold: 7, chapter: 'first_steps' },
  joris: { threshold: 14, chapter: 'first_steps' },
  atcham: { threshold: 21, chapter: 'first_steps' },
  julith: { threshold: 30, chapter: 'first_steps' },
  bakara: { threshold: 45, chapter: 'feats', family: 'bakara' },
  jahash: { threshold: 60, chapter: 'feats' },
  otomai: { threshold: 90, chapter: 'feats' },
  bakara_tipsy: { threshold: 90, chapter: 'feats', family: 'bakara' },
  goultard: { threshold: 100, chapter: 'feats' },
  bakara_drunk_book: { threshold: 120, chapter: 'legends', family: 'bakara' },
  dathura: { threshold: 150, chapter: 'legends' },
  bakara_drunk_lecture: { threshold: 180, chapter: 'legends', family: 'bakara' },
  djaul: { threshold: 200, chapter: 'legends' },
  bakara_drunk_toast: { threshold: 240, chapter: 'legends', family: 'bakara' },
  jiva: { threshold: 270, chapter: 'legends' },
  ogrest: { threshold: 365, chapter: 'legends' },
}

export const EXCLUSIVE_REWARDS: readonly ExclusiveReward[] = EXCLUSIVE_SLUGS.map(slug => ({
  slug, ...details[slug], nameKey: `exclusive_${slug}_name`, ...exclusiveAssetPaths(slug),
}))

const BY_SLUG = new Map<string, ExclusiveReward>(EXCLUSIVE_REWARDS.map(r => [r.slug, r]))

export function exclusiveRewardOf(slug: string | null | undefined): ExclusiveReward | undefined {
  return slug ? BY_SLUG.get(slug) : undefined
}

export function nextExclusiveRewards(best: number): readonly ExclusiveReward[] {
  const next = EXCLUSIVE_REWARDS.find(r => r.threshold > best)
  return next ? EXCLUSIVE_REWARDS.filter(r => r.threshold === next.threshold) : []
}
