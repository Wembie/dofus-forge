import { describe, expect, it } from 'vitest'
import { normalizeItem } from '../lib/normalize.ts'

describe('normalizeItem special spell effects', () => {
  it('preserves localized game text for spell effects without adding it to regular stats', () => {
    const item = normalizeItem({
      ankama_id: 1,
      name: 'Example hat',
      type: { name: 'Hat' },
      effects: [
        {
          int_minimum: 32453,
          int_maximum: 0,
          type: { id: 276, name: ': + cast per turn' },
          formatted: 'Abolition Arrow: +1 casts per turn',
        },
        {
          int_minimum: 10,
          int_maximum: 20,
          type: { id: 6, name: 'Strength' },
          formatted: '+10 to 20 Strength',
        },
        {
          int_minimum: 1,
          int_maximum: 0,
          type: { id: 123, name: 'Number of victims:' },
          formatted: 'Number of victims:',
        },
      ],
    })

    expect(item.effects).toEqual([
      {
        stat: ': + cast per turn',
        min: 32453,
        max: 0,
        effect_id: 276,
        formatted: 'Abolition Arrow: +1 casts per turn',
      },
      { stat: 'Strength', min: 10, max: 20, effect_id: 6 },
      { stat: 'Number of victims:', min: 1, max: 0, effect_id: 123 },
    ])
  })
})
