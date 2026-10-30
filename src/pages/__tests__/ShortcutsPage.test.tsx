// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import '@/test/i18n.ts'

vi.mock('@/components/SiteHeader.tsx', () => ({ SiteHeader: () => null }))
vi.mock('@/components/SiteFooter.tsx', () => ({ SiteFooter: () => null }))

const { ShortcutsPage } = await import('../ShortcutsPage.tsx')

afterEach(cleanup)

const ROOT = join(__dirname, '..', '..', '..')
const locale = (lang: string) => JSON.parse(readFileSync(join(ROOT, 'public', 'locales', lang, 'translation.json'), 'utf8')) as Record<string, string>

function renderPage() {
  return render(<MemoryRouter><ShortcutsPage /></MemoryRouter>)
}

describe('ShortcutsPage', () => {
  it('every text it shows exists, non-empty, in all four languages', () => {
    const { container } = renderPage()
    const used = new Set<string>()
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT)
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const text = n.textContent!.trim()
      if (text.startsWith('shortcuts_')) used.add(text)
    }
    expect(used.size).toBeGreaterThan(20)
    for (const lang of ['es', 'en', 'fr', 'pt']) {
      const json = locale(lang)
      const missing = [...used].filter(k => !json[k]?.trim())
      expect(missing, lang).toEqual([])
    }
  })

  it('has one h1, a heading per group and both CTA links', () => {
    renderPage()
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(3)
    expect(screen.getByRole('link', { name: 'shortcuts_cta_start' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'shortcuts_cta_howto' })).toBeTruthy()
  })

  it('is linked from the footer, the header, the builder page and the sitemap in every language', () => {
    const read = (p: string) => readFileSync(join(ROOT, p), 'utf8')
    expect(read('src/components/SiteFooter.tsx')).toContain('shortcuts')
    expect(read('src/components/SiteHeader.tsx')).toContain('shortcuts')
    expect(read('src/pages/BuilderPage.tsx')).toContain('shortcuts')
    const sitemap = read('public/sitemap.xml')
    for (const path of ['', 'es/', 'fr/', 'pt/']) expect(sitemap).toContain(`<loc>https://dofusforge.com/${path}shortcuts</loc>`)
    expect(read('scripts/postbuild-lang-pages.mjs')).toContain("generateRoute('shortcuts'")
    expect(read('scripts/prerender-content.mjs')).toContain("'shortcuts'")
  })
})
