// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import '@/test/i18n.ts'
import { ProfileAppearancePicker } from './ProfileAppearancePicker.tsx'
import { EXCLUSIVE_REWARDS } from '@/features/profile/exclusiveRewards.ts'

afterEach(cleanup)

const baseProps = {
  username: 'brasa', displayName: '', bio: '',
  avatar: null, banner: null, exclusiveAvatarSlug: null, exclusiveBannerSlug: null,
  unlocks: EXCLUSIVE_REWARDS.map(r => ({ slug: r.slug, threshold: r.threshold, progress: 0, eligible: false })),
  disabled: false, onChange: vi.fn(),
}

describe('ProfileAppearancePicker — exclusives filter', () => {
  it('renders the selected Bakara book portrait in the preview instead of the initial', () => {
    render(<ProfileAppearancePicker {...baseProps} username="wembie" exclusiveAvatarSlug="bakara_drunk_book" />)
    fireEvent.click(screen.getByRole('button', { name: /appearance_open/ }))
    const avatar = document.querySelector('.appearance-profile-card .account-avatar img') as HTMLImageElement
    expect(avatar).toBeTruthy()
    expect(avatar.getAttribute('src')).toBe('/avatars/exclusive/v1/bakara-drunk-book.webp')
    expect(document.querySelector('.appearance-profile-card .account-avatar')?.textContent).not.toBe('W')
  })
  it('the Exclusive toggle hides the regular gallery and skips the "no matches" empty state', () => {
    render(<ProfileAppearancePicker {...baseProps} />)
    fireEvent.click(screen.getByRole('button', { name: /appearance_open/ }))

    const toggle = screen.getByRole('checkbox', { name: /appearance_exclusive_heading/ })
    fireEvent.click(toggle)

    expect(screen.queryByText('appearance_empty_title')).toBeNull()
    expect(screen.getAllByText('appearance_exclusive_heading').length).toBeGreaterThan(0)
    for (const r of EXCLUSIVE_REWARDS) expect(screen.getByText(r.nameKey)).toBeTruthy()
  })

  it('an eligible exclusive is selectable; a locked one is disabled with its progress shown', () => {
    const unlocks = EXCLUSIVE_REWARDS.map(r => ({ slug: r.slug, threshold: r.threshold, progress: r.slug === 'kerubim' ? 7 : 0, eligible: r.slug === 'kerubim' }))
    render(<ProfileAppearancePicker {...baseProps} unlocks={unlocks} />)
    fireEvent.click(screen.getByRole('button', { name: /appearance_open/ }))
    fireEvent.click(screen.getByRole('checkbox', { name: /appearance_exclusive_heading/ }))

    const radios = screen.getAllByRole('radio') as HTMLInputElement[]
    const unlockedOne = radios.find(r => r.value === 'kerubim')!
    const lockedOne = radios.find(r => r.value === 'goultard')!
    expect(unlockedOne.disabled).toBe(false)
    expect(lockedOne.disabled).toBe(true)
  })
})
