// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import '@/test/i18n.ts'
import { PublicProfileAvatar } from './PublicProfileAvatar.tsx'

afterEach(cleanup)

describe('public profile portrait inspection', () => {
  it('opens the full illustration, closes with Escape and returns keyboard focus', async () => {
    const url = '/avatars/classes/v1/iop-f.webp'
    render(<PublicProfileAvatar username="brasa" url={url} />)
    const opener = screen.getByRole('button', { name: 'profile_avatar_view' })
    expect(opener.getAttribute('aria-haspopup')).toBe('dialog')
    opener.focus()
    fireEvent.click(opener)
    const dialog = await screen.findByRole('dialog', { name: 'profile_avatar_title' })
    expect(within(dialog).getByRole('img').getAttribute('src')).toBe(url)
    await waitFor(() => expect(document.activeElement).toBe(within(dialog).getByRole('button', { name: 'modal_close' })))
    expect(document.body.style.overflow).toBe('hidden')
    fireEvent.keyDown(document, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(document.activeElement).toBe(opener)
    expect(document.body.style.overflow).not.toBe('hidden')
  })

  it('renders and enlarges a registered exclusive portrait', async () => {
    render(<PublicProfileAvatar username="wembie" url="/avatars/exclusive/v1/bakara-drunk-book.webp" />)
    const image = document.querySelector('.account-avatar img') as HTMLImageElement
    expect(image.getAttribute('src')).toBe('/avatars/exclusive/v1/bakara-drunk-book.webp')
    fireEvent.click(screen.getByRole('button', { name: 'profile_avatar_view' }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByRole('img').getAttribute('src')).toBe('/avatars/exclusive/v1/bakara-drunk-book.webp')
  })

  it('allows closing the illustration with the visible close button', async () => {
    render(<PublicProfileAvatar username="brasa" url="/avatars/classes/v1/cra-m.webp" />)
    fireEvent.click(screen.getByRole('button', { name: 'profile_avatar_view' }))
    fireEvent.click(await screen.findByRole('button', { name: 'modal_close' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })

  it.each([null, 'https://tracker.example/photo.png', '/avatars/classes/v1/iop-m.webp?redirect=1'])('leaves initials without a zoom action and never loads unapproved images: %s', url => {
    const { container } = render(<PublicProfileAvatar username="brasa" url={url} />)
    expect(screen.queryByRole('button')).toBeNull()
    expect(container.querySelector('img')).toBeNull()
    expect(container.textContent).toBe('B')
  })

  it('wears the streak frame tier when one is earned, and none otherwise', () => {
    const { rerender } = render(<PublicProfileAvatar username="brasa" url="/avatars/classes/v1/iop-f.webp" streakTier="gold" />)
    expect(screen.getByRole('button', { name: 'profile_avatar_view' }).getAttribute('data-tier')).toBe('gold')
    rerender(<PublicProfileAvatar username="brasa" url="/avatars/classes/v1/iop-f.webp" />)
    expect(screen.getByRole('button', { name: 'profile_avatar_view' }).hasAttribute('data-tier')).toBe(false)
  })

  it('removes an open viewer if its URL is replaced by an unapproved one', async () => {
    const { rerender } = render(<PublicProfileAvatar username="brasa" url="/avatars/classes/v1/iop-m.webp" />)
    fireEvent.click(screen.getByRole('button', { name: 'profile_avatar_view' }))
    await screen.findByRole('dialog')
    rerender(<PublicProfileAvatar username="brasa" url="https://tracker.example/photo.png" />)
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.querySelector('img')).toBeNull()
    expect(document.body.style.overflow).not.toBe('hidden')
  })
})
