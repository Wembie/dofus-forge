import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { SECURITY_HEADERS, withSecurityHeaders } from '../securityHeaders.ts'

function parseHeadersFile(): Record<string, string> {
  const text = readFileSync(resolve(__dirname, '../../../public/_headers'), 'utf8')
  const lines = text.split('\n').filter(l => l.trim() && !l.startsWith('#'))
  expect(lines[0]).toBe('/*')
  return Object.fromEntries(lines.slice(1).map(l => {
    const i = l.indexOf(':')
    return [l.slice(0, i).trim(), l.slice(i + 1).trim()]
  }))
}

describe('security headers', () => {
  it('static assets (public/_headers) and Worker responses send the same set', () => {
    expect(parseHeadersFile()).toEqual(SECURITY_HEADERS)
  })

  it('every _headers line fits Cloudflare\'s 2,000 character limit', () => {
    const text = readFileSync(resolve(__dirname, '../../../public/_headers'), 'utf8')
    for (const line of text.split('\n')) expect(line.length).toBeLessThanOrEqual(2000)
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
