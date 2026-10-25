// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import '@/test/i18n.ts'
import type { AppItem } from '@/data/loaders.ts'
import type { ClassSpells } from '@/data/spellLoaders.ts'
import { useBuildStore } from '@/store/buildStore.ts'
import { useDataStore } from '@/store/dataStore.ts'
import { SpellsPanel } from '../SpellsPanel.tsx'

afterEach(() => {
  cleanup()
  useBuildStore.getState().reset()
  useDataStore.setState({ spells: new Map(), loadSpells: vi.fn() })
})

describe('SpellsPanel item modifiers', () => {
  it('shows the Prince of Thieves spell effect and its increased range on the matching Cra spell', () => {
    const equipment = JSON.parse(
      readFileSync(resolve(process.cwd(), 'public/data/en/equipment.json'), 'utf8'),
    ) as AppItem[]
    const item = equipment.find(e => e.ankama_id === 8636)!
    const weapon: AppItem = {
      ankama_id: 999999,
      name: 'Iron Knight Ice Blade',
      level: 40,
      type: 'Sword',
      slot: 'weapon',
      effects: [],
      set_id: null,
      image_url: null,
      ap_cost: 4,
      min_range: 1,
      max_range: 1,
      crit_chance: 32,
      crit_bonus: 10,
    }
    const classSpells = JSON.parse(
      readFileSync(resolve(process.cwd(), 'public/data/en/spells/cra.json'), 'utf8'),
    ) as ClassSpells

    useBuildStore.setState({
      selectedClass: 'cra',
      level: 40,
      equipped: { hat: item.ankama_id, weapon: weapon.ankama_id },
      _equipment: [...equipment, weapon],
      stats: null,
    })
    useDataStore.setState({
      lang: 'en',
      spells: new Map([
        ['cra', classSpells],
        ['common', { classSlug: 'common', spells: [] }],
      ]),
      loadSpells: vi.fn(),
    })

    render(<SpellsPanel />)

    const spellCard = screen.getByText('Tyrannical Arrow').closest('.rounded-lg')!
    expect(spellCard.textContent).toContain('1–11')
    expect(spellCard.textContent).toContain('Tyrannical Arrow: +3 Maximum Range')

    const weaponCard = screen.getByText('Iron Knight Ice Blade').closest('.rounded-lg')!
    const iconSources = [...weaponCard.querySelectorAll('img')].map(image => image.getAttribute('src'))
    expect(iconSources.some(src => src?.endsWith('/data/stats/ap.webp'))).toBe(true)
    expect(iconSources.some(src => src?.endsWith('/data/stats/range.webp'))).toBe(true)
    expect(iconSources.some(src => src?.endsWith('/data/stats/crit.webp'))).toBe(true)
  })
})
