// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import '@/test/i18n.ts'
import { useBuildStore } from '@/store/buildStore.ts'
import { useDataStore } from '@/store/dataStore.ts'
import { PvpArena } from '../PvpArena.tsx'

afterEach(() => {
  cleanup()
  useBuildStore.getState().reset()
  useDataStore.setState({ spells: new Map(), loadSpells: vi.fn() })
})

describe('PvpArena spell loading', () => {
  it('requests the class spells on mount, same as SpellsPanel, instead of relying on it having run first', () => {
    localStorage.setItem('dofus-forge-character', '2d')
    const loadSpells = vi.fn()
    useBuildStore.setState({ selectedClass: 'cra', level: 40 })
    useDataStore.setState({ lang: 'en', spells: new Map(), loadSpells })

    render(<PvpArena />)

    expect(loadSpells).toHaveBeenCalledWith('en', 'cra')
  })
})
