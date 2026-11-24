import { create } from 'zustand'
import { DEFAULT_SCENARIO, LINEAGES, type Scenario } from './bellaphone.ts'

export function sanitizeScenario(raw: unknown): Scenario {
  const value = (raw && typeof raw === 'object' ? raw : {}) as Partial<Scenario>
  return {
    lineage: LINEAGES.includes(value.lineage as typeof LINEAGES[number]) ? value.lineage! : 'none',
    radius: [1, 2, 3, 4].includes(value.radius!) ? value.radius! : 2,
    enemies: Number.isInteger(value.enemies) && value.enemies! >= 0 && value.enemies! <= 20 ? value.enemies! : 1,
    evolution: [1, 2, 3, 4, 5].includes(value.evolution!) ? value.evolution! : 1,
    element: ['earth', 'fire', 'water', 'air'].includes(value.element!) ? value.element! : 'air',
    timing: value.timing === 'end_turn' ? 'end_turn' : 'instant',
    inside: value.inside !== false, aura: value.aura === true,
    states: Array.isArray(value.states) ? [...new Set(value.states.filter(id => [7, 7291, 7300].includes(id)))] : [],
  }
}

export const useBellaphone = create<{ scenario: Scenario; update: (patch: Partial<Scenario>) => void }>(set => ({
  scenario: sanitizeScenario(DEFAULT_SCENARIO),
  update: patch => set(s => ({ scenario: sanitizeScenario({ ...s.scenario, ...patch }) })),
}))
