const BASE = import.meta.env.BASE_URL

export const EXCLUSIVE_SLUGS = [
  'kerubim', 'joris', 'atcham', 'julith', 'bakara', 'jahash', 'otomai',
  'bakara_tipsy', 'goultard', 'bakara_drunk_book', 'dathura',
  'bakara_drunk_lecture', 'djaul', 'bakara_drunk_toast', 'jiva', 'ogrest',
] as const

export type ExclusiveSlug = (typeof EXCLUSIVE_SLUGS)[number]
const knownSlugs: ReadonlySet<string> = new Set(EXCLUSIVE_SLUGS)

export function exclusiveAssetPaths(slug: ExclusiveSlug) {
  const file = slug.replace(/_/g, '-')
  return { avatarPath: `${BASE}avatars/exclusive/v1/${file}.webp`, bannerPath: `${BASE}banners/exclusive/v1/${file}.webp` }
}

export function isExclusiveAvatarUrl(url: string): boolean {
  return EXCLUSIVE_SLUGS.some(slug => exclusiveAssetPaths(slug).avatarPath === url)
}

export function isExclusiveBannerUrl(url: string): boolean {
  return EXCLUSIVE_SLUGS.some(slug => exclusiveAssetPaths(slug).bannerPath === url)
}

function knownReward(slug: string | null | undefined) {
  return slug && knownSlugs.has(slug) ? exclusiveAssetPaths(slug as ExclusiveSlug) : undefined
}

export function effectiveAvatarUrl(avatarUrl: string | null, slug: string | null | undefined): string | null {
  return knownReward(slug)?.avatarPath ?? avatarUrl
}

export function effectiveBannerUrl(bannerUrl: string | null, slug: string | null | undefined): string | null {
  return knownReward(slug)?.bannerPath ?? bannerUrl
}

export function resolveProfileAvatar<T extends { avatar_url: string | null; exclusive_avatar_slug?: string | null }>(profile: T): T {
  return { ...profile, avatar_url: effectiveAvatarUrl(profile.avatar_url, profile.exclusive_avatar_slug) }
}
