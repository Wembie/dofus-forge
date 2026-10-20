import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ClassSpells } from '@/data/spellLoaders.ts'

type Deferred<T> = { promise: Promise<T>; resolve: (v: T) => void }
function deferred<T>(): Deferred<T> {
  let resolve!: (v: T) => void
  const promise = new Promise<T>(r => { resolve = r })
  return { promise, resolve }
}

const gates = new Map<string, Deferred<unknown>>()
function gate<T>(key: string): Promise<T> {
  if (!gates.has(key)) gates.set(key, deferred())
  return gates.get(key)!.promise as Promise<T>
}
const open = (key: string, value: unknown) => { gate(key); gates.get(key)!.resolve(value) }

vi.mock('@/data/loaders.ts', () => ({
  loadVersion:    () => gate('version'),
  loadIndex:      (lang: string) => Promise.resolve([{ id: 1, name: `index-${lang}` }]),
  loadEquipment:  (lang: string) => Promise.resolve([{ ankama_id: 1, name: `item-${lang}`, effects: [] }]),
  loadSets:       (lang: string) => Promise.resolve([{ ankama_id: 2, name: `set-${lang}`, items: [] }]),
  loadClassNames: () => Promise.resolve({}),
}))

vi.mock('@/data/spellLoaders.ts', () => ({
  fetchSpells: (lang: string, slug: string) => gate(`spells:${lang}:${slug}`),
}))

const { useDataStore } = await import('../dataStore.ts')

const spells = (name: string): ClassSpells => ({ spells: [{ id: 1, name, levels: [] }] }) as unknown as ClassSpells
const flush = () => new Promise(r => setTimeout(r, 0))

beforeEach(() => {
  gates.clear()
  useDataStore.setState({ lang: 'en', loading: false, equipment: null, spells: new Map() })
})

describe('dataStore.load', () => {
  it('a language picked during the first load wins', async () => {
    const first  = useDataStore.getState().load('en')
    const second = useDataStore.getState().load('fr')
    open('version', { gameVersion: 'v1' })
    await Promise.all([first, second])

    const s = useDataStore.getState()
    expect(s.lang).toBe('fr')
    expect(s.loading).toBe(false)
    expect(s.equipment?.[0].name).toBe('item-fr')
  })
})

describe('dataStore.loadSpells', () => {
  it('keeps two classes loaded concurrently', async () => {
    const a = useDataStore.getState().loadSpells('en', 'iop')
    const b = useDataStore.getState().loadSpells('en', 'cra')
    open('spells:en:iop', spells('iop'))
    open('spells:en:cra', spells('cra'))
    open('spells:en:common', spells('common'))
    await Promise.all([a, b])

    expect([...useDataStore.getState().spells.keys()].sort()).toEqual(['common', 'cra', 'iop'])
  })

  it('drops results of a request made in a language no longer active', async () => {
    const p = useDataStore.getState().loadSpells('en', 'iop')
    await flush()
    useDataStore.setState({ lang: 'fr', spells: new Map() })
    open('spells:en:iop', spells('iop'))
    open('spells:en:common', spells('common'))
    await p

    expect(useDataStore.getState().spells.size).toBe(0)
  })
})
