// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import '@/test/i18n.ts'
import { ItemSpellEffects } from '../ItemSpellEffects.tsx'

afterEach(cleanup)

describe('ItemSpellEffects', () => {
  it('shows the localized source text for special spell effects', () => {
    render(
      <ItemSpellEffects effects={[
        { stat: ': + cast per turn', min: 32453, max: 0, effect_id: 276, formatted: 'Abolition Arrow: +1 casts per turn' },
        { stat: 'Strength', min: 10, max: 20, effect_id: 6 },
      ]} />,
    )

    expect(screen.getByText('item_spell_effects')).toBeTruthy()
    expect(screen.getByText('Abolition Arrow: +1 casts per turn')).toBeTruthy()
  })
})
