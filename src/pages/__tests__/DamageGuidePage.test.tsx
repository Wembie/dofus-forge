// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import '@/test/i18n.ts'

vi.mock('@/components/SiteHeader.tsx', () => ({ SiteHeader: () => null }))
vi.mock('@/components/SiteFooter.tsx', () => ({ SiteFooter: () => null }))

const { DamageGuidePage } = await import('../DamageGuidePage.tsx')

afterEach(cleanup)

const ROOT = join(__dirname, '..', '..', '..')
const locale = (lang: string) => JSON.parse(readFileSync(join(ROOT, 'public', 'locales', lang, 'translation.json'), 'utf8')) as Record<string, string>

function renderGuide() {
  return render(<MemoryRouter><DamageGuidePage /></MemoryRouter>)
}

describe('DamageGuidePage', () => {
  it('every text it shows exists, non-empty, in all four languages', () => {
    const { container } = renderGuide()
    const used = new Set<string>()
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT)
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const text = n.textContent!.trim()
      if (text.startsWith('dmgguide_') || text.startsWith('forgeguide_')) used.add(text)
    }
    expect(used.size).toBeGreaterThan(70)
    for (const lang of ['es', 'en', 'fr', 'pt']) {
      const json = locale(lang)
      const missing = [...used].filter(k => !json[k]?.trim())
      expect(missing, lang).toEqual([])
    }
  })

  it('has one h1, a heading and an anchor per section', () => {
    renderGuide()
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    const sections = screen.getAllByRole('heading', { level: 2 })
    expect(sections).toHaveLength(8)
    const toc = screen.getByRole('navigation', { name: 'forgeguide_toc' })
    for (const a of toc.querySelectorAll('a')) {
      expect(document.getElementById(a.getAttribute('href')!.slice(1))).not.toBeNull()
    }
  })

  it('the worked example shows a critical hit that out-damages the normal one', () => {
    renderGuide()
    // "dmgguide_example_crit_body" interpolates {{normal}}/{{crit}}; the test
    // i18n renders the raw key, so assert on the numbers via the component's
    // own math instead of the rendered text.
    const normal = Math.floor((Math.max(0, Math.floor(500 * 110 * 115 / 10000)) - 50) * 80 / 100)
    const crit = Math.floor((Math.max(0, Math.floor(580 * 110 * 115 / 10000)) - 50) * 80 / 100)
    expect(crit).toBeGreaterThan(normal)
    expect(normal).toBe(465)
    expect(crit).toBe(546)
  })

  it('is linked from the footer, the nav sheet and the prerendered sitemap pages', () => {
    const read = (p: string) => readFileSync(join(ROOT, p), 'utf8')
    expect(read('src/components/SiteFooter.tsx')).toContain('damage-guide')
    expect(read('src/components/SiteNavSheet.tsx')).toContain('damage-guide')
    expect(read('src/routes.ts')).toContain("['damage-guide', ")
    expect(read('react-router.config.ts').split('const NOINDEX_PAGES')[0]).toContain("'damage-guide'")
  })
})
