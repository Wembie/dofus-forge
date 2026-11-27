import { describe, it, expect } from 'vitest'
import { EXCLUSIVE_REWARDS, exclusiveRewardOf, effectiveAvatarUrl, effectiveBannerUrl } from '../exclusiveRewards.ts'

describe('EXCLUSIVE_REWARDS', () => {
  it('has exactly the 4 approved characters, matching the frame milestones', () => {
    expect(EXCLUSIVE_REWARDS.map(r => r.slug)).toEqual(['kerubim', 'julith', 'goultard', 'ogrest'])
    expect(EXCLUSIVE_REWARDS.map(r => r.threshold)).toEqual([7, 30, 100, 365])
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

  it('an unknown slug never breaks resolution — falls back to the regular pick', () => {
    expect(effectiveAvatarUrl('/avatars/classes/v1/iop-m.webp', 'not-a-real-slug')).toBe('/avatars/classes/v1/iop-m.webp')
  })
})
