// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import '@/test/i18n.ts'
import { StreakChip } from '../StreakChip.tsx'

afterEach(cleanup)

describe('StreakChip', () => {
  it('renders nothing before the first day ever counts', () => {
    const { container } = render(<StreakChip best={0} />)
    expect(container.firstChild).toBeNull()
  })

  it('shows only the best streak on a public profile (no current prop)', () => {
    const { container, getByText } = render(<StreakChip best={45} />)
    expect(container.querySelector('.streak-chip')?.getAttribute('data-tier')).toBe('silver')
    expect(getByText('streak_chip_best')).toBeTruthy()
  })

  it('shows current and best on the account page', () => {
    const { getByText } = render(<StreakChip current={3} best={45} />)
    expect(getByText('streak_chip_current')).toBeTruthy()
    expect(getByText('streak_chip_best')).toBeTruthy()
  })

  it('has no frame-tier accent below 7 days', () => {
    const { container } = render(<StreakChip current={2} best={2} />)
    expect(container.querySelector('.streak-chip')?.hasAttribute('data-tier')).toBe(false)
  })
})
