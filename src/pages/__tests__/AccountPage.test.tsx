// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent, waitFor, within } from '@testing-library/react'
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

  it('previews a class portrait, discards it, then saves the chosen portrait', async () => {
    page()
    const url = '/avatars/classes/v1/iop-f.webp'
    const choose = () => {
      fireEvent.click(screen.getByRole('button', { name: 'auth_avatar_change' }))
      fireEvent.click(screen.getByDisplayValue(url))
      fireEvent.click(screen.getByRole('button', { name: 'account_avatar_done' }))
    }
    choose()
    expect(document.querySelector('.account-avatar-control img')?.getAttribute('src')).toBe(url)
    expect(updateProfile).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'account_discard' }))
    expect(document.querySelector('.account-avatar-control img')).toBeNull()
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    choose()
    fireEvent.click(screen.getByRole('button', { name: /account_save/ }))
    await waitFor(() => expect(updateProfile).toHaveBeenCalledWith({ display_name: 'Brasa', bio: null, avatar_url: url }))
  })

  it('keeps the chosen avatar after a network failure so it can be retried', async () => {
    updateProfile.mockRejectedValueOnce(new Error('offline'))
    page()
    const url = '/avatars/classes/v1/xelor-m.webp'
    fireEvent.click(screen.getByRole('button', { name: 'auth_avatar_change' }))
    fireEvent.click(screen.getByDisplayValue(url))
    fireEvent.click(screen.getByRole('button', { name: 'account_avatar_done' }))
    const save = screen.getByRole('button', { name: /account_save/ }) as HTMLButtonElement
    fireEvent.click(save)
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('account_save_error'))
    expect(save.disabled).toBe(false)
    expect(document.querySelector('.account-avatar-control img')?.getAttribute('src')).toBe(url)
    fireEvent.click(save)
    await waitFor(() => expect(updateProfile).toHaveBeenCalledTimes(2))
  })

  it('can replace a saved class portrait with the initial avatar', async () => {
    useAuthStore.setState({ profile: { ...profile, avatar_url: '/avatars/classes/v1/cra-m.webp' } } as never)
    page()
    fireEvent.click(screen.getByRole('button', { name: 'auth_avatar_change' }))
    fireEvent.click(screen.getByLabelText('account_avatar_default'))
    fireEvent.click(screen.getByRole('button', { name: 'account_avatar_done' }))
    fireEvent.click(screen.getByRole('button', { name: /account_save/ }))
    await waitFor(() => expect(updateProfile).toHaveBeenCalledWith({ display_name: 'Brasa', bio: null, avatar_url: null }))
  })

  it('opens the full illustration without choosing it and restores focus when returning', async () => {
    page()
    fireEvent.click(screen.getByRole('button', { name: 'auth_avatar_change' }))
    const card = screen.getByRole('heading', { name: 'Yopuka' }).parentElement!
    fireEvent.click(within(card).getAllByRole('button')[1])
    expect(screen.getByRole('img', { name: 'account_avatar_option' }).getAttribute('src')).toBe('/avatars/classes/v1/iop-f.webp')
    const back = screen.getByRole('button', { name: 'account_avatar_back' })
    expect(document.activeElement).toBe(back)
    expect((screen.getByRole('button', { name: /account_save/ }) as HTMLButtonElement).disabled).toBe(true)
    expect(updateProfile).not.toHaveBeenCalled()
    fireEvent.click(back)
    await waitFor(() => {
      const returnedCard = screen.getByRole('heading', { name: 'Yopuka' }).parentElement!
      expect(document.activeElement).toBe(within(returnedCard).getAllByRole('button')[1])
    })
    expect((screen.getByDisplayValue('/avatars/classes/v1/iop-f.webp') as HTMLInputElement).checked).toBe(false)
  })

  it('applies a portrait from its large preview only after the explicit action', async () => {
    page()
    fireEvent.click(screen.getByRole('button', { name: 'auth_avatar_change' }))
    fireEvent.click(within(screen.getByRole('heading', { name: 'Yopuka' }).parentElement!).getAllByRole('button')[1])
    fireEvent.click(screen.getByRole('button', { name: 'account_avatar_use' }))
    expect(document.querySelector('.account-avatar-control img')?.getAttribute('src')).toBe('/avatars/classes/v1/iop-f.webp')
    expect(document.querySelector('.account-identity img')).toBeNull()
    expect(updateProfile).not.toHaveBeenCalled()
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    fireEvent.click(screen.getByRole('button', { name: /account_save/ }))
    await waitFor(() => expect(updateProfile).toHaveBeenCalledWith({ display_name: 'Brasa', bio: null, avatar_url: '/avatars/classes/v1/iop-f.webp' }))
  })

  it('finds localized class names without accents and explains an empty search', () => {
    page()
    fireEvent.click(screen.getByRole('button', { name: 'auth_avatar_change' }))
    const search = screen.getByRole('searchbox', { name: 'account_avatar_search' })
    fireEvent.change(search, { target: { value: 'zurcarak' } })
    expect(screen.getByRole('heading', { name: 'Zurcarák' })).toBeTruthy()
    expect(screen.queryByRole('heading', { name: 'Yopuka' })).toBeNull()
    expect(screen.getAllByRole('button', { name: 'account_avatar_view' })).toHaveLength(2)
    fireEvent.change(search, { target: { value: 'no-such-class' } })
    expect(screen.getByText('account_avatar_empty')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'account_avatar_view' })).toBeNull()
    expect(updateProfile).not.toHaveBeenCalled()
  })
})
