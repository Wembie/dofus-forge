import { describe, it, expect, vi } from 'vitest'

vi.mock('../data.ts', () => ({
  toDataUri: async () => undefined,
  statIconDataUri: async () => undefined,
}))

import { buildOgImageData } from '../buildImageData.ts'
import type { BuildMeta } from '../supabase.ts'
import type { BuildSnapshot } from '../../store/buildStore.ts'

const meta = (extra: Partial<BuildMeta> = {}): BuildMeta => ({
  name: 'Build', class_slug: 'iop', level: 200, gender: 'male', visibility: 'public', updated_at: '',
  profiles: { username: 'ana' },
  snapshot: { v: 1, c: 'iop', l: 200, a: [0, 0, 0, 0, 0, 0], s: 0, e: [] } as unknown as BuildSnapshot,
  ...extra,
})

const run = (build: BuildMeta) => buildOgImageData({} as Fetcher, 'https://x', build, [], [], 'Yopuka', {})

describe('OG image data', () => {
  it('uses the female portrait for builds stored with gender "female"', async () => {
    expect((await run(meta({ gender: 'female' }))).gender).toBe('female')
    expect((await run(meta({ gender: 'male' }))).gender).toBe('male')
  })

  it('does not crash on a malformed stored snapshot', async () => {
    const broken = meta({ snapshot: { v: 1 } as unknown as BuildSnapshot })
    await expect(run(broken)).resolves.toMatchObject({ title: 'Build' })
  })
})
