import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { SECURITY_HEADERS, withSecurityHeaders } from '../securityHeaders.ts'

/** Header rules by path pattern: a pattern starts a line, its headers are indented. */
function parseHeadersFile(): Record<string, Record<string, string>> {
  const text = readFileSync(resolve(__dirname, '../../../public/_headers'), 'utf8')
  const rules: Record<string, Record<string, string>> = {}
  let current: Record<string, string> = {}
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim() || line.startsWith('#')) continue
    if (!/^\s/.test(line)) {
      rules[line.trim()] = current = {}
      continue
    }
    const i = line.indexOf(':')
    current[line.slice(0, i).trim()] = line.slice(i + 1).trim()
  }
  return rules
}

describe('security headers', () => {
  it('static assets (public/_headers) and Worker responses send the same set', () => {
    expect(parseHeadersFile()['/*']).toEqual(SECURITY_HEADERS)
  })

  it('caches content-hashed build files for a year, and nothing else that long', () => {
    const rules = parseHeadersFile()
    expect(rules['/assets/*']).toEqual({ 'Cache-Control': 'public, max-age=31536000, immutable' })
    for (const [pattern, headers] of Object.entries(rules)) {
      if (pattern !== '/assets/*') expect(headers['Cache-Control'] ?? '').not.toContain('immutable')
    }
  })

  it('every _headers line fits Cloudflare\'s 2,000 character limit', () => {
    const text = readFileSync(resolve(__dirname, '../../../public/_headers'), 'utf8')
    for (const line of text.split(/\r?\n/)) expect(line.length).toBeLessThanOrEqual(2000)
  })

  it('forbids framing by other sites and object embeds', () => {
    const csp = SECURITY_HEADERS['Content-Security-Policy-Report-Only']
    expect(csp).toContain("frame-ancestors 'self'")
    expect(csp).toContain("object-src 'none'")
    expect(SECURITY_HEADERS['X-Frame-Options']).toBe('SAMEORIGIN')
  })

  it('keeps status and body while adding the headers', async () => {
    const res = withSecurityHeaders(new Response('x', { status: 404, headers: { 'Content-Type': 'text/plain' } }))
    expect(res.status).toBe(404)
    expect(res.headers.get('Content-Type')).toBe('text/plain')
    expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff')
    expect(await res.text()).toBe('x')
  })
})
