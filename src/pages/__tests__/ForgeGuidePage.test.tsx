// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import '@/test/i18n.ts'

vi.mock('@/components/SiteHeader.tsx', () => ({ SiteHeader: () => null }))
vi.mock('@/components/SiteFooter.tsx', () => ({ SiteFooter: () => null }))

const { ForgeGuidePage } = await import('../ForgeGuidePage.tsx')

afterEach(cleanup)

const ROOT = join(__dirname, '..', '..', '..')
const locale = (lang: string) => JSON.parse(readFileSync(join(ROOT, 'public', 'locales', lang, 'translation.json'), 'utf8')) as Record<string, string>

function renderGuide() {
  return render(<MemoryRouter><ForgeGuidePage /></MemoryRouter>)
}

describe('ForgeGuidePage', () => {
  it('every text it shows exists, non-empty, in all four languages', () => {
    const { container } = renderGuide()
    // Each t() call renders its own text node (the test i18n shows keys).
    const used = new Set<string>()
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT)
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const text = n.textContent!.trim()
      if (text.startsWith('forgeguide_')) used.add(text)
    }
    expect(used.size).toBeGreaterThan(80)
    for (const lang of ['es', 'en', 'fr', 'pt']) {
      const json = locale(lang)
      const missing = [...used].filter(k => !json[k]?.trim())
      expect(missing, lang).toEqual([])
    }
  })

  it('has one h1, a heading and an anchor per section, and links that open the forge', () => {
    renderGuide()
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    const sections = screen.getAllByRole('heading', { level: 2 })
    expect(sections).toHaveLength(9)
    const toc = screen.getByRole('navigation', { name: 'forgeguide_toc' })
    for (const a of toc.querySelectorAll('a')) {
      expect(document.getElementById(a.getAttribute('href')!.slice(1))).not.toBeNull()
    }
    const open = screen.getAllByRole('link', { name: /forgeguide_cta_open/ })
    expect(open.length).toBe(2)
    for (const a of open) expect(a.getAttribute('href')).toMatch(/\?forge=1$/)
  })

  it('the guide is linked from the footer, the order screen and the sitemap in every language', () => {
    const read = (p: string) => readFileSync(join(ROOT, p), 'utf8')
    expect(read('src/components/SiteFooter.tsx')).toContain('forge-guide')
    expect(read('src/features/optimizer/OptimizerModal.tsx')).toContain('forge-guide')
    const sitemap = read('public/sitemap.xml')
    for (const path of ['', 'es/', 'fr/', 'pt/']) expect(sitemap).toContain(`<loc>https://dofusforge.com/${path}forge-guide</loc>`)
    expect(read('src/routes.ts')).toContain("['forge-guide', ")
    expect(read('react-router.config.ts')).toContain("'forge-guide'")
  })
})
