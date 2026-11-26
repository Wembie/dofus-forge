import { describe, expect, it } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { PROFILE_BANNERS, isProfileBannerUrl } from './profileBanners.ts'
import { PROFILE_BANNER_GROUPS, PROFILE_BANNER_OPTIONS } from './profileAppearanceCatalog.ts'

describe('approved profile banner catalog', () => {
  it('gives every landscape one browsing category and localizes the appearance gallery', () => {
    const mapped = PROFILE_BANNER_GROUPS.flatMap(group => [...group.locations])
    expect(new Set(mapped).size).toBe(mapped.length)
    expect([...mapped].sort()).toEqual(PROFILE_BANNERS.map(b => b.id).sort())
    expect(PROFILE_BANNER_OPTIONS.map(b => b.url)).toEqual(PROFILE_BANNERS.map(b => b.url))
    for (const b of PROFILE_BANNER_OPTIONS) expect(PROFILE_BANNER_GROUPS.some(g => g.id === b.category)).toBe(true)
    for (const lang of ['es', 'en', 'fr', 'pt']) {
      const strings = JSON.parse(readFileSync(`public/locales/${lang}/translation.json`, 'utf8'))
      for (const key of ['appearance_title', 'appearance_apply', 'appearance_pending', 'appearance_new', 'appearance_preview', 'appearance_class', 'appearance_gender', 'appearance_face', 'appearance_empty_title', 'appearance_empty_hint', 'appearance_clear', 'appearance_save_hint', 'appearance_category_all', ...PROFILE_BANNER_GROUPS.map(g => `appearance_category_${g.id}`)]) expect(strings[key]?.length, `${lang}:${key}`).toBeGreaterThan(0)
    }
  })
  it('keeps shipped artwork, browser choices and the server allowlist identical', () => {
    const manifest = JSON.parse(readFileSync('docs/brand/profile-banners/manifest.json', 'utf8')) as { banners: { asset: string }[] }
    const schema = readFileSync('supabase/schema.sql', 'utf8')
    const paths = [...new Set([...schema.matchAll(/\('(\/banners\/locations\/[^']+\.webp)'\)/g)].map(m => m[1]))]
    expect(paths.sort()).toEqual(PROFILE_BANNERS.map(b => b.url).sort())
    expect(manifest.banners.map(b => b.asset).sort()).toEqual(PROFILE_BANNERS.map(b => `public${b.url}`).sort())
    for (const b of PROFILE_BANNERS) {
      expect(existsSync(`public${b.url}`), b.url).toBe(true)
      expect(isProfileBannerUrl(b.url)).toBe(true)
    }
  })

  it.each([null, undefined, '', 'https://tracker.example/banner.png', '//tracker.example/banner.png', '/banners/locations/v1/unknown.webp', '/banners/locations/v1/bonta.webp?x=1', '/banners/locations/v1/../bonta.webp', '/banners/locations/v1/bonta.webp#x'])('rejects unapproved banner URLs: %s', url => {
    expect(isProfileBannerUrl(url)).toBe(false)
  })

  it('provides every banner label and action in all four languages', () => {
    const keys = ['account_banner_back', 'account_banner_title', 'account_banner_hint', 'account_banner_change', 'account_banner_none', 'account_banner_remove', 'account_banner_use', 'account_banner_profile_preview', 'account_banner_inspect_hint', 'account_banner_search', 'account_banner_empty', 'account_banner_view', 'account_banner_selected', 'profile_banner_view', 'profile_banner_title', ...PROFILE_BANNERS.map(b => `profile_banner_location_${b.id}`)]
    for (const lang of ['es', 'en', 'fr', 'pt']) {
      const strings = JSON.parse(readFileSync(`public/locales/${lang}/translation.json`, 'utf8'))
      for (const key of keys) expect(strings[key]?.length, `${lang}:${key}`).toBeGreaterThan(0)
    }
  })

  it('preserves unique artwork and pins current-client additions to installed 3.7 map assets', () => {
    const manifest = JSON.parse(readFileSync('docs/brand/profile-banners/manifest.json', 'utf8')) as {
      banners: { id: string; asset: string; sha256: string; width: number; height: number; prompt: string; sourceClientVersion?: string; references: { role: string; mapId?: number; sourceClientVersion?: string; mapBundle?: string; sourceMapBundleSha256?: string; sha256?: string; renderer?: string }[] }[]
    }
    expect(new Set(manifest.banners.map(b => b.sha256)).size).toBe(PROFILE_BANNERS.length)
    for (const banner of manifest.banners) {
      expect(createHash('sha256').update(readFileSync(banner.asset)).digest('hex')).toBe(banner.sha256)
      expect([banner.width, banner.height]).toEqual([1920, 640])
    }
    const current = manifest.banners.filter(b => b.sourceClientVersion)
    expect(current.map(b => b.id)).toEqual(['moon', 'wabbits', 'otomai', 'vulkania', 'tainela', 'koalaks', 'abraknid', 'minotoror', 'osavora', 'saharach', 'sarakech', 'albuera', 'ereboria', 'nawidad', 'pazcuak', 'dragocerdo', 'amakna-castle', 'trool-fair', 'dragoeuf', 'nimotopia', 'akwadala', 'feudala', 'terrdala', 'aerdala', 'evil-forest', 'cania-lake', 'gisgoul', 'bwork-village', 'zoth-village', 'mount-torrid', 'buried-village', 'castaway-island', 'kontatras-castle', 'grobe', 'kefriho', 'petrified-forest', 'kanig-village', 'merkator', 'dramak', 'obscure-dimension'])
    for (const banner of current) {
      expect(banner.sourceClientVersion).toBe('3.7.14.18')
      expect(banner.prompt).toContain('DOFUS 3.7')
      expect(banner.prompt).toContain('3.7.14.18')
      const maps = banner.references.filter(r => r.mapId !== undefined)
      expect(maps.length).toBeGreaterThan(0)
      for (const ref of maps) {
        expect(ref.sourceClientVersion).toBe(banner.sourceClientVersion)
        expect(ref.mapBundle).toBe(`Map/Data/mapdata_assets_world_${ref.mapId! >> 18}.bundle`)
        expect(ref.sourceMapBundleSha256).toMatch(/^[a-f0-9]{64}$/)
        expect(ref.sha256).toMatch(/^[a-f0-9]{64}$/)
        expect(ref.renderer).toBe('scripts/render-banner-references.py')
      }
    }
  })
})
