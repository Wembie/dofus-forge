import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { EXCLUSIVE_REWARDS, exclusiveRewardOf, effectiveAvatarUrl, effectiveBannerUrl, nextExclusiveRewards } from '../exclusiveRewards.ts'

describe('EXCLUSIVE_REWARDS', () => {
  it('preserves the four original milestones while adding the approved expansion', () => {
    expect(EXCLUSIVE_REWARDS).toHaveLength(16)
    expect(['kerubim', 'julith', 'goultard', 'ogrest'].map(slug => exclusiveRewardOf(slug)?.threshold)).toEqual([7, 30, 100, 365])
    expect(EXCLUSIVE_REWARDS.filter(r => r.family === 'bakara').map(r => r.threshold)).toEqual([45, 90, 120, 180, 240])
  })

  it('ships every registered image, translation and database entitlement', () => {
    const schema = readFileSync('supabase/schema.sql', 'utf8')
    for (const lang of ['es', 'en', 'fr', 'pt']) {
      const strings = JSON.parse(readFileSync(`public/locales/${lang}/translation.json`, 'utf8'))
      for (const reward of EXCLUSIVE_REWARDS) {
        expect(strings[reward.nameKey]).toBeTruthy()
        expect(existsSync(`public${reward.avatarPath}`)).toBe(true)
        expect(existsSync(`public${reward.bannerPath}`)).toBe(true)
        expect(schema).toMatch(new RegExp(`\\('${reward.slug}',\\s*${reward.threshold},`))
      }
    }
  })

  it('returns both rewards at day 90, then advances to the next unearned milestone', () => {
    expect(nextExclusiveRewards(89).map(r => r.slug)).toEqual(['otomai', 'bakara_tipsy'])
    expect(nextExclusiveRewards(90).map(r => r.slug)).toEqual(['goultard'])
    expect(nextExclusiveRewards(365)).toEqual([])
  })

  it('every slug is unique and every path is distinct', () => {
    expect(new Set(EXCLUSIVE_REWARDS.map(r => r.slug)).size).toBe(EXCLUSIVE_REWARDS.length)
    expect(new Set(EXCLUSIVE_REWARDS.map(r => r.avatarPath)).size).toBe(EXCLUSIVE_REWARDS.length)
    expect(new Set(EXCLUSIVE_REWARDS.map(r => r.bannerPath)).size).toBe(EXCLUSIVE_REWARDS.length)
  })
})

describe('exclusiveRewardOf', () => {
  it('finds a known slug and returns undefined for anything else', () => {
    expect(exclusiveRewardOf('julith')?.threshold).toBe(30)
    expect(exclusiveRewardOf('nope')).toBeUndefined()
    expect(exclusiveRewardOf(null)).toBeUndefined()
    expect(exclusiveRewardOf(undefined)).toBeUndefined()
  })
})

describe('effectiveAvatarUrl / effectiveBannerUrl', () => {
  it('the exclusive pick wins over the regular catalog choice', () => {
    expect(effectiveAvatarUrl('/avatars/classes/v1/iop-m.webp', 'goultard')).toBe(exclusiveRewardOf('goultard')!.avatarPath)
    expect(effectiveBannerUrl('/banners/locations/v1/bonta.webp', 'ogrest')).toBe(exclusiveRewardOf('ogrest')!.bannerPath)
  })

  it('falls back to the regular pick when no exclusive is set', () => {
    expect(effectiveAvatarUrl('/avatars/classes/v1/iop-m.webp', null)).toBe('/avatars/classes/v1/iop-m.webp')
    expect(effectiveBannerUrl(null, undefined)).toBeNull()
  })

  it('resolves registered variant slugs without accepting paths or arbitrary URLs', () => {
    expect(effectiveAvatarUrl(null, 'bakara_drunk_book')).toBe('/avatars/exclusive/v1/bakara-drunk-book.webp')
    for (const slug of ['../ogrest', 'https://tracker.example/avatar.png', '__proto__']) {
      expect(effectiveAvatarUrl(null, slug)).toBeNull()
      expect(effectiveBannerUrl(null, slug)).toBeNull()
    }
  })

  it('an unknown slug never breaks resolution — falls back to the regular pick', () => {
    expect(effectiveAvatarUrl('/avatars/classes/v1/iop-m.webp', 'not-a-real-slug')).toBe('/avatars/classes/v1/iop-m.webp')
  })
})
