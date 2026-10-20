import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createSupabaseMock, opArgs } from '@/test/supabaseMock.ts'

const supabaseState = vi.hoisted(() => ({ get: (): Promise<unknown> => Promise.reject(new Error('not set')) }))
vi.mock('@/lib/supabase.ts', () => ({ getSupabase: () => supabaseState.get() }))

import {
  fetchPublicBuilds, fetchMyLike, fetchMembershipTier, fetchBuildSummary, fetchUserCollections,
  fetchCollection, updateBuild, setBuildTags, submitReport, MAX_BUILD_TAGS, subscribeToNotifications,
} from '../api.ts'
import type { BuildSnapshot } from '@/store/buildStore.ts'

let mock: ReturnType<typeof createSupabaseMock>

beforeEach(() => {
  mock = createSupabaseMock()
  supabaseState.get = () => Promise.resolve(mock.client)
})

const snap = (extra: Partial<BuildSnapshot> = {}): BuildSnapshot =>
  ({ v: 1, c: 'iop', l: 200, g: 'm', a: [0, 0, 0, 0, 0, 0], s: 0, e: [1, null], ...extra }) as BuildSnapshot

describe('guard: supabase-js failing to load', () => {
  it('returns each function\'s failure value instead of rejecting', async () => {
    supabaseState.get = () => Promise.reject(new Error('chunk failed'))
    await expect(fetchPublicBuilds({ sort: 'rating', page: 0 })).resolves.toEqual({ data: [], error: 'chunk failed', count: 0 })
    await expect(fetchMyLike('b', 'u')).resolves.toBe(false)
    await expect(fetchMembershipTier('u')).resolves.toBe('free')
  })
})

describe('fetchPublicBuilds tag filter', () => {
  it('filters through a separate aliased !inner embed so cards keep all their tags', async () => {
    mock.on('builds', { data: [], count: 0 })
    await fetchPublicBuilds({ sort: 'likes', page: 0, tagId: 7 })
    const call = mock.callsTo('builds')[0]
    expect(String(opArgs(call, 'select')?.[0])).toContain('filter_tag:build_tags!inner(tag_id)')
    expect(String(opArgs(call, 'select')?.[0])).toContain('build_tags(tags(id, name, category))')
    expect(call.ops).toContainEqual(['eq', ['filter_tag.tag_id', 7]])
  })

  it('does not add the filter embed without a tag', async () => {
    mock.on('builds', { data: [], count: 0 })
    await fetchPublicBuilds({ sort: 'likes', page: 0 })
    expect(String(opArgs(mock.callsTo('builds')[0], 'select')?.[0])).not.toContain('filter_tag')
  })
})

describe('fetchBuildSummary (remix original)', () => {
  const row = (visibility: string, user_id: string) => ({ id: 'o', name: 'Orig', visibility, user_id, profiles: { username: 'ana', display_name: null } })

  it('shows a public original', async () => {
    mock.on('builds', { data: row('public', 'ana-id') })
    await expect(fetchBuildSummary('o', 'me')).resolves.toEqual({ id: 'o', name: 'Orig', profiles: { username: 'ana', display_name: null } })
  })

  it('hides someone else\'s unlisted original', async () => {
    mock.on('builds', { data: row('unlisted', 'ana-id') })
    await expect(fetchBuildSummary('o', 'me')).resolves.toBeNull()
    await expect(fetchBuildSummary('o', null)).resolves.toBeNull()
  })

  it('shows your own unlisted original', async () => {
    mock.on('builds', { data: row('unlisted', 'me') })
    await expect(fetchBuildSummary('o', 'me')).resolves.not.toBeNull()
  })
})

describe('collections: visible builds only', () => {
  const b = (id: string, visibility: string, user_id: string) => ({ id, visibility, user_id })

  it('counts only builds the viewer may see (public, own, or the collection owner\'s)', async () => {
    mock.on('collections', {
      data: [{
        id: 'c1', user_id: 'owner', name: 'C', description: null, is_public: true, updated_at: '',
        visible: [
          { builds: b('1', 'public', 'x') },
          { builds: null },                       // private build hidden by RLS
          { builds: b('3', 'unlisted', 'x') },    // someone else's unlisted
          { builds: b('4', 'unlisted', 'owner') }, // the collection owner's own unlisted
          { builds: b('5', 'unlisted', 'viewer') },
        ],
      }],
    })
    const { data } = await fetchUserCollections('owner', true, 'viewer')
    expect(data[0].build_count).toBe(3)
    expect(data[0]).not.toHaveProperty('visible')
  })

  it('fetchCollection drops other people\'s unlisted builds and keeps position order', async () => {
    const full = (id: string, visibility: string, user_id: string) => ({ ...b(id, visibility, user_id), name: id })
    mock.on('collections', {
      data: {
        id: 'c1', user_id: 'owner', name: 'C', description: null, is_public: true, updated_at: '', profiles: null,
        visible: [],
        entries: [
          { position: 2, added_at: '2026-01-02', builds: full('b', 'public', 'x') },
          { position: 1, added_at: '2026-01-01', builds: full('a', 'public', 'x') },
          { position: 3, added_at: '2026-01-03', builds: full('hidden', 'unlisted', 'x') },
        ],
      },
    })
    const { data } = await fetchCollection('c1', 'viewer')
    expect(data?.builds.map(x => x.id)).toEqual(['a', 'b'])
  })
})

describe('updateBuild version history', () => {
  const opts = (snapshot: BuildSnapshot) => ({ name: 'N', visibility: 'public' as const, classSlug: 'iop', gender: 'male' as const, level: 200, gameVersion: 'x', snapshot })
  beforeEach(() => { mock.on('builds', { data: [{ id: 'b1' }] }, 'update') })

  it('archives the previous snapshot when it changed', async () => {
    mock.on('builds', { data: { name: 'Old name', snapshot: snap({ l: 150 }) } }, 'maybeSingle')
    mock.on('build_snapshots', { data: [] }, 'range')
    await updateBuild('b1', opts(snap()))
    const insert = mock.callsTo('build_snapshots', 'insert')[0]
    expect(opArgs(insert, 'insert')?.[0]).toMatchObject({ build_id: 'b1', label: 'Old name' })
  })

  it('does not archive when only the jsonb key order differs', async () => {
    const reordered = { e: [1, null], s: 0, a: [0, 0, 0, 0, 0, 0], g: 'm', l: 200, c: 'iop', v: 1 }
    mock.on('builds', { data: { name: 'N', snapshot: reordered } }, 'maybeSingle')
    await updateBuild('b1', opts(snap()))
    expect(mock.callsTo('build_snapshots', 'insert')).toHaveLength(0)
  })

  it('prunes versions beyond the limit', async () => {
    mock.on('builds', { data: { name: 'N', snapshot: snap({ l: 1 }) } }, 'maybeSingle')
    mock.on('build_snapshots', { data: [{ id: 'old1' }, { id: 'old2' }] }, 'range')
    await updateBuild('b1', opts(snap()))
    const del = mock.callsTo('build_snapshots', 'delete')[0]
    expect(opArgs(del, 'in')).toEqual(['id', ['old1', 'old2']])
  })

  it('still updates the build if archiving fails', async () => {
    mock.on('builds', () => { throw new Error('history down') }, 'maybeSingle')
    const result = await updateBuild('b1', opts(snap()))
    expect(result).toEqual({ error: null })
    expect(mock.callsTo('builds', 'update')).toHaveLength(1)
  })
})

describe('setBuildTags', () => {
  it('replaces the tags and caps them at MAX_BUILD_TAGS', async () => {
    await setBuildTags('b1', [1, 2, 3, 4, 5, 6, 7])
    expect(mock.callsTo('build_tags', 'delete')).toHaveLength(1)
    const rows = opArgs(mock.callsTo('build_tags', 'insert')[0], 'insert')?.[0] as unknown[]
    expect(rows).toHaveLength(MAX_BUILD_TAGS)
  })

  it('skips the insert when clearing all tags', async () => {
    await setBuildTags('b1', [])
    expect(mock.callsTo('build_tags', 'insert')).toHaveLength(0)
  })
})

describe('submitReport', () => {
  it('maps a unique violation to "duplicate"', async () => {
    mock.on('comment_reports', { error: { message: 'dup', code: '23505' } })
    await expect(submitReport('u', { kind: 'comment', id: 'c' }, 'spam', null)).resolves.toEqual({ error: 'duplicate' })
  })

  it('trims and caps the detail at 500 characters', async () => {
    await submitReport('u', { kind: 'build', id: 'b' }, 'other', `  ${'x'.repeat(600)}  `)
    const row = opArgs(mock.callsTo('build_reports', 'insert')[0], 'insert')?.[0] as { detail: string }
    expect(row.detail).toHaveLength(500)
  })
})

describe('subscribeToNotifications', () => {
  it('listens to INSERTs on the own notifications of the user and unsubscribes cleanly', async () => {
    const onInsert = vi.fn()
    const stop = subscribeToNotifications('u1', onInsert)
    await vi.waitFor(() => expect(mock.channel.subscribe).toHaveBeenCalled())
    const [event, filter, handler] = mock.channel.on.mock.calls[0] as unknown as [string, Record<string, string>, () => void]
    expect(event).toBe('postgres_changes')
    expect(filter).toEqual({ event: 'INSERT', schema: 'public', table: 'notifications', filter: 'user_id=eq.u1' })
    handler()
    expect(onInsert).toHaveBeenCalledTimes(1)
    stop()
    expect(mock.client.removeChannel).toHaveBeenCalledTimes(1)
  })

  it('never subscribes if stopped before supabase-js loaded', async () => {
    let release: (v: unknown) => void = () => {}
    supabaseState.get = () => new Promise(r => { release = r })
    const stop = subscribeToNotifications('u1', () => {})
    stop()
    release(mock.client)
    await new Promise(r => setTimeout(r, 0))
    expect(mock.client.channel).not.toHaveBeenCalled()
  })
})

describe('updateBuild result', () => {
  const opts = { name: 'N', visibility: 'public' as const, classSlug: 'iop', gender: 'male' as const, level: 200, gameVersion: 'x', snapshot: snap() }

  it('reports an update that touched no row (not yours / deleted) as an error', async () => {
    mock.on('builds', { data: [] }, 'update')
    await expect(updateBuild('someone-elses', opts)).resolves.toEqual({ error: 'not_updated' })
  })

  it('succeeds when the row was updated', async () => {
    mock.on('builds', { data: [{ id: 'b1' }] }, 'update')
    await expect(updateBuild('b1', opts)).resolves.toEqual({ error: null })
  })
})

describe('fetchPublicBuilds ordering', () => {
  it('breaks ties by id so offset pages never repeat or skip builds', async () => {
    mock.on('builds', { data: [], count: 0 })
    await fetchPublicBuilds({ sort: 'views', page: 1 })
    const orders = mock.callsTo('builds')[0].ops.filter(([op]) => op === 'order').map(([, args]) => args[0])
    expect(orders).toEqual(['view_count', 'id'])
  })
})
