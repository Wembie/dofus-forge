// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useState } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import i18n from '@/test/i18n.ts'
import { StarRating } from '../StarRating.tsx'

beforeEach(async () => {
  i18n.addResourceBundle('en', 'translation', JSON.parse(readFileSync('public/locales/en/translation.json', 'utf8')), true, true)
  await i18n.changeLanguage('en')
})
afterEach(cleanup)

function Harness({ initial = 0 }: { initial?: number }) {
  const [value, setValue] = useState(initial)
  return <StarRating value={value} onRate={setValue} />
}

describe('half-star selection', () => {
  it.each([0.5, 1.5, 4.5])('selects and displays %s stars', rating => {
    render(<Harness />)
    expect(screen.getAllByRole('radio')).toHaveLength(10)
    expect(screen.queryByRole('status')).toBeNull()
    const option = screen.getByRole('radio', { name: `Rate ${rating} out of 5 stars` }) as HTMLInputElement
    fireEvent.click(option)
    expect(option.checked).toBe(true)
    expect((document.querySelectorAll('.detail-rating-fill')[Math.floor(rating)] as HTMLElement).style.width).toBe('50%')
  })

  it.each([1, 2, 3, 4, 5])('keeps an existing integer vote of %s selected', value => {
    render(<Harness initial={value} />)
    expect((screen.getByRole('radio', { name: `Rate ${value} out of 5 stars` }) as HTMLInputElement).checked).toBe(true)
    expect([...document.querySelectorAll<HTMLElement>('.detail-rating-fill')].filter(el => el.style.width === '100%')).toHaveLength(value)
  })

  it('previews a half star on hover without changing the saved vote', () => {
    const onRate = vi.fn()
    render(<StarRating value={4} onRate={onRate} />)
    const option = screen.getByRole('radio', { name: 'Rate 1.5 out of 5 stars' })
    fireEvent.mouseEnter(option.parentElement!)
    expect((document.querySelectorAll('.detail-rating-fill')[1] as HTMLElement).style.width).toBe('50%')
    expect(onRate).not.toHaveBeenCalled()
    expect((screen.getByRole('radio', { name: 'Rate 4 out of 5 stars' }) as HTMLInputElement).checked).toBe(true)
    fireEvent.mouseLeave(screen.getByRole('radiogroup'))
    expect((document.querySelectorAll('.detail-rating-fill')[1] as HTMLElement).style.width).toBe('100%')
  })

  it('blocks duplicate changes while saving', () => {
    const onRate = vi.fn()
    render(<StarRating value={1.5} onRate={onRate} disabled />)
    expect(screen.getAllByRole('radio').every(input => (input as HTMLInputElement).disabled)).toBe(true)
    fireEvent.click(screen.getByRole('radio', { name: 'Rate 4.5 out of 5 stars' }))
    expect(onRate).not.toHaveBeenCalled()
  })

  it('localizes fractional values and all rating vocabulary in each language', async () => {
    for (const lang of ['es', 'en', 'fr', 'pt']) {
      const strings = JSON.parse(readFileSync(`public/locales/${lang}/translation.json`, 'utf8'))
      for (const key of ['build_rating_option', 'build_rating_save_error']) expect(strings[key]?.length, `${lang}:${key}`).toBeGreaterThan(0)
    }
    i18n.addResourceBundle('es', 'translation', JSON.parse(readFileSync('public/locales/es/translation.json', 'utf8')), true, true)
    await i18n.changeLanguage('es')
    render(<Harness initial={4.5} />)
    expect((screen.getByRole('radio', { name: 'Puntuar con 4,5 de 5 estrellas' }) as HTMLInputElement).checked).toBe(true)
  })
})
