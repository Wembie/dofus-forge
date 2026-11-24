// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import '@/test/i18n.ts'
import type { AppItem } from '@/data/loaders.ts'
import { OptimizerModal } from '../OptimizerModal.tsx'
import { activatedReq, makeDefaultConfig, persistConfig, STORAGE_KEY } from '../forgeConfig.ts'
import { useForgePicks } from '../forgePicks.ts'
import { useBuildStore, type SlotId } from '@/store/buildStore.ts'
import { useDataStore } from '@/store/dataStore.ts'
import { ITEM_PASSIVES } from '@/engine/passives.ts'

vi.mock('@/features/builds/api.ts', () => ({
  startForgeRun: vi.fn().mockResolvedValue(null),
  finishForgeRun: vi.fn().mockResolvedValue(undefined),
}))

afterEach(() => {
  cleanup()
  localStorage.clear()
  useBuildStore.getState().reset()
  useDataStore.setState({ equipment: null, sets: null })
  useForgePicks.setState({ required: [], banned: [] })
  vi.unstubAllGlobals()
})

const DOFUS_SLOTS: SlotId[] = ['dofus1', 'dofus2', 'dofus3', 'dofus4', 'dofus5', 'dofus6']
const DOFUS: AppItem[] = Array.from({ length: 6 }, (_, index) => ({
  ankama_id: 20 + index,
  name: `Dofus ${index + 1}`,
  level: 200,
  type: index === 0 ? 'Prysmaradite' : 'Dofus',
  slot: 'dofus',
  effects: [],
  set_id: null,
  image_url: null,
})) as AppItem[]

type ForgeInit = {
  type: 'init'
  config: { requiredItems: number[] }
  base: { equipped: Partial<Record<SlotId, number>> }
}

describe('OptimizerModal', () => {
  it.each([false, true])('starts with six pinned Dofus when their slots are locked: %s', locked => {
    const workers: FakeWorker[] = []
    class FakeWorker {
      onmessage: ((event: MessageEvent) => void) | null = null
      messages: unknown[] = []
      constructor() {
        workers.push(this)
      }
      postMessage(message: unknown) {
        this.messages.push(message)
      }
      terminate() {}
    }
    vi.stubGlobal('Worker', FakeWorker)

    const equipped: Partial<Record<SlotId, number>> = {}
    if (locked) DOFUS_SLOTS.forEach((slot, index) => { equipped[slot] = DOFUS[index].ankama_id })
    useBuildStore.setState({ selectedClass: 'iop', equipped })
    useDataStore.setState({ equipment: DOFUS, sets: [] })
    useForgePicks.setState({ required: DOFUS.map(item => item.ankama_id), banned: [] })
    const config = makeDefaultConfig()
    persistConfig({
      ...config,
      intensity: 'quick',
      lockedSlots: new Set(locked ? DOFUS_SLOTS : []),
      stats: config.stats.map((stat, index) => index === 0 ? { ...stat, minimum: 1, weight: 1 } : stat),
    })

    render(
      <MemoryRouter>
        <OptimizerModal open onClose={() => {}} />
      </MemoryRouter>,
    )
    fireEvent.click(screen.getByRole('button', { name: /optimizer_light_forge/ }))

    expect(workers.length).toBeGreaterThan(0)
    const initMessages = workers.flatMap(worker => worker.messages)
      .filter((message): message is ForgeInit =>
        typeof message === 'object'
        && message !== null
        && 'type' in message
        && message.type === 'init'
        && 'config' in message
        && typeof message.config === 'object'
        && message.config !== null
        && 'requiredItems' in message.config
        && Array.isArray(message.config.requiredItems)
        && 'base' in message
        && typeof message.base === 'object'
        && message.base !== null
        && 'equipped' in message.base,
      )
    expect(initMessages).toHaveLength(workers.length)
    expect(initMessages[0].config.requiredItems).toEqual(locked ? [] : DOFUS.map(item => item.ankama_id))
    expect(initMessages[0].base.equipped).toEqual(equipped)
    expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull()
  })
})

const gear = (ankama_id: number, name: string, slot: string, level = 200): AppItem =>
  ({ ankama_id, name, level, type: 'Misc', slot, effects: [], set_id: null, image_url: null }) as AppItem

describe('OptimizerModal picks', () => {
  const WAND = gear(1, 'Anomalous Wand', 'weapon')
  const HAT  = gear(2, 'Wandering Hat', 'hat', 150)
  const LOW  = gear(4, 'Wand of Dawn', 'weapon', 20)

  function open(equipped: Partial<Record<SlotId, number>> = {}) {
    useBuildStore.setState({ selectedClass: 'iop', equipped })
    useDataStore.setState({ equipment: [WAND, HAT, LOW], sets: [] })
    render(<MemoryRouter><OptimizerModal open onClose={() => {}} /></MemoryRouter>)
    return screen.getByRole('combobox', { name: 'optimizer_items_search' })
  }

  it('pins the result the arrow keys reach with Enter, and clears the search', () => {
    const search = open()
    fireEvent.change(search, { target: { value: 'wand' } })
    expect(within(screen.getByRole('listbox', { name: 'fg_found' })).getAllByRole('option').map(o => o.textContent)).toEqual([
      expect.stringContaining('Anomalous Wand'), expect.stringContaining('Wand of Dawn'), expect.stringContaining('Wandering Hat'),
    ])
    fireEvent.keyDown(search, { key: 'ArrowDown' })
    fireEvent.keyDown(search, { key: 'Enter' })
    expect(useForgePicks.getState().required).toEqual([4])
    expect((search as HTMLInputElement).value).toBe('')
  })

  it('bans from the search and releases from the banned list', () => {
    const search = open()
    fireEvent.change(search, { target: { value: 'wand' } })
    fireEvent.click(screen.getAllByRole('button', { name: 'fg_ban_item' })[2])
    expect(useForgePicks.getState().banned).toEqual([2])
    fireEvent.change(search, { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: 'fg_allow_item' }))
    expect(useForgePicks.getState().banned).toEqual([])
  })

  it('pins the planner gear in one tap', () => {
    open({ weapon: 1 })
    const worn = screen.getByRole('group', { name: 'fg_worn_aria' })
    fireEvent.click(within(worn).getByRole('button', { name: 'fg_pin_item' }))
    expect(useForgePicks.getState().required).toEqual([1])
  })
})

describe('OptimizerModal passives', () => {
  const ABYSSAL  = gear(18043, 'Abyssal Dofus', 'dofus')
  const OCHRE    = gear(7754, 'Ochre Dofus', 'dofus')
  const PRYSM    = { ...gear(22012, 'Shiny Prysipitate', 'dofus'), type: 'Prysmaradite' } as AppItem
  const BRUMAIRE = gear(20355, "Brumaire's Shiver", 'weapon')

  function open() {
    useBuildStore.setState({ selectedClass: 'iop', equipped: {} })
    useDataStore.setState({ equipment: [{ ...ABYSSAL, type: 'Dofus' }, { ...OCHRE, type: 'Dofus' }, PRYSM, BRUMAIRE] as AppItem[], sets: [] })
    render(<MemoryRouter><OptimizerModal open onClose={() => {}} /></MemoryRouter>)
    const rule = screen.getByRole('region', { name: 'optimizer_passives' })
    const count = within(rule).getByRole('checkbox', { name: 'optimizer_passives_count' }) as HTMLInputElement
    if (!count.checked) fireEvent.click(count)
    return rule
  }

  it('splits the passive items into sections that can be left out whole or item by item', () => {
    const rule = open()
    const prysm = within(rule).getByRole('checkbox', { name: 'optimizer_passive_section_prysmaradite' }) as HTMLInputElement
    expect(prysm.checked).toBe(true)
    fireEvent.click(prysm)
    expect(prysm.checked).toBe(false)
    const configure = within(rule).getAllByRole('button', { name: 'optimizer_passive_section_configure' })[0]
    expect(configure.getAttribute('aria-expanded')).toBe('false')
    fireEvent.click(configure)
    expect(configure.getAttribute('aria-expanded')).toBe('true')
    const items = within(rule).getAllByRole('checkbox').filter(box => box.closest('li ul'))
    expect(items.length).toBeGreaterThan(0)
    fireEvent.click(items[0])
    expect((items[0] as HTMLInputElement).checked).toBe(false)
  })

  it('adjusts one passive inside the forge: the Ochre counts its dodge case, and can go back', () => {
    const rule = open()
    fireEvent.click(within(rule).getAllByRole('button', { name: 'optimizer_passive_section_configure' })[0])
    const ochre = within(rule).getByText('Ochre Dofus').closest('li')!
    fireEvent.click(within(ochre).getByRole('button', { name: 'fg_passive_tune' }))
    const cases = within(ochre).getAllByRole('radio')
    expect(cases).toHaveLength(3)
    expect(cases[1].getAttribute('aria-checked')).toBe('true')
    fireEvent.click(cases[2])
    expect(within(ochre).getAllByRole('radio')[2].getAttribute('aria-checked')).toBe('true')
    expect(within(ochre).getByText(/fg_passive_adjusted/)).toBeTruthy()
    const control = ITEM_PASSIVES.get(7754)![0].id
    fireEvent.click(within(ochre).getByRole('button', { name: 'fg_passive_clear' }))
    expect(within(ochre).getAllByRole('radio')[1].getAttribute('aria-checked')).toBe('true')
    fireEvent.click(within(ochre).getAllByRole('radio')[0])
    cleanup()
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).passiveOverrides).toEqual({ [control]: 0 })
  })

  it('lists no section while passives are off', () => {
    const rule = open()
    fireEvent.click(within(rule).getByRole('checkbox', { name: 'optimizer_passives_count' }))
    expect(within(rule).queryAllByRole('button', { name: 'optimizer_passive_section_configure' })).toHaveLength(0)
  })
})

describe('OptimizerModal Dofus slot kinds', () => {
  it('unchecks one kind, then none and all, and keeps the choice', () => {
    useBuildStore.setState({ selectedClass: 'iop', equipped: {} })
    useDataStore.setState({ equipment: DOFUS, sets: [] })
    const { unmount } = render(<MemoryRouter><OptimizerModal open onClose={() => {}} /></MemoryRouter>)
    const kinds = within(screen.getByRole('region', { name: 'fg_dofus_kinds_title' }))
    const box = (name: string) => kinds.getByRole('checkbox', { name }) as HTMLInputElement
    const checked = () => ['item_type_Trophy', 'item_type_Prysmaradite', 'item_type_Dofus'].map(name => box(name).checked)
    expect(checked()).toEqual([true, true, true])

    fireEvent.click(box('item_type_Trophy'))
    expect(checked()).toEqual([false, true, true])
    fireEvent.click(kinds.getByRole('button', { name: 'optimizer_slot_clear_all' }))
    expect(checked()).toEqual([false, false, false])
    fireEvent.click(box('item_type_Dofus'))
    expect(checked()).toEqual([false, false, true])
    fireEvent.click(kinds.getByRole('button', { name: 'optimizer_slot_mark_all' }))
    expect(checked()).toEqual([true, true, true])
    fireEvent.click(box('item_type_Prysmaradite'))
    unmount()
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).excludedKinds).toEqual(['Prysmaradite'])
  })
})

describe('OptimizerModal pro magesmithy', () => {
  it('shows the limit and each line, capped at what weight 30 buys', () => {
    useBuildStore.setState({ selectedClass: 'iop', equipped: {} })
    useDataStore.setState({ equipment: DOFUS, sets: [] })
    const { unmount } = render(<MemoryRouter><OptimizerModal open onClose={() => {}} /></MemoryRouter>)
    expect(screen.queryByRole('combobox', { name: 'fg_pro_max' })).toBeNull()
    fireEvent.click(screen.getByRole('checkbox', { name: 'fg_pro_exo' }))
    const groups = screen.getAllByRole('radiogroup', { name: 'fg_pro_line_cap' })
    const steps = (g: HTMLElement) => within(g).getAllByRole('radio')
    expect(steps(groups[0]).map(b => b.getAttribute('aria-checked'))).toEqual(['false', 'false', 'false', 'false', 'true'])
    expect(groups.slice(1).map(g => steps(g).length)).toEqual([2, 2, 2, 2, 2, 2])
    fireEvent.click(steps(groups[0])[2])
    expect(steps(groups[0])[2].getAttribute('aria-checked')).toBe('true')
    fireEvent.click(screen.getByRole('checkbox', { name: 'stat_spell_dmg' }))
    fireEvent.change(screen.getByRole('combobox', { name: 'fg_pro_max' }), { target: { value: '4' } })
    unmount()
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)!)
    expect(saved).toMatchObject({ proExo: true, proExoMax: 4, proExoCaps: { resElemental: 3 } })
    expect(saved.proExoWeight).toBeUndefined()
    expect(saved.proExoLines).not.toContain('spellDamagePercent')
  })
})

describe('OptimizerModal advanced forge settings', () => {
  it('switches to the custom intensity from the preset it was running', () => {
    useBuildStore.setState({ selectedClass: 'iop', equipped: {} })
    useDataStore.setState({ equipment: DOFUS, sets: [] })
    const { unmount } = render(<MemoryRouter><OptimizerModal open onClose={() => {}} /></MemoryRouter>)
    expect(screen.queryByRole('radio', { name: 'optimizer_intensity_custom' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /fg_advanced/ }))
    fireEvent.change(screen.getByRole('combobox', { name: 'fg_adv_stall' }), { target: { value: '45' } })
    expect(screen.getByRole('radio', { name: 'optimizer_intensity_custom' }).getAttribute('aria-checked')).toBe('true')
    expect(screen.getByText('optimizer_intensity_custom_hint')).toBeTruthy()
    fireEvent.click(screen.getByRole('radio', { name: 'optimizer_intensity_quick' }))
    expect(screen.queryByRole('radio', { name: 'optimizer_intensity_custom' })).toBeNull()
    unmount()
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toMatchObject({ intensity: 'quick', custom: { stallSec: 45, capSec: 120 } })
  })
})

describe('OptimizerModal stop rule', () => {
  afterEach(() => vi.useRealTimers())

  it('tempers once the stall window passes, longer while a minimum is missing', () => {
    vi.useFakeTimers({ toFake: ['performance', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'] })
    const workers: { onmessage: ((e: MessageEvent) => void) | null; messages: { type: string }[] }[] = []
    class FakeWorker {
      onmessage: ((event: MessageEvent) => void) | null = null
      messages: { type: string }[] = []
      constructor() { workers.push(this) }
      postMessage(message: { type: string }) { this.messages.push(message) }
      terminate() {}
    }
    vi.stubGlobal('Worker', FakeWorker)
    useBuildStore.setState({ selectedClass: 'iop', equipped: {} })
    useDataStore.setState({ equipment: DOFUS, sets: [] })
    const order = makeDefaultConfig()
    persistConfig({ ...order, stats: order.stats.map(r => r.stat === 'ap' ? activatedReq('ap') : r), intensity: 'custom', custom: { threads: 1, capSec: 0, stallSec: 5 } })
    render(<MemoryRouter><OptimizerModal open onClose={() => {}} /></MemoryRouter>)
    fireEvent.click(screen.getByRole('button', { name: /optimizer_light_forge/ }))
    const report = (score: number, met: boolean) => act(() => {
      const result = { equipped: {}, stats: {}, score, meetsRequired: met, conditionsOk: true, allocated: {}, scrolled: {}, exo: {}, runes: {}, requirementsMet: 0, requirementsTotal: 1 }
      workers.forEach(w => w.onmessage?.({ data: { type: 'report', report: { generation: 1, evaluations: 1, bestScore: score, results: [result] } } } as MessageEvent))
    })
    const finished = () => workers.some(w => w.messages.some(m => m.type === 'finish'))
    report(-100, false)
    act(() => { vi.advanceTimersByTime(6_000) })
    report(-100, false)
    expect(finished()).toBe(false)
    act(() => { vi.advanceTimersByTime(5_000) })
    report(-100, false)
    expect(finished()).toBe(true)
  })
})
