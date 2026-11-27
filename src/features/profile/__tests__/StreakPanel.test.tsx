// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import '@/test/i18n.ts'
import { StreakPanel } from '../StreakPanel.tsx'

afterEach(cleanup)
const setup = (current = 4, best = 45, initialEntry = '/account') => {
  const customize = vi.fn()
  render(<MemoryRouter initialEntries={[initialEntry]}><StreakPanel current={current} best={best} unlocks={[{ slug: 'julith', threshold: 30, eligible: true, progress: best }]} onCustomize={customize} /></MemoryRouter>)
  return customize
}

describe('streak progress and reward browsing', () => {
  it('uses the active streak toward the next unearned milestone, preserving record rewards', () => {
    setup(4, 45)
    const progress = screen.getByRole('progressbar') as HTMLProgressElement
    expect(progress.max).toBe(100)
    expect(progress.value).toBe(4)
    expect(screen.getByText('streak_keep_rewards')).toBeTruthy()
    expect(screen.getByText('exclusive_goultard_name')).toBeTruthy()
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
    expect(screen.getAllByText('streak_unlocked')).toHaveLength(4)
  })

  it('previews a locked reward without granting a selection and returns focus to its card', async () => {
    const customize = setup()
    fireEvent.click(screen.getByRole('button', { name: 'streak_view_rewards' }))
    const card = screen.getAllByRole('button', { name: 'streak_reward_view' })[3]
    fireEvent.click(card)
    expect(screen.getByRole('img', { name: 'exclusive_ogrest_name' }).getAttribute('src')).toBe('/avatars/exclusive/v1/ogrest.webp')
    expect(screen.queryByRole('button', { name: 'streak_customize' })).toBeNull()
    expect(customize).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'streak_back_rewards' }))
    await waitFor(() => expect(document.activeElement).toBe(screen.getAllByRole('button', { name: 'streak_reward_view' })[3]))
  })

  it('hands an eligible reward to the gallery without saving profile changes', async () => {
    const customize = setup()
    fireEvent.click(screen.getByRole('button', { name: 'streak_view_rewards' }))
    fireEvent.click(screen.getAllByRole('button', { name: 'streak_reward_view' })[1])
    fireEvent.click(screen.getByRole('button', { name: 'streak_customize' }))
    await waitFor(() => expect(customize).toHaveBeenCalledWith('julith'))
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('opens the rewards popup from the account-menu deep link', async () => {
    setup(12, 45, '/account#streak-rewards')
    expect(await screen.findByRole('dialog')).toBeTruthy()
    expect(screen.getAllByRole('button', { name: 'streak_reward_view' })).toHaveLength(4)
  })
})
