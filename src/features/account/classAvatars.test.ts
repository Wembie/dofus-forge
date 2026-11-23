import { describe, expect, it } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { CLASS_DATA } from '@/features/class-picker/classData.ts'
import { isSafeImageUrl } from '@/store/authStore.ts'
import { CLASS_AVATARS, isClassAvatarUrl } from './classAvatars.ts'

describe('class profile portraits', () => {
  it('ships both distinct image files for every supported class', () => {
    expect(CLASS_AVATARS).toHaveLength(CLASS_DATA.length * 2)
    expect(new Set(CLASS_AVATARS.map(a => a.url)).size).toBe(CLASS_AVATARS.length)
    for (const cls of CLASS_DATA) {
      expect(CLASS_AVATARS.filter(a => a.classId === cls.id).map(a => a.gender)).toEqual(['male', 'female'])
    }
    for (const avatar of CLASS_AVATARS) expect(existsSync(`public${avatar.url}`), avatar.url).toBe(true)
  })

  it('only permits the exact bundled portrait paths as local profile images', () => {
    for (const avatar of CLASS_AVATARS) {
      expect(isClassAvatarUrl(avatar.url)).toBe(true)
      expect(isSafeImageUrl(avatar.url)).toBe(true)
    }
    for (const url of ['/avatars/classes/v1/unknown-m.webp', '/avatars/classes/v1/iop-m.webp?redirect=1', '/avatars/classes/v1/../iop-m.webp', '//tracker.example/avatar.png', '/other-image.svg', 'data:image/svg+xml,evil', 'javascript:alert(1)', '']) {
      expect(isClassAvatarUrl(url), url).toBe(false)
      expect(isSafeImageUrl(url), url).toBe(false)
    }
    expect(isSafeImageUrl('https://example.com/existing-avatar.webp')).toBe(true)
    expect(isSafeImageUrl(null)).toBe(false)
  })

  it('provides the entire picker vocabulary in every locale', () => {
    for (const lang of ['es', 'en', 'fr', 'pt']) {
      const strings = JSON.parse(readFileSync(`public/locales/${lang}/translation.json`, 'utf8'))
      for (const key of ['account_avatar_title', 'account_avatar_hint', 'account_avatar_default', 'account_avatar_option', 'account_avatar_done', 'account_save_error', 'auth_avatar_change', 'gender_male', 'gender_female', 'account_avatar_view', 'account_avatar_back', 'account_avatar_full', 'account_avatar_crop', 'account_avatar_use', 'account_avatar_search', 'account_avatar_empty', 'account_avatar_current', 'account_avatar_inspect_hint']) {
        expect(typeof strings[key], `${lang}:${key}`).toBe('string')
        expect(strings[key].length, `${lang}:${key}`).toBeGreaterThan(0)
      }
    }
  })

  it('preserves a distinct generation prompt for each shipped portrait and a reusable template', () => {
    const manifest = JSON.parse(readFileSync('docs/brand/profile-avatars/manifest.json', 'utf8')) as {
      avatars: { classId: string; gender: string; asset: string; prompt: string; pose: string }[]
    }
    expect(manifest.avatars).toHaveLength(CLASS_AVATARS.length)
    expect(new Set(manifest.avatars.map(a => a.prompt)).size).toBe(CLASS_AVATARS.length)
    for (const avatar of CLASS_AVATARS) {
      const record = manifest.avatars.find(a => a.classId === avatar.classId && a.gender === avatar.gender)
      expect(record?.asset).toBe(`public${avatar.url}`)
      expect(record?.prompt.length).toBeGreaterThan(400)
      expect(record?.pose.length).toBeGreaterThan(10)
    }
    const template = JSON.parse(readFileSync('docs/brand/profile-avatars/prompt-template.json', 'utf8'))
    expect(template.prompt).toContain('{{individualPose}}')
    expect(template.prompt).toContain('{{identityNotes}}')
    expect(existsSync(template.approvedStyleReference)).toBe(true)
  })
})
