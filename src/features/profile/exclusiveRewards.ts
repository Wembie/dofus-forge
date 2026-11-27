// M188 — exclusive avatar/banner pairs earned via the daily login streak
// (docs/brand/emblematic-rewards/). Mirrors the DB's `exclusive_rewards`
// table 1:1 for display purposes only — the server is the actual source of
// truth for entitlement (profiles.exclusive_avatar_slug/exclusive_banner_slug
// are FK'd to that table and a trigger rejects an unearned claim regardless
// of what this file says). Same 4 milestones as the streak frame
// (milestones.ts) — one ladder, not two.

const BASE = import.meta.env.BASE_URL

export type ExclusiveReward = {
  slug:       string
  threshold:  number
  nameKey:    string
  avatarPath: string
  bannerPath: string
}

export const EXCLUSIVE_REWARDS: readonly ExclusiveReward[] = [
  { slug: 'kerubim',  threshold: 7,   nameKey: 'exclusive_kerubim_name',
    avatarPath: `${BASE}avatars/exclusive/v1/kerubim.webp`,  bannerPath: `${BASE}banners/exclusive/v1/kerubim.webp` },
  { slug: 'julith',   threshold: 30,  nameKey: 'exclusive_julith_name',
    avatarPath: `${BASE}avatars/exclusive/v1/julith.webp`,   bannerPath: `${BASE}banners/exclusive/v1/julith.webp` },
  { slug: 'goultard', threshold: 100, nameKey: 'exclusive_goultard_name',
    avatarPath: `${BASE}avatars/exclusive/v1/goultard.webp`, bannerPath: `${BASE}banners/exclusive/v1/goultard.webp` },
  { slug: 'ogrest',   threshold: 365, nameKey: 'exclusive_ogrest_name',
    avatarPath: `${BASE}avatars/exclusive/v1/ogrest.webp`,   bannerPath: `${BASE}banners/exclusive/v1/ogrest.webp` },
] as const

const BY_SLUG = new Map(EXCLUSIVE_REWARDS.map(r => [r.slug, r]))

export function exclusiveRewardOf(slug: string | null | undefined): ExclusiveReward | undefined {
  return slug ? BY_SLUG.get(slug) : undefined
}

/** The avatar/banner URL to actually render — the exclusive pick wins over
 * the regular catalog choice when both are set (mutually exclusive in the
 * account UI, but resolved defensively here too). */
export function effectiveAvatarUrl(avatarUrl: string | null, exclusiveAvatarSlug: string | null | undefined): string | null {
  return exclusiveRewardOf(exclusiveAvatarSlug)?.avatarPath ?? avatarUrl
}
export function effectiveBannerUrl(bannerUrl: string | null, exclusiveBannerSlug: string | null | undefined): string | null {
  return exclusiveRewardOf(exclusiveBannerSlug)?.bannerPath ?? bannerUrl
}
