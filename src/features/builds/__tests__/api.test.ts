import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createSupabaseMock, opArgs } from '@/test/supabaseMock.ts'

const supabaseState = vi.hoisted(() => ({ get: (): Promise<unknown> => Promise.reject(new Error('not set')) }))
vi.mock('@/lib/supabase.ts', () => ({ getSupabase: () => supabaseState.get() }))

import {
  fetchPublicBuilds, fetchMyLike, fetchMembershipTier, fetchBuildSummary, fetchUserCollections,
  fetchCollection, updateBuild, setBuildTags, submitReport, MAX_BUILD_TAGS, subscribeToNotifications,
  fetchBuildById, fetchComments, fetchBuildHistory, fetchNotifications, setBuildFeatured, moderateContent,
  BUILD_LINK_HEADER, fetchVersionSnapshot,
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

describe('card lists fetch only the equipment of each snapshot', () => {
  it('selects snapshot->e and rebuilds a minimal snapshot from the row columns', async () => {
    mock.on('builds', { data: [{ id: 'b1', class_slug: 'cra', level: 180, gender: 'female', e: [5, null, 'x'] }], count: 1 })
    const { data } = await fetchPublicBuilds({ sort: 'likes', page: 0 })
    const select = String(opArgs(mock.callsTo('builds')[0], 'select')?.[0])
    expect(select).toContain('e:snapshot->e')
    expect(select).not.toMatch(/(^|, )snapshot(,|$)/)
    expect(data[0].snapshot).toMatchObject({ v: 1, c: 'cra', l: 180, g: 'f' })
    expect(data[0].snapshot.e.slice(0, 3)).toEqual([5, null, null])
    expect(data[0]).not.toHaveProperty('e')
  })

  it('still fetches the full snapshot for one build', async () => {
    mock.on('builds', { data: { id: 'b1', snapshot: { v: 1, c: 'iop', l: 200, a: [1, 0, 0, 0, 0, 0], s: 0, e: [] } } })
    const { data } = await fetchBuildById('b1')
    expect(String(opArgs(mock.callsTo('builds')[0], 'select')?.[0])).toMatch(/, snapshot$/)
    expect(data?.snapshot.a[0]).toBe(1)
  })
})

describe('build history', () => {
  it('lists versions with their level only, no snapshots', async () => {
    mock.on('build_snapshots', { data: [{ id: 'v1', label: null, created_at: 't', l: 150 }, { id: 'v2', label: 'x', created_at: 't', l: null }] })
    const { data } = await fetchBuildHistory('b1')
    expect(String(opArgs(mock.callsTo('build_snapshots')[0], 'select')?.[0])).toBe('id, label, created_at, l:snapshot->l')
    expect(data).toEqual([{ id: 'v1', label: null, created_at: 't', level: 150 }, { id: 'v2', label: 'x', created_at: 't', level: 200 }])
  })

  it('loads a version snapshot once and reuses it', async () => {
    mock.on('build_snapshots', { data: { snapshot: { v: 1, c: 'iop', l: 199, a: [], s: 0, e: [] } } })
    const first = await fetchVersionSnapshot('b1', 'cache-v')
    const again = await fetchVersionSnapshot('b1', 'cache-v')
    expect(first?.l).toBe(199)
    expect(again).toBe(first)
    expect(mock.callsTo('build_snapshots')).toHaveLength(1)
    expect(opArgs(mock.callsTo('build_snapshots')[0], 'setHeader')).toEqual(['x-build-id', 'b1'])
  })

  it('retries a version snapshot that failed to load', async () => {
    await expect(fetchVersionSnapshot('b1', 'missing-v')).resolves.toBeNull()
    await new Promise(r => setTimeout(r, 0))
    await fetchVersionSnapshot('b1', 'missing-v')
    expect(mock.callsTo('build_snapshots')).toHaveLength(2)
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

  it('archives only after the update went through (a failed attempt leaves no copy)', async () => {
    mock.on('builds', { data: { name: 'Old', snapshot: snap({ l: 150 }) } }, 'maybeSingle')
    mock.calls.length = 0
    await updateBuild('b1', opts(snap()))
    const order = mock.calls.map(c => `${c.table}:${c.ops.some(([o]) => o === 'insert') ? 'insert' : c.ops.some(([o]) => o === 'update') ? 'update' : 'read'}`)
    expect(order.indexOf('builds:update')).toBeLessThan(order.indexOf('build_snapshots:insert'))
  })

  it('does not archive when the update fails or touches no row', async () => {
    const failing = createSupabaseMock()
    failing.on('builds', { data: { name: 'Old', snapshot: snap({ l: 150 }) } }, 'maybeSingle')
    failing.on('builds', { error: { message: 'infinite recursion detected in policy', code: '42P17' } }, 'update')
    supabaseState.get = async () => failing.client
    await expect(updateBuild('b1', opts(snap()))).resolves.toEqual({ error: 'infinite recursion detected in policy' })
    expect(failing.callsTo('build_snapshots', 'insert')).toHaveLength(0)

    const noRow = createSupabaseMock()
    noRow.on('builds', { data: { name: 'Old', snapshot: snap({ l: 150 }) } }, 'maybeSingle')
    noRow.on('builds', { data: [] }, 'update')
    supabaseState.get = async () => noRow.client
    await expect(updateBuild('b1', opts(snap()))).resolves.toEqual({ error: 'not_updated' })
    expect(noRow.callsTo('build_snapshots', 'insert')).toHaveLength(0)
  })

  it('skips a version identical to the newest one already kept', async () => {
    mock.on('builds', { data: { name: 'Old', snapshot: snap({ l: 150 }) } }, 'maybeSingle')
    mock.on('build_snapshots', { data: { snapshot: snap({ l: 150 }) } }, 'maybeSingle')
    await updateBuild('b1', opts(snap()))
    expect(mock.callsTo('build_snapshots', 'insert')).toHaveLength(0)
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
  it('joins the private broadcast topic of the user, reports liveness and unsubscribes cleanly', async () => {
    const onInsert = vi.fn()
    const onLive = vi.fn()
    const stop = subscribeToNotifications('u1', onInsert, onLive)
    await vi.waitFor(() => expect(mock.channel.subscribe).toHaveBeenCalled())
    expect(mock.client.realtime.setAuth).toHaveBeenCalled()
    expect(mock.client.channel).toHaveBeenCalledWith('notifications:u1', { config: { private: true } })
    const [event, filter, handler] = mock.channel.on.mock.calls[0] as unknown as [string, Record<string, string>, () => void]
    expect(event).toBe('broadcast')
    expect(filter).toEqual({ event: 'notification' })
    handler()
    expect(onInsert).toHaveBeenCalledTimes(1)
    const onStatus = (mock.channel.subscribe.mock.calls[0] as unknown as [(s: string) => void])[0]
    onStatus('SUBSCRIBED')
    onStatus('CHANNEL_ERROR')
    expect(onLive.mock.calls).toEqual([[true], [false]])
    stop()
    onStatus('CLOSED')
    expect(onLive).toHaveBeenCalledTimes(2)
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

describe('unlisted builds: opened by link', () => {
  const header = (table: string) => opArgs(mock.callsTo(table)[0], 'setHeader')

  it('every query about one build names it in the link header', async () => {
    mock.on('builds', { data: { id: 'b1', snapshot: snap() } })
    await fetchBuildById('b1')
    await fetchBuildSummary('b2', null)
    await fetchComments('b3')
    await fetchBuildHistory('b4')
    expect(BUILD_LINK_HEADER).toBe('x-build-id')
    expect(opArgs(mock.callsTo('builds')[0], 'setHeader')).toEqual(['x-build-id', 'b1'])
    expect(opArgs(mock.callsTo('builds')[1], 'setHeader')).toEqual(['x-build-id', 'b2'])
    expect(header('build_comments')).toEqual(['x-build-id', 'b3'])
    expect(header('build_snapshots')).toEqual(['x-build-id', 'b4'])
  })

  it('a listing never sends it (the community list cannot reveal unlisted builds)', async () => {
    await fetchPublicBuilds({ sort: 'recent', page: 0 })
    expect(header('builds')).toBeUndefined()
  })

  it('notifications keep build_id, so an unreadable build can still be opened by id', async () => {
    mock.on('notifications', { data: [] })
    await fetchNotifications('u1')
    expect(String(opArgs(mock.callsTo('notifications')[0], 'select')?.[0])).toMatch(/\bbuild_id\b/)
  })
})

describe('collections: someone else\'s unlisted build', () => {
  const entry = (id: string, visibility: string, user_id: string) => ({ position: 1, added_at: '', builds: { id, visibility, user_id, name: id, snapshot: snap() } })
  const collection = { id: 'c1', user_id: 'owner', name: 'C', description: null, is_public: true, updated_at: '', profiles: null, visible: [], entries: [entry('u', 'unlisted', 'x')] }

  it('shows it to the collection owner, who added it from its link', async () => {
    mock.on('collections', { data: collection })
    const { data } = await fetchCollection('c1', 'owner')
    expect(data?.builds.map(b => b.id)).toEqual(['u'])
  })

  it('never shows it to visitors of the public collection', async () => {
    mock.on('collections', { data: collection })
    const { data } = await fetchCollection('c1', 'visitor')
    expect(data?.builds).toEqual([])
  })
})

describe('moderation RPCs', () => {
  it('restore goes through moderate_content', async () => {
    await moderateContent('build', 'b1', 'restore')
    expect(mock.client.rpc).toHaveBeenCalledWith('moderate_content', { p_kind: 'build', p_target: 'b1', p_action: 'restore' })
  })

  it('featuring calls set_build_featured and reports a refusal', async () => {
    mock.client.rpc.mockResolvedValueOnce({ data: null, error: { message: 'not_allowed' } } as never)
    await expect(setBuildFeatured('b1', true)).resolves.toEqual({ error: 'not_allowed' })
    expect(mock.client.rpc).toHaveBeenCalledWith('set_build_featured', { p_build: 'b1', p_featured: true })
  })
})
