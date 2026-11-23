import { describe, expect, it } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { PROFILE_BANNERS, isProfileBannerUrl } from './profileBanners.ts'

describe('approved profile banner catalog', () => {
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
})
