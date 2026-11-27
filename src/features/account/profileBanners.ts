const locations = ['bonta', 'brakmar', 'astrub', 'incarnam', 'amakna', 'sufokia', 'pandala', 'frigost', 'anutropia', 'sramvil', 'zurcalia', 'xelorium', 'moon', 'wabbits', 'otomai', 'vulkania', 'tainela', 'koalaks', 'abraknid', 'minotoror', 'osavora', 'saharach', 'sarakech', 'albuera', 'ereboria', 'nawidad', 'pazcuak', 'dragocerdo', 'amakna-castle', 'trool-fair', 'dragoeuf', 'nimotopia', 'akwadala', 'feudala', 'terrdala', 'aerdala', 'evil-forest', 'cania-lake', 'gisgoul', 'bwork-village', 'zoth-village', 'mount-torrid', 'buried-village', 'castaway-island', 'kontatras-castle', 'grobe', 'kefriho', 'petrified-forest', 'kanig-village', 'merkator', 'dramak', 'obscure-dimension', 'crocuzko', 'master-crow-library', 'giant-kralove', 'dopple-village', 'breeders-village', 'dantinea-palace', 'solar-tower', 'tortured-cemetery', 'bworker-cave', 'kimbo-canopy', 'tynril-lab', 'ougah-temple', 'royalmouth-greenhouse', 'obsidemon-hypogeum', 'bethel-tower', 'torkelonia-sanctuary'] as const

export const PROFILE_BANNERS = locations.map(id => ({
  id,
  url: `${import.meta.env.BASE_URL}banners/locations/v1/${id}.webp`,
}))

const urls = new Set(PROFILE_BANNERS.map(b => b.url))

export function isProfileBannerUrl(url: string | null | undefined): url is string {
  return !!url && urls.has(url)
}
