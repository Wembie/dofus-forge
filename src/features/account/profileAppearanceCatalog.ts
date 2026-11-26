import { PROFILE_BANNERS } from './profileBanners.ts'

export const PROFILE_BANNER_GROUPS = [
  { id: 'cities', locations: ['bonta', 'brakmar', 'astrub', 'incarnam', 'amakna', 'sufokia', 'pandala', 'frigost', 'sarakech', 'albuera', 'amakna-castle', 'akwadala', 'feudala', 'terrdala', 'aerdala', 'bwork-village', 'zoth-village', 'buried-village', 'kanig-village'] },
  { id: 'nature', locations: ['otomai', 'tainela', 'koalaks', 'abraknid', 'nimotopia', 'evil-forest', 'cania-lake', 'mount-torrid', 'petrified-forest'] },
  { id: 'dimensions', locations: ['anutropia', 'sramvil', 'zurcalia', 'xelorium', 'obscure-dimension'] },
  { id: 'islands', locations: ['moon', 'wabbits', 'vulkania', 'osavora', 'nawidad', 'pazcuak', 'castaway-island', 'grobe', 'kefriho'] },
  { id: 'adventures', locations: ['minotoror', 'saharach', 'ereboria', 'dragocerdo', 'trool-fair', 'dragoeuf', 'gisgoul', 'kontatras-castle', 'merkator', 'dramak'] },
] as const

const latestLocations = new Set<string>(['kontatras-castle', 'grobe', 'kefriho', 'petrified-forest', 'kanig-village', 'merkator', 'dramak', 'obscure-dimension'])

export const PROFILE_BANNER_OPTIONS = PROFILE_BANNERS.map(b => ({
  ...b,
  category: PROFILE_BANNER_GROUPS.find(group => (group.locations as readonly string[]).includes(b.id))!.id,
  isNew: latestLocations.has(b.id),
}))
