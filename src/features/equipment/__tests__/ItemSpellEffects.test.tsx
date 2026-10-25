// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import '@/test/i18n.ts'
import { ItemSpellEffects } from '../ItemSpellEffects.tsx'

afterEach(cleanup)

describe('ItemSpellEffects', () => {
  it('shows the localized spell name and its matching stat icon', () => {
    const { container } = render(
      <ItemSpellEffects effects={[
        { stat: ': - PA', min: 32433, max: 0, effect_id: 207, formatted: 'Flecha Perseguidora: -1 PA' },
        { stat: 'Strength', min: 10, max: 20, effect_id: 6 },
      ]} />,
    )

    expect(screen.getByText('item_spell_effects')).toBeTruthy()
    expect(screen.getByText('Flecha Perseguidora')).toBeTruthy()
    expect(screen.getByText('-1 PA')).toBeTruthy()
    expect(container.querySelector('img')?.getAttribute('src')).toContain('data/stats/ap.webp')
  })

  it('uses an icon for range and critical effects too', () => {
    const { container } = render(
      <ItemSpellEffects effects={[
        { stat: ': alcance modificable', min: 32458, max: 0, effect_id: 204, formatted: 'Flecha Asaltante: alcance modificable' },
        { stat: ': + de crítico', min: 32439, max: 0, effect_id: 226, formatted: 'Flecha Lenta: +35% de crítico' },
        { stat: ': + lanzamiento por turno', min: 32453, max: 0, effect_id: 276, formatted: 'Flecha de Abolición: +1 lanzamiento por turno' },
      ]} />,
    )

    const icons = [...container.querySelectorAll('img')].map(icon => icon.getAttribute('src'))
    expect(icons.some(src => src?.includes('data/stats/range.webp'))).toBe(true)
    expect(icons.some(src => src?.includes('data/stats/crit.webp'))).toBe(true)
    expect(container.querySelector('svg')).toBeTruthy()
  })
})
