// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import '@/test/i18n.ts'
import { StreakPanel } from '../StreakPanel.tsx'
import { EXCLUSIVE_REWARDS } from '../exclusiveRewards.ts'

afterEach(cleanup)
const setup = (current = 4, best = 45, initialEntry = '/account') => {
  const customize = vi.fn()
  render(<MemoryRouter initialEntries={[initialEntry]}><StreakPanel current={current} best={best} unlocks={[{ slug: 'julith', threshold: 30, eligible: true, progress: best }]} onCustomize={customize} /></MemoryRouter>)
  return customize
}

describe('streak progress and reward browsing', () => {
  it('lets administrators browse and select all artwork without inventing a streak record', async () => {
    const customize = vi.fn()
    render(<MemoryRouter><StreakPanel current={0} best={0} unrestricted unlocks={EXCLUSIVE_REWARDS.map(r => ({ slug: r.slug, threshold: r.threshold, eligible: true, progress: 0 }))} onCustomize={customize} /></MemoryRouter>)
    expect(screen.queryByRole('progressbar')).toBeNull()
    expect(screen.getByText('streak_admin_access')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'streak_view_rewards' }))
    expect(screen.getAllByText('streak_admin_available')).toHaveLength(7)
    fireEvent.click(screen.getByText('exclusive_ogrest_name').closest('button')!)
    fireEvent.click(screen.getByRole('button', { name: 'streak_customize' }))
    await waitFor(() => expect(customize).toHaveBeenCalledWith('ogrest'))
  })

  it('shows the server allowance and active-streak bonus independently from the permanent record', () => {
    render(<MemoryRouter><StreakPanel current={10} best={365} unlocks={[]} buildQuota={{ used: 51, limit: 52, base_limit: 50, streak_bonus: 2, active_streak: 10 }} onCustomize={vi.fn()} /></MemoryRouter>)
    expect(screen.getByText('streak_build_capacity')).toBeTruthy()
    expect(screen.getByText('streak_build_bonus')).toBeTruthy()
    expect(screen.getByText('streak_build_next')).toBeTruthy()
    expect(screen.getByText('streak_keep_rewards')).toBeTruthy()
  })
  it('uses the active streak toward the next unearned milestone, preserving record rewards', () => {
    setup(4, 45)
    const progress = screen.getByRole('progressbar') as HTMLProgressElement
    expect(progress.max).toBe(60)
    expect(progress.value).toBe(4)
    expect(screen.getByText('streak_keep_rewards')).toBeTruthy()
    expect(screen.getByText('exclusive_jahash_name')).toBeTruthy()
  })

  it('lets a new account discover the first reward before earning a streak', () => {
    setup(0, 0)
    expect((screen.getByRole('progressbar') as HTMLProgressElement).max).toBe(7)
    expect(screen.getByRole('button', { name: 'streak_view_rewards' })).toBeTruthy()
  })

  it('shows the completed collection even when the active streak restarts', () => {
    setup(2, 365)
    expect(screen.queryByRole('progressbar')).toBeNull()
    expect(screen.getByText('streak_all_earned')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'streak_view_rewards' }))
    expect(screen.getAllByText('streak_unlocked')).toHaveLength(7)
    fireEvent.click(screen.getByRole('tab', { name: /streak_collection_bakara/ }))
    expect(screen.getAllByText('streak_unlocked')).toHaveLength(5)
  })

  it('previews a locked reward without granting a selection and returns focus to its card', async () => {
    const customize = setup()
    fireEvent.click(screen.getByRole('button', { name: 'streak_view_rewards' }))
    fireEvent.click(screen.getByRole('tab', { name: /streak_chapter_legends/ }))
    const card = screen.getByText('exclusive_ogrest_name').closest('button')!
    fireEvent.click(card)
    expect(screen.getByRole('img', { name: 'exclusive_ogrest_name' }).getAttribute('src')).toBe('/avatars/exclusive/v1/ogrest.webp')
    expect(screen.queryByRole('button', { name: 'streak_customize' })).toBeNull()
    expect(customize).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'streak_back_rewards' }))
    await waitFor(() => expect(document.activeElement).toBe(screen.getByText('exclusive_ogrest_name').closest('button')))
  })

  it('hands an eligible reward to the gallery without saving profile changes', async () => {
    const customize = setup()
    fireEvent.click(screen.getByRole('button', { name: 'streak_view_rewards' }))
    fireEvent.click(screen.getByRole('tab', { name: /streak_chapter_first_steps/ }))
    fireEvent.click(screen.getByText('exclusive_julith_name').closest('button')!)
    fireEvent.click(screen.getByRole('button', { name: 'streak_customize' }))
    await waitFor(() => expect(customize).toHaveBeenCalledWith('julith'))
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('opens the rewards popup from the account-menu deep link', async () => {
    setup(12, 45, '/account#streak-rewards')
    expect(await screen.findByRole('dialog')).toBeTruthy()
    expect(screen.getAllByRole('button', { name: 'streak_reward_view' })).toHaveLength(5)
  })

  it('shows and highlights both next rewards at the shared day-90 milestone', () => {
    setup(2, 60, '/account#streak-rewards')
    const dialog = within(screen.getByRole('dialog'))
    expect(dialog.getAllByText('streak_next_reward')).toHaveLength(2)
    expect(dialog.getByText('exclusive_otomai_name', { selector: 'h3' })).toBeTruthy()
    expect(dialog.getByText('exclusive_bakara_tipsy_name', { selector: 'h3' })).toBeTruthy()
    expect((screen.getByRole('progressbar') as HTMLProgressElement).max).toBe(90)
  })

  it('navigates sections by keyboard and keeps the collection separate from chronology', async () => {
    setup(45, 45, '/account#streak-rewards')
    fireEvent.keyDown(screen.getByRole('tab', { selected: true }), { key: 'End' })
    const familyTab = screen.getByRole('tab', { name: /streak_collection_bakara/ })
    await waitFor(() => expect(document.activeElement).toBe(familyTab))
    expect(familyTab.getAttribute('aria-selected')).toBe('true')
    expect(screen.getAllByRole('button', { name: 'streak_reward_view' })).toHaveLength(5)
    expect(screen.getAllByText('streak_unlocked')).toHaveLength(1)
    fireEvent.keyDown(familyTab, { key: 'Home' })
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('tab', { name: /streak_chapter_first_steps/ })))
    expect(screen.getAllByRole('button', { name: 'streak_reward_view' })).toHaveLength(4)
  })
})
