// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import '@/test/i18n.ts'

const api = vi.hoisted(() => ({
  fetchBuildById:    vi.fn(),
  fetchBuildSummary: vi.fn(async () => null),
  publishBuild:      vi.fn(),
  updateBuild:       vi.fn(async () => ({ error: null })),
  setBuildTags:      vi.fn(async () => ({ error: null })),
  fetchTags:         vi.fn(async () => []),
}))
vi.mock('@/features/builds/api.ts', async importOriginal => ({ ...(await importOriginal<object>()), ...api }))

import { PublishModal } from '../PublishModal.tsx'
import { useBuildStore } from '@/store/buildStore.ts'
import { useAuthStore } from '@/store/authStore.ts'

const ME = 'user-me'
const row = (user_id: string, extra: object = {}) => ({
  id: 'b1', name: 'Build', user_id, visibility: 'public', build_tags: [{ tags: { id: 3, name: 'pvp', category: 'playstyle' } }], ...extra,
})

function renderModal() {
  return render(<MemoryRouter><PublishModal open onClose={() => {}} /></MemoryRouter>)
}

beforeEach(() => {
  Object.values(api).forEach(fn => fn.mockClear())
  useAuthStore.setState({ session: { user: { id: ME } } as never, loading: false })
  useBuildStore.getState().reset()
  useBuildStore.getState().setClass('iop')
  useBuildStore.getState().setLinkedBuildId('b1')
})
afterEach(cleanup)

describe('PublishModal', () => {
  it('turns someone else\'s linked build into a remix instead of updating it', async () => {
    api.fetchBuildById.mockResolvedValue({ data: row('another-user'), error: null })
    renderModal()
    await waitFor(() => expect(useBuildStore.getState().linkedBuildId).toBeNull())
    expect(useBuildStore.getState().forkOf).toBe('b1')
  })

  it('waits for the published build\'s tags before allowing Update', async () => {
    let resolve: (v: unknown) => void = () => {}
    api.fetchBuildById.mockReturnValue(new Promise(r => { resolve = r }))
    renderModal()
    const submit = screen.getByRole('button', { name: 'publish_submit_update' })
    expect((submit as HTMLButtonElement).disabled).toBe(true)
    resolve({ data: row(ME), error: null })
    await waitFor(() => expect((submit as HTMLButtonElement).disabled).toBe(false))
  })

  it('does not rewrite tags on Update when they did not change', async () => {
    api.fetchBuildById.mockResolvedValue({ data: row(ME), error: null })
    renderModal()
    const submit = screen.getByRole('button', { name: 'publish_submit_update' })
    await waitFor(() => expect((submit as HTMLButtonElement).disabled).toBe(false))
    fireEvent.click(submit)
    await waitFor(() => expect(api.updateBuild).toHaveBeenCalled())
    expect(api.setBuildTags).not.toHaveBeenCalled()
  })
})
