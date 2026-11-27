// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import '@/test/i18n.ts'
import { ProfileBanner } from './ProfileBanner.tsx'

afterEach(cleanup)

describe('public profile banners', () => {
  it('shows the saved landscape and opens its complete illustration without signing in', async () => {
    const url = '/banners/locations/v1/pandala.webp'
    render(<ProfileBanner username="brasa" url={url} />)
    const opener = screen.getByRole('button', { name: 'profile_banner_view' })
    expect(opener.querySelector('img')?.getAttribute('src')).toBe(url)
    opener.focus()
    fireEvent.click(opener)
    const dialog = await screen.findByRole('dialog', { name: 'profile_banner_title' })
    expect(within(dialog).getByRole('img').getAttribute('src')).toBe(url)
    fireEvent.keyDown(document, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(document.activeElement).toBe(opener)
  })

  it.each([null, undefined, 'https://tracker.example/banner.png', '/banners/locations/v1/unknown.webp'])('renders no cover or viewer for a missing or unapproved URL: %s', url => {
    const { container } = render(<ProfileBanner username="brasa" url={url} />)
    expect(container.childElementCount).toBe(0)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('shows a registered exclusive banner on public profiles', () => {
    const url = '/banners/exclusive/v1/ogrest.webp'
    render(<ProfileBanner username="brasa" url={url} />)
    expect(screen.getByRole('button', { name: 'profile_banner_view' }).querySelector('img')?.getAttribute('src')).toBe(url)
  })
})
