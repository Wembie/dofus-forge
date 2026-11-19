// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import '@/test/i18n.ts'

const api = vi.hoisted(() => ({
  updateBuildVisibility:     vi.fn(async () => ({ error: null })),
  deleteBuild:               vi.fn(async () => ({ error: null })),
  fetchUserCollections:      vi.fn(async () => ({ data: [{ id: 'c1', user_id: 'me', name: 'PvP', description: null, is_public: false, updated_at: '', build_count: 2 }], error: null })),
  fetchCollectionsWithBuild: vi.fn(async () => new Set<string>()),
  setBuildInCollection:      vi.fn(async () => ({ error: null })),
  createCollection:          vi.fn(async () => ({ data: { id: 'c2', user_id: 'me', name: 'Nueva', description: null, is_public: false, updated_at: '', build_count: 0 }, error: null })),
}))
vi.mock('@/features/builds/api.ts', async importOriginal => ({ ...(await importOriginal<object>()), ...api }))

import { LibraryCard, type LibraryItem } from '../LibraryParts.tsx'
import { CollectionPicker } from '@/features/collections/Collections.tsx'
import { useAuthStore } from '@/store/authStore.ts'
import { ALL_SLOTS } from '@/store/buildStore.ts'

const build: LibraryItem = {
  id: 'b1', name: 'Mi Yopuka', class_slug: 'iop', gender: 'male', level: 200, visibility: 'private',
  like_count: 3, view_count: 10, avg_rating: 4, comment_count: 1, created_at: '2026-11-01T00:00:00Z',
  snapshot: { v: 1, c: 'iop', l: 200, a: [0, 0, 0, 0, 0, 0], s: 0, e: ALL_SLOTS.map(() => null) },
}

beforeEach(() => {
  vi.stubGlobal('IntersectionObserver', class { observe() {} disconnect() {} unobserve() {} })
  Object.values(api).forEach(fn => fn.mockClear())
  useAuthStore.setState({ session: { user: { id: 'me' } } as never, loading: false })
})
afterEach(cleanup)

function card(extra: Partial<Parameters<typeof LibraryCard>[0]> = {}) {
  const onChanged = vi.fn(), onDeleted = vi.fn()
  render(<MemoryRouter><LibraryCard build={build} owner onChanged={onChanged} onDeleted={onDeleted} {...extra} /></MemoryRouter>)
  fireEvent.click(screen.getByRole('button', { name: 'lib_actions' }))
  return { onChanged, onDeleted }
}

describe('LibraryCard', () => {
  it('changes visibility in a dialog, only once the choice differs', async () => {
    const { onChanged } = card()
    fireEvent.click(screen.getByRole('button', { name: 'publish_visibility_label' }))
    const dialog = screen.getByRole('dialog')
    const save = within(dialog).getByRole('button', { name: /collection_save/ }) as HTMLButtonElement
    expect(save.disabled).toBe(true)
    fireEvent.click(within(dialog).getByRole('radio', { name: /publish_visibility_public/ }))
    expect(save.disabled).toBe(false)
    fireEvent.click(save)
    await waitFor(() => expect(onChanged).toHaveBeenCalledWith(expect.objectContaining({ visibility: 'public' })))
    expect(api.updateBuildVisibility).toHaveBeenCalledWith('b1', 'public')
  })

  it('asks before deleting a build, in a dialog', async () => {
    const { onDeleted } = card()
    fireEvent.click(screen.getByRole('button', { name: 'my_builds_delete' }))
    const dialog = screen.getByRole('dialog')
    expect(api.deleteBuild).not.toHaveBeenCalled()
    fireEvent.click(within(dialog).getByRole('button', { name: 'my_builds_delete' }))
    await waitFor(() => expect(onDeleted).toHaveBeenCalledWith('b1'))
  })

  it('offers no owner actions on someone else\'s build, and unbookmarks a bookmark', () => {
    const onUnbookmark = vi.fn()
    card({ owner: false, onUnbookmark })
    expect(screen.queryByRole('button', { name: 'my_builds_delete' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'lib_unbookmark' }))
    expect(onUnbookmark).toHaveBeenCalled()
  })
})

describe('CollectionPicker', () => {
  it('adds the build to a collection, and creates one with it', async () => {
    render(<MemoryRouter><CollectionPicker open onClose={() => {}} userId="me" buildId="b1" buildName="Mi Yopuka" /></MemoryRouter>)
    const row = await screen.findByRole('button', { name: /PvP/ })
    fireEvent.click(row)
    await waitFor(() => expect(api.setBuildInCollection).toHaveBeenCalledWith('c1', 'b1', true))
    expect(row.getAttribute('aria-pressed')).toBe('true')
    fireEvent.click(screen.getByRole('button', { name: 'lib_new_collection' }))
    fireEvent.change(screen.getByLabelText('lib_collection_name'), { target: { value: 'Nueva' } })
    fireEvent.click(screen.getByRole('button', { name: /collections_create/ }))
    await waitFor(() => expect(api.setBuildInCollection).toHaveBeenCalledWith('c2', 'b1', true))
    expect(await screen.findByText('lib_added')).toBeTruthy()
  })
})
