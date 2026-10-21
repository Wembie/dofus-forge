// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent, within } from '@testing-library/react'
import '@/test/i18n.ts'
import type { AppItem } from '@/data/loaders.ts'
import { PassivesPanel, plainText } from '../PassivesPanel.tsx'

afterEach(cleanup)

const item = (ankama_id: number, name: string, ability: string): AppItem =>
  ({ ankama_id, name, level: 200, type: 'Dofus', slot: 'dofus', effects: [], set_id: null, ability } as unknown as AppItem)

const TURQUOISE = item(739, 'Turquoise Dofus', 'Turquoise Blue: • When the bearer lands a critical hit, they gain 1% final damage for 3 turns (stackable 10 times).')
const ABYSSAL   = item(18043, 'Abyssal Dofus', 'Descent to the Abysses: • 1 MP if no adjacent enemies. Otherwise, 1 AP.')
const SURPRYZ   = item(22001, 'Surpryz', 'Surpryz: • 100% Critical on the first turn, 35% on the second turn and 15% on the third turn.')
const SILVER    = item(20286, 'Sparkling Silver Dofus', 'Promise of Silver: • 20% final damage after falling below 20% health.')
const EMERALD   = item(737, 'Emerald Dofus', 'Emerald Green: • shield per adjacent enemy.')
const PLAIN_HAT = item(1, 'Plain Hat', '')

describe('PassivesPanel', () => {
  it('lists only equipped items with a passive', () => {
    render(<PassivesPanel items={[PLAIN_HAT, TURQUOISE, EMERALD]} state={{}} onChange={() => {}} />)
    expect(screen.getByText('Turquoise Dofus')).toBeTruthy()
    expect(screen.getByText('Emerald Dofus')).toBeTruthy()
    expect(screen.queryByText('Plain Hat')).toBeNull()
    expect(screen.getByText('passives_text_only')).toBeTruthy()
  })

  it('renders nothing without passive items', () => {
    const { container } = render(<PassivesPanel items={[PLAIN_HAT]} state={{}} onChange={() => {}} />)
    expect(container.innerHTML).toBe('')
  })

  it('stacks: a pip sets the count directly, clicking the current one steps back, ± move by one', () => {
    const onChange = vi.fn()
    render(<PassivesPanel items={[TURQUOISE]} state={{ '739.0': 3 }} onChange={onChange} />)
    fireEvent.click(screen.getAllByRole('button', { name: 'passives_set_stacks' })[6])
    expect(onChange).toHaveBeenLastCalledWith('739.0', 7)
    fireEvent.click(screen.getAllByRole('button', { name: 'passives_set_stacks' })[2])
    expect(onChange).toHaveBeenLastCalledWith('739.0', 2)
    fireEvent.click(screen.getByRole('button', { name: 'passives_more' }))
    expect(onChange).toHaveBeenLastCalledWith('739.0', 4)
    fireEvent.click(screen.getByRole('button', { name: 'passives_less' }))
    expect(onChange).toHaveBeenLastCalledWith('739.0', 2)
    expect(screen.getByText('3/10')).toBeTruthy()
  })

  it('exclusive cases are radios with an Off option; Prysmaradite options name their turn', () => {
    const onChange = vi.fn()
    render(<PassivesPanel items={[ABYSSAL, SURPRYZ]} state={{ '18043.0': 1 }} onChange={onChange} />)
    const [abyssal, surpryz] = screen.getAllByRole('radiogroup')
    const radios = within(abyssal).getAllByRole('radio')
    expect(radios.map(r => r.getAttribute('aria-checked'))).toEqual(['false', 'true', 'false'])
    fireEvent.click(radios[2])
    expect(onChange).toHaveBeenLastCalledWith('18043.0', 2)
    fireEvent.click(radios[0])
    expect(onChange).toHaveBeenLastCalledWith('18043.0', 0)
    expect(within(surpryz).getAllByText('passives_turn')).toHaveLength(3)
  })

  it('a single case is a switch', () => {
    const onChange = vi.fn()
    render(<PassivesPanel items={[SILVER]} state={{}} onChange={onChange} />)
    const sw = screen.getByRole('switch')
    expect(sw.getAttribute('aria-checked')).toBe('false')
    fireEvent.click(sw)
    expect(onChange).toHaveBeenLastCalledWith('20286.0', 1)
  })

  it('shows the combined bonus and offers to turn everything off', () => {
    const onReset = vi.fn()
    render(<PassivesPanel items={[TURQUOISE, ABYSSAL]} state={{ '739.0': 4, '18043.0': 2 }} onChange={() => {}} onReset={onReset} />)
    const total = screen.getByText('passives_total').parentElement!
    expect(total.textContent).toContain('+4stat_final_dmg')
    expect(total.textContent).toContain('+1stat_ap')
    fireEvent.click(screen.getByRole('button', { name: /passives_reset/ }))
    expect(onReset).toHaveBeenCalledTimes(1)
  })

  it('read-only (published build): shows the settings but nothing can be changed', () => {
    render(<PassivesPanel items={[TURQUOISE, ABYSSAL]} state={{ '739.0': 4 }} />)
    expect(screen.queryByRole('button', { name: 'passives_more' })).toBeNull()
    expect(screen.getAllByRole('button', { name: 'passives_set_stacks' }).every(b => (b as HTMLButtonElement).disabled)).toBe(true)
    expect(screen.getAllByRole('radio').every(b => (b as HTMLButtonElement).disabled)).toBe(true)
    expect(screen.queryByText('passives_note')).toBeNull()
  })

  it('the in-game text is one click away', () => {
    render(<PassivesPanel items={[TURQUOISE]} state={{}} onChange={() => {}} />)
    expect(screen.queryByText(/lands a critical hit/)).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /passives_show_text/ }))
    expect(screen.getByText(/lands a critical hit/)).toBeTruthy()
  })

  it('names the passive under the item, unless it is the same name (Prysmaradites)', () => {
    render(<PassivesPanel items={[TURQUOISE, SURPRYZ]} state={{}} onChange={() => {}} />)
    expect(screen.getByText('Turquoise Blue')).toBeTruthy()
    expect(screen.getAllByText('Surpryz')).toHaveLength(1)
  })

  it('shared stacks: + stops at the common cap and the card says how much is used', () => {
    const MERIANA = item(32121, 'Meriana', 'Meriana: • 5 MP Reduction • 5 AP Reduction (stackable 8 times, shared among effects)')
    render(<PassivesPanel items={[MERIANA]} state={{ '32121.0': 6, '32121.1': 2 }} onChange={() => {}} />)
    const plus = screen.getAllByRole('button', { name: 'passives_more' }) as HTMLButtonElement[]
    expect(plus.map(b => b.disabled)).toEqual([true, true])
    expect(screen.getByText('passives_shared')).toBeTruthy()
  })
})

describe('plainText (item text markup)', () => {
  it('drops game markup and never leaves an angle bracket, even from nested or broken tags', () => {
    expect(plainText('<sprite name="eau"> 400 Chance > <sprite name="terre"> 400 Strength')).toBe(' 400 Chance   400 Strength')
    for (const s of ['<scr<script>ipt>alert(1)</script>', '<<img src=x onerror=alert(1)>>', 'a < b > c', '<sprite name="eau"']) {
      expect(plainText(s)).not.toMatch(/[<>]/)
    }
  })

  it('the in-game text shown in a card has no markup left', () => {
    const DOFUSTEUSE = item(958, 'Dofusteuse', 'Dofus Blessing: • Increases one characteristic per turn: • <sprite name="eau"> 400 Chance > <sprite name="terre"> 400 Strength')
    render(<PassivesPanel items={[DOFUSTEUSE]} state={{}} onChange={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /passives_show_text/ }))
    const list = screen.getByRole('list')
    expect(list.textContent).toContain('400 Chance')
    expect(list.textContent).not.toMatch(/[<>]/)
  })
})
