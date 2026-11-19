// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import '@/test/i18n.ts'
import { AccountPage } from '../AccountPage.tsx'
import { useAuthStore } from '@/store/authStore.ts'

const profile = { id: 'me', username: 'brasa', display_name: 'Brasa', bio: null, avatar_url: null, builds_count: 2, followers_count: 1, following_count: 0 }
const updateProfile = vi.fn(async () => ({ error: null }))
const updateUsername = vi.fn(async () => ({ error: null }))

beforeEach(() => {
  updateProfile.mockClear()
  updateUsername.mockClear()
  useAuthStore.setState({
    session: { user: { id: 'me', email: 'me@example.com', created_at: '2026-01-01T00:00:00Z' } } as never,
    profile: profile as never,
    loading: false,
    updateProfile,
    updateUsername,
  } as never)
})
afterEach(cleanup)

const page = () => render(<MemoryRouter><AccountPage /></MemoryRouter>)

describe('AccountPage', () => {
  it('marks unsaved changes, discards them, and saves only what changed', async () => {
    page()
    const save = screen.getByRole('button', { name: /account_save/ }) as HTMLButtonElement
    expect(save.disabled).toBe(true)
    fireEvent.change(screen.getByLabelText('auth_bio'), { target: { value: 'Pyro' } })
    expect(save.disabled).toBe(false)
    expect(screen.getByRole('img', { name: 'account_unsaved' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'account_discard' }))
    expect((screen.getByLabelText('auth_bio') as HTMLTextAreaElement).value).toBe('')
    fireEvent.change(screen.getByLabelText('auth_bio'), { target: { value: 'Pyro' } })
    fireEvent.click(save)
    await waitFor(() => expect(updateProfile).toHaveBeenCalledWith({ display_name: 'Brasa', bio: 'Pyro' }))
    expect(updateUsername).not.toHaveBeenCalled()
  })

  it('asks before signing out', () => {
    const signOut = vi.fn(async () => {})
    useAuthStore.setState({ signOut } as never)
    page()
    fireEvent.click(screen.getByRole('button', { name: 'account_tab_session' }))
    fireEvent.click(screen.getByRole('button', { name: /auth_signout/ }))
    expect(signOut).not.toHaveBeenCalled()
    const buttons = screen.getAllByRole('button', { name: /auth_signout/ })
    fireEvent.click(buttons[buttons.length - 1])
    expect(signOut).toHaveBeenCalled()
  })
})
