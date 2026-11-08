import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { OG_BUCKET_NAME, OG_RENDER_VERSION, buildCardKey, pageCardKey, pageCardsCompleteKey } from '../ogRender.ts'

describe('share card storage', () => {
  it('scripts/og-pregenerate.ts uploads to the bucket the Worker reads (wrangler.jsonc OG_BUCKET)', () => {
    const config = readFileSync(join(__dirname, '..', '..', '..', 'wrangler.jsonc'), 'utf8')
    const bound = config.match(/\{\s*"binding"\s*:\s*"OG_BUCKET"\s*,\s*"bucket_name"\s*:\s*"([^"]+)"/)?.[1]
    expect(bound).toBe(OG_BUCKET_NAME)
  })

  it('keys carry the render version, so a design change never serves old cards', () => {
    expect(pageCardKey('3.7.1.0', 'es', 'set', 'gobball-set')).toBe(`v${OG_RENDER_VERSION}/pages/3.7.1.0/es/set/gobball-set.png`)
    expect(pageCardsCompleteKey('3.7.1.0')).toBe(`v${OG_RENDER_VERSION}/pages/3.7.1.0/_complete`)
  })

  it('a build card key changes with the build and ignores the id case', () => {
    const id = '26BA3A5B-43A7-4E5D-AE86-4ABB11865E4E'
    expect(buildCardKey(id, 'fr', '2026-10-01T00:00:00Z')).toBe(`v${OG_RENDER_VERSION}/builds/${id.toLowerCase()}/fr-${Date.parse('2026-10-01T00:00:00Z')}.png`)
    expect(buildCardKey(id, 'fr', '2026-10-02T00:00:00Z')).not.toBe(buildCardKey(id, 'fr', '2026-10-01T00:00:00Z'))
  })
})
