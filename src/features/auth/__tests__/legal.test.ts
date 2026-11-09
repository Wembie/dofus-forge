import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { LEGAL_DOCS, LEGAL_VERSIONS, isLegalPage, legalAcceptance, pendingLegalDocs } from '../legal.ts'

const ROOT = join(__dirname, '..', '..', '..', '..')
const user = (meta: Record<string, unknown>) => ({ user_metadata: meta })

describe('legal acceptance', () => {
  it('records the current version and time of each accepted document', () => {
    const now = new Date('2026-11-09T12:00:00Z')
    expect(legalAcceptance(['terms', 'privacy'], now)).toEqual({
      terms_version: LEGAL_VERSIONS.terms,
      terms_accepted_at: '2026-11-09T12:00:00.000Z',
      privacy_version: LEGAL_VERSIONS.privacy,
      privacy_accepted_at: '2026-11-09T12:00:00.000Z',
    })
    expect(legalAcceptance(['privacy'], now)).not.toHaveProperty('terms_version')
  })

  it('asks accounts created before the checkboxes to accept both documents', () => {
    expect(pendingLegalDocs(user({ username: 'old' }))).toEqual(['terms', 'privacy'])
  })

  it('asks again only for the document whose version changed', () => {
    expect(pendingLegalDocs(user({ ...legalAcceptance(LEGAL_DOCS), privacy_version: '2000-01-01' }))).toEqual(['privacy'])
    expect(pendingLegalDocs(user(legalAcceptance(LEGAL_DOCS)))).toEqual([])
  })

  it('never covers the legal pages it links to, in any language', () => {
    for (const path of ['/terms', '/privacy', '/es/terms', '/fr/privacy', '/pt/terms/', '/es/privacy']) expect(isLegalPage(path), path).toBe(true)
    for (const path of ['/', '/es', '/explore', '/es/explore', '/account', '/u/terms', '/build/privacy']) expect(isLegalPage(path), path).toBe(false)
  })

  it('never blocks signed-out visitors', () => {
    expect(pendingLegalDocs(null)).toEqual([])
    expect(pendingLegalDocs(undefined)).toEqual([])
  })

  it('every locale has a consent label with a link for each document', () => {
    for (const lang of ['es', 'en', 'fr', 'pt']) {
      const json = JSON.parse(readFileSync(join(ROOT, 'public', 'locales', lang, 'translation.json'), 'utf8'))
      for (const doc of LEGAL_DOCS) expect(json[`consent_${doc}_label`], `${lang} ${doc}`).toMatch(/<anchor>[^<]+<\/anchor>/)
    }
  })

  it('the legal pages render every section that has a translation, and no more', () => {
    for (const [page, key] of [['TermsPage', 'terms'], ['PrivacyPolicyPage', 'privacy']]) {
      const source = readFileSync(join(ROOT, 'src', 'pages', `${page}.tsx`), 'utf8')
      const count = Number(source.match(/length: (\d+)/)![1])
      for (const lang of ['es', 'en', 'fr', 'pt']) {
        const json = JSON.parse(readFileSync(join(ROOT, 'public', 'locales', lang, 'translation.json'), 'utf8'))
        const sections = Object.keys(json).filter(k => new RegExp(`^${key}_s\\d+_body$`).test(k)).length
        expect(sections, `${lang} ${key}`).toBe(count)
      }
    }
  })
})
