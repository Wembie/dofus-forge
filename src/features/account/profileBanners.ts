const locations = ['bonta', 'brakmar', 'astrub', 'incarnam', 'amakna', 'sufokia', 'pandala', 'frigost', 'anutropia', 'sramvil', 'zurcalia', 'xelorium', 'moon', 'wabbits', 'otomai', 'vulkania', 'tainela', 'koalaks', 'abraknid', 'minotoror', 'osavora', 'saharach', 'sarakech', 'albuera', 'ereboria', 'nawidad', 'pazcuak', 'dragocerdo'] as const

export const PROFILE_BANNERS = locations.map(id => ({
  id,
  url: `${import.meta.env.BASE_URL}banners/locations/v1/${id}.webp`,
}))

const urls = new Set(PROFILE_BANNERS.map(b => b.url))

export function isProfileBannerUrl(url: string | null | undefined): url is string {
  return !!url && urls.has(url)
}
