import { describe, expect, it } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { CLASS_DATA } from '@/features/class-picker/classData.ts'
import { isSafeImageUrl } from '@/store/authStore.ts'
import { AVATAR_HEAD_SLOTS, CLASS_AVATARS, isClassAvatarUrl } from './classAvatars.ts'

describe('class profile portraits', () => {
  it('ships both distinct image files for every supported class', () => {
    expect(CLASS_AVATARS).toHaveLength(CLASS_DATA.length * 2 * AVATAR_HEAD_SLOTS.length)
    expect(new Set(CLASS_AVATARS.map(a => a.url)).size).toBe(CLASS_AVATARS.length)
    for (const cls of CLASS_DATA) {
      for (const headSlot of AVATAR_HEAD_SLOTS) {
        expect(CLASS_AVATARS.filter(a => a.classId === cls.id && a.headSlot === headSlot).map(a => a.gender)).toEqual(['male', 'female'])
      }
    }
    for (const avatar of CLASS_AVATARS) expect(existsSync(`public${avatar.url}`), avatar.url).toBe(true)
  })

  it('only permits the exact bundled portrait paths as profile images', () => {
    for (const avatar of CLASS_AVATARS) {
      expect(isClassAvatarUrl(avatar.url)).toBe(true)
      expect(isSafeImageUrl(avatar.url)).toBe(true)
    }
    for (const url of [
      'https://tracker.example/avatar.webp',
      'http://tracker.example/avatar.webp',
      'https://dofusforge.com/avatars/classes/v1/iop-m.webp',
      '//tracker.example/avatar.png',
      '/avatars/classes/v1/unknown-m.webp',
      '/avatars/classes/v1/iop-look-3-m.webp',
      '/avatars/classes/v1/iop-look-02-m.webp',
      '/avatars/classes/v2/iop-m.webp',
      '/avatars/classes/v1/iop-m.webp?redirect=1',
      '/avatars/classes/v1/iop-m.webp#fragment',
      '/avatars/classes/v1/../iop-m.webp',
      '/avatars/classes/v1/%69op-m.webp',
      '/other-image.svg', 'data:image/svg+xml,evil', 'javascript:alert(1)', '',
    ]) {
      expect(isClassAvatarUrl(url), url).toBe(false)
      expect(isSafeImageUrl(url), url).toBe(false)
    }
    expect(isSafeImageUrl(null)).toBe(false)
    expect(isSafeImageUrl(undefined)).toBe(false)
  })

  it('provides the entire picker vocabulary in every locale', () => {
    for (const lang of ['es', 'en', 'fr', 'pt']) {
      const strings = JSON.parse(readFileSync(`public/locales/${lang}/translation.json`, 'utf8'))
      for (const key of ['account_avatar_title', 'account_avatar_hint', 'account_avatar_default', 'account_avatar_option', 'account_avatar_done', 'account_save_error', 'auth_avatar_change', 'gender_male', 'gender_female', 'account_avatar_view', 'account_avatar_back', 'account_avatar_full', 'account_avatar_crop', 'account_avatar_use', 'account_avatar_search', 'account_avatar_empty', 'account_avatar_current', 'account_avatar_inspect_hint']) {
        expect(typeof strings[key], `${lang}:${key}`).toBe('string')
        expect(strings[key].length, `${lang}:${key}`).toBeGreaterThan(0)
      }
      for (const key of ['profile_avatar_view', 'profile_avatar_title']) {
        expect(strings[key], `${lang}:${key}`).toContain('{{username}}')
      }
    }
  })

  it('keeps the server allowlist identical to the shipped collection', () => {
    const migration = ['20261122000000_profile_avatar_catalog.sql', '20261123020000_profile_avatar_second_heads.sql'].map(name => readFileSync(`supabase/migrations/${name}`, 'utf8')).join('\n')
    const paths = [...migration.matchAll(/\('([^']+\.webp)'\)/g)].map(m => m[1])
    expect(paths.sort()).toEqual(CLASS_AVATARS.map(a => a.url).sort())
  })

  it('preserves a distinct generation prompt for each shipped portrait and a reusable template', () => {
    const manifest = JSON.parse(readFileSync('docs/brand/profile-avatars/manifest.json', 'utf8')) as {
      avatars: { classId: string; gender: string; asset: string; prompt: string; pose: string; gameLook: { headSlot: number; headId: number; headSkin: number; bodySlot: number; bodyId: number; bodySkin: number } }[]
    }
    expect(manifest.avatars).toHaveLength(CLASS_AVATARS.length)
    expect(new Set(manifest.avatars.map(a => a.prompt)).size).toBe(CLASS_AVATARS.length)
    for (const avatar of CLASS_AVATARS) {
      const record = manifest.avatars.find(a => a.classId === avatar.classId && a.gender === avatar.gender && a.gameLook.headSlot === avatar.headSlot)
      expect(record?.asset).toBe(`public${avatar.url}`)
      expect(record?.prompt.length).toBeGreaterThan(400)
      expect(record?.pose.length).toBeGreaterThan(10)
    }
    const template = JSON.parse(readFileSync('docs/brand/profile-avatars/prompt-template.json', 'utf8'))
    expect(template.prompt).toContain('{{individualPose}}')
    expect(template.prompt).toContain('{{identityNotes}}')
    expect(existsSync(template.approvedStyleReference)).toBe(true)
  })

  it('maps every finished portrait to a real head and the default outfit', () => {
    const manifest = JSON.parse(readFileSync('docs/brand/profile-avatars/manifest.json', 'utf8')) as {
      avatars: { classId: string; gender: string; asset: string; sha256: string; gameLook: { headSlot: number; headId: number; headSkin: number; bodySlot: number; bodyId: number; bodySkin: number } }[]
    }
    const inventory = JSON.parse(readFileSync('docs/brand/profile-avatars/game-looks.json', 'utf8')) as {
      looks: { classId: string; gender: string; heads: { slot: number; id: number; skin: number }[]; bodies: { slot: number; id: number; skin: number }[] }[]
    }
    expect(new Set(manifest.avatars.map(a => a.sha256)).size).toBe(CLASS_AVATARS.length)
    for (const record of manifest.avatars) {
      const model = inventory.looks.find(r => r.classId === record.classId && r.gender === record.gender)!
      expect(model.heads.find(h => h.slot === record.gameLook.headSlot)).toMatchObject({ id: record.gameLook.headId, skin: record.gameLook.headSkin })
      expect(model.bodies[0]).toMatchObject({ slot: record.gameLook.bodySlot, id: record.gameLook.bodyId, skin: record.gameLook.bodySkin })
      expect(createHash('sha256').update(readFileSync(record.asset)).digest('hex')).toBe(record.sha256)
    }
    for (const lang of ['es', 'en', 'fr', 'pt']) {
      const strings = JSON.parse(readFileSync(`public/locales/${lang}/translation.json`, 'utf8'))
      for (const key of ['account_avatar_gender_look', 'account_avatar_head_slot']) expect(strings[key]).toContain('{{number}}')
    }
  })
})
