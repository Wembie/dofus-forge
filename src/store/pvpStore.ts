import { create } from 'zustand'

export type PvpElement = 'earth' | 'fire' | 'water' | 'air' | 'neutral'

export type PvpResist = { fixed: number; percent: number }

type PvpState = {
  enabled: boolean
  resist:  Record<PvpElement, PvpResist>
  setEnabled: (enabled: boolean) => void
  setResist:  (elem: PvpElement, field: keyof PvpResist, value: number) => void
  reset:      () => void
}

const EMPTY_RESIST: Record<PvpElement, PvpResist> = {
  earth:   { fixed: 0, percent: 0 },
  fire:    { fixed: 0, percent: 0 },
  water:   { fixed: 0, percent: 0 },
  air:     { fixed: 0, percent: 0 },
  neutral: { fixed: 0, percent: 0 },
}

/**
 * PvP dummy simulator state — not part of BuildSnapshot/URL sharing,
 * this is a scratch tool for checking real damage against a target's
 * resistances, not build data to persist or share.
 */
export const usePvpStore = create<PvpState>(set => ({
  enabled: false,
  resist:  EMPTY_RESIST,
  setEnabled: enabled => set({ enabled }),
  setResist:  (elem, field, value) => set(s => ({
    resist: { ...s.resist, [elem]: { ...s.resist[elem], [field]: value } },
  })),
  reset: () => set({ resist: EMPTY_RESIST }),
}))
