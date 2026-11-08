import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { BUILD_CARDS_PREFIX, OG_BUCKET_NAME, OG_KEY_VERSION, buildCardKey, cardHash, pageCardKey, pageManifestKey, type SetCardInput } from '../ogRender.ts'

const input: SetCardInput = {
  kind: 'set',
  kicker: 'Sets',
  name: 'Gobball Set',
  chips: [{ label: 'Lv. 20', color: '#eccb78' }],
  itemImages: ['/img/item/16365-128.png'],
  totalsTitle: 'Full set',
  totals: [{ icon: 'vitality', label: 'Vitality', value: 195, color: '#db5a74' }],
  url: 'dofusforge.com/sets/gobball-set',
}

describe('share card storage', () => {
  it('scripts/og-pregenerate.ts uploads to the bucket the Worker reads (wrangler.jsonc OG_BUCKET)', () => {
    const config = readFileSync(join(__dirname, '..', '..', '..', 'wrangler.jsonc'), 'utf8')
    const bound = config.match(/\{\s*"binding"\s*:\s*"OG_BUCKET"\s*,\s*"bucket_name"\s*:\s*"([^"]+)"/)?.[1]
    expect(bound).toBe(OG_BUCKET_NAME)
  })

  it('a page card has one key, overwritten in place, outside the expiring build prefix', () => {
    expect(pageCardKey('es', 'set', 'gobball-set')).toBe(`v${OG_KEY_VERSION}/pages/es/set/gobball-set.png`)
    expect(pageCardKey('es', 'set', 'gobball-set').startsWith(BUILD_CARDS_PREFIX)).toBe(false)
    expect(pageManifestKey(2, 4)).toBe(`v${OG_KEY_VERSION}/pages/_manifest/2-of-4.json`)
  })

  it('a build card key changes with the build, ignores the id case and sits under the expiring prefix', () => {
    const id = '26BA3A5B-43A7-4E5D-AE86-4ABB11865E4E'
    const key = buildCardKey(id, 'fr', '2026-10-01T00:00:00Z')
    expect(key).toBe(`${BUILD_CARDS_PREFIX}${id.toLowerCase()}/fr-${Date.parse('2026-10-01T00:00:00Z')}.png`)
    expect(buildCardKey(id, 'fr', '2026-10-02T00:00:00Z')).not.toBe(key)
  })

  it('a card hash is stable, and changes with its content or with the renderer', async () => {
    const base = await cardHash('renderer-1', input)
    expect(await cardHash('renderer-1', { ...input })).toBe(base)
    expect(await cardHash('renderer-1', { ...input, totals: [{ ...input.totals[0], value: 200 }] })).not.toBe(base)
    expect(await cardHash('renderer-1', { ...input, itemImages: ['/img/item/16366-128.png'] })).not.toBe(base)
    expect(await cardHash('renderer-2', input)).not.toBe(base)
  })
})
