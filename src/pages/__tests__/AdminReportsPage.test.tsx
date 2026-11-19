// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import '@/test/i18n.ts'

const api = vi.hoisted(() => ({
  fetchReports: vi.fn(async () => ({
    data: [{ id: 'r1', kind: 'build', reason: 'spam', detail: null, created_at: '2026-11-01T00:00:00Z', reporter: { username: 'ana' }, build: { id: 'b1', name: 'Spam build', visibility: 'public' } }],
    commentsError: null,
  })),
  setReportStatus: vi.fn(async () => ({ error: null })),
  moderateContent: vi.fn(async () => ({ error: null })),
}))
vi.mock('@/features/builds/api.ts', async importOriginal => ({ ...(await importOriginal<object>()), ...api }))

import { AdminReportsPage } from '../AdminReportsPage.tsx'
import { useAuthStore } from '@/store/authStore.ts'

beforeEach(() => {
  Object.values(api).forEach(fn => fn.mockClear())
  useAuthStore.setState({ session: { user: { id: 'admin' } } as never, profile: { role: 'admin' } as never, loading: false } as never)
})
afterEach(cleanup)

describe('AdminReportsPage', () => {
  it('asks before deleting a reported build, then removes it from the queue', async () => {
    render(<MemoryRouter><AdminReportsPage /></MemoryRouter>)
    fireEvent.click(await screen.findByRole('button', { name: /admin_reports_delete_build/ }))
    expect(api.moderateContent).not.toHaveBeenCalled()
    const dialog = screen.getByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: 'admin_reports_delete_build' }))
    await waitFor(() => expect(api.moderateContent).toHaveBeenCalledWith('build', 'b1', 'delete'))
    await waitFor(() => expect(screen.queryByText(/Spam build/)).toBeNull())
  })

  it('switches status tabs', async () => {
    render(<MemoryRouter><AdminReportsPage /></MemoryRouter>)
    await screen.findByText(/Spam build/)
    fireEvent.click(screen.getByRole('button', { name: /admin_reports_status_dismissed/ }))
    await waitFor(() => expect(api.fetchReports).toHaveBeenLastCalledWith('dismissed'))
  })
})
