import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import i18next from 'i18next'

const LANGS = ['es', 'en', 'fr', 'pt'] as const
const ROOT = join(__dirname, '..', '..', '..')
const dicts = Object.fromEntries(
  LANGS.map(l => [l, JSON.parse(readFileSync(join(ROOT, 'public', 'locales', l, 'translation.json'), 'utf8')) as Record<string, string>]),
)

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap(name => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return name === '__tests__' ? [] : sourceFiles(path)
    return /\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : []
  })
}

describe('locales', () => {
  it('every literal t(\'key\') used in src exists in all four languages (or as plural forms)', () => {
    const keys = new Set<string>()
    for (const file of sourceFiles(join(ROOT, 'src'))) {
      for (const m of readFileSync(file, 'utf8').matchAll(/\bt\(\s*['"]([a-z0-9_]+)['"]/g)) keys.add(m[1])
    }
    expect(keys.size).toBeGreaterThan(100)
    const missing: string[] = []
    for (const key of keys) {
      for (const lang of LANGS) {
        const d = dicts[lang]
        if (d[key] == null && d[`${key}_one`] == null && d[`${key}_other`] == null) missing.push(`${lang}: ${key}`)
      }
    }
    expect(missing).toEqual([])
  })

  it('all four languages have the same keys', () => {
    const base = Object.keys(dicts.es).sort()
    for (const lang of LANGS) expect(Object.keys(dicts[lang]).sort(), lang).toEqual(base)
  })

  it('collection build counts use singular / plural forms', async () => {
    const i18n = i18next.createInstance()
    await i18n.init({ lng: 'es', resources: { es: { translation: dicts.es }, en: { translation: dicts.en } } })
    expect(i18n.t('collections_builds_count', { count: 1 })).toBe('1 build')
    expect(i18n.t('collections_builds_count', { count: 3 })).toBe('3 builds')
    expect(i18n.t('collections_builds_count', { count: 1, lng: 'en' })).toBe('1 build')
  })
})
