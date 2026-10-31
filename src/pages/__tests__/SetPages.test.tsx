// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import '@/test/i18n.ts'
import type { SetLink } from '@/data/setGuide.ts'

vi.mock('@/components/SiteHeader.tsx', () => ({ SiteHeader: () => null }))
vi.mock('@/components/SiteFooter.tsx', () => ({ SiteFooter: () => null }))
vi.mock('@/data/setPages.server.ts', () => ({ loadSetPage: vi.fn(), loadSetsIndex: vi.fn() }))

const loaderData = vi.hoisted(() => ({ current: null as unknown }))
vi.mock('react-router', async importOriginal => ({
  ...await importOriginal<typeof import('react-router')>(),
  useLoaderData: () => loaderData.current,
}))

const { SetPage } = await import('../SetPage.tsx')
const { SetsPage } = await import('../SetsPage.tsx')

afterEach(cleanup)

const ROOT = join(__dirname, '..', '..', '..')
const locale = (lang: string) => JSON.parse(readFileSync(join(ROOT, 'public', 'locales', lang, 'translation.json'), 'utf8')) as Record<string, string>

const link = (id: number, slug: string, level: number): SetLink => ({ id, slug, name: `Set ${id}`, level, pieces: 3, icon: null, elements: ['earth'], classId: null })

const SET_PAGE = {
  set: { ...link(1, 'gobball-set', 20), classId: 'iop' },
  items: [
    { ankama_id: 10, name: 'Gobball Hat', level: 20, type: 'Hat', slot: 'hat', effects: [{ stat: 'Strength', min: 10, max: 15 }], image_url: null, description: 'Woolly.', conditions: [{ stat: 'Strength', operator: '>', value: 50 }] },
    { ankama_id: 11, name: 'Gobball Cape', level: 18, type: 'Cloak', slot: 'cape', effects: [{ stat: 'Vitality', min: 20, max: 0 }], image_url: null },
  ],
  tiers: [{ pieces: 2, effects: [{ stat: 'AP', min: 1, max: 0 }] }],
  totals: [{ stat: 'AP', value: 1 }, { stat: 'Strength', value: 15 }],
  related: [link(2, 'other-set', 22)],
  builds: [],
}

/** Every translation key a render shows (the test i18n renders keys as text). */
function usedKeys(container: HTMLElement, prefixes: string[]) {
  const used = new Set<string>()
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT)
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    for (const word of n.textContent!.split(/\s+/)) if (prefixes.some(p => word.startsWith(p))) used.add(word.replace(/[^a-z_]/g, ''))
  }
  return used
}

function expectInAllLocales(keys: Set<string>) {
  for (const lang of ['es', 'en', 'fr', 'pt']) {
    const json = locale(lang)
    // A count-based key exists as its _one/_other plural forms.
    const missing = [...keys].filter(k => !json[k]?.trim() && !json[`${k}_other`]?.trim())
    expect(missing, lang).toEqual([])
  }
}

describe('SetPage', () => {
  it('renders the set, its tiers, items and related sets with one h1 and its structured data', () => {
    loaderData.current = SET_PAGE
    const { container } = render(<MemoryRouter><SetPage /></MemoryRouter>)
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(screen.getByRole('heading', { level: 3, name: 'Gobball Hat' })).toBeTruthy()
    expect(container.querySelector('a[href="/es?set=1"]')).toBeTruthy()
    expect(container.querySelector('a[href="/es/sets/other-set"]')).toBeTruthy()
    expect(container.querySelector('a[href="/es/classes/iop"]')).toBeTruthy()
    const ld = [...container.querySelectorAll('script[type="application/ld+json"]')].map(s => JSON.parse(s.textContent!) as { '@type': string })
    expect(ld.map(d => d['@type']).sort()).toEqual(['BreadcrumbList', 'ItemList'])
  })

  it('every text it shows exists in all four languages', () => {
    loaderData.current = SET_PAGE
    const { container } = render(<MemoryRouter><SetPage /></MemoryRouter>)
    const keys = usedKeys(container, ['set_page_', 'sets_'])
    expect(keys.size).toBeGreaterThan(10)
    expectInAllLocales(keys)
  })

  it('shows a not-found state for an unknown set', () => {
    loaderData.current = null
    render(<MemoryRouter><SetPage /></MemoryRouter>)
    expect(screen.getByText('set_page_not_found')).toBeTruthy()
  })
})

describe('SetsPage', () => {
  it('lists every set by level bracket and its texts exist in all four languages', () => {
    loaderData.current = { sets: [link(1, 'a-set', 200), link(2, 'b-set', 120), link(3, 'c-set', 12)] }
    const { container } = render(<MemoryRouter><SetsPage /></MemoryRouter>)
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(3)
    for (const slug of ['a-set', 'b-set', 'c-set']) expect(container.querySelector(`a[href="/es/sets/${slug}"]`)).toBeTruthy()
    expectInAllLocales(usedKeys(container, ['sets_']))
  })
})

describe('set pages wiring', () => {
  const read = (p: string) => readFileSync(join(ROOT, p), 'utf8')

  it('are routed, prerendered and linked from the site navigation', () => {
    expect(read('src/routes.ts')).toContain("['sets/:slug', ")
    expect(read('react-router.config.ts')).toContain('SET_SLUGS.map(slug => `sets/${slug}`)')
    expect(read('src/components/SiteFooter.tsx')).toContain('sets`')
    expect(read('src/components/SiteHeader.tsx')).toContain('sets`')
    expect(read('src/pages/BuilderPage.tsx')).toContain("navToLangPath('sets')")
  })
})
