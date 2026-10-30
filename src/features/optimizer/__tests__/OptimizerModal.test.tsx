// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import '@/test/i18n.ts'
import type { AppItem } from '@/data/loaders.ts'
import { OptimizerModal } from '../OptimizerModal.tsx'
import { makeDefaultConfig, persistConfig, STORAGE_KEY } from '../forgeConfig.ts'
import { useForgePicks } from '../forgePicks.ts'
import { useBuildStore, type SlotId } from '@/store/buildStore.ts'
import { useDataStore } from '@/store/dataStore.ts'

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
