import { describe, it, expect, vi, afterEach } from 'vitest'

// The worker builds the engine URL from self.location.origin; a data: URL
// origin turns it into an inline fake engine (the rest of the URL lands in a
// trailing comment). Its init waits on a gate the test opens.
const ENGINE = `
export default () => globalThis.__forgeGate;
export const init_panic_hook = () => {};
export class WasmForge {
  step() { return { generation: 0, evaluations: 0, bestScore: 0, results: [] } }
  temper() { return { generation: 1, evaluations: 0, bestScore: 0, results: [] } }
  stoke() {}
  emigrants() { return [] }
  inject() {}
  free() {}
}
//`

type FakeSelf = { postMessage: ReturnType<typeof vi.fn>; location: { origin: string }; onmessage: ((e: { data: unknown }) => void) | null }

afterEach(() => {
  vi.unstubAllGlobals()
  delete (globalThis as Record<string, unknown>).__forgeGate
})

describe('optimizer worker', () => {
  it("answers a 'finish' sent while 'init' is still loading the engine", async () => {
    let open!: () => void
    ;(globalThis as Record<string, unknown>).__forgeGate = new Promise<void>(r => { open = r })
    const fake: FakeSelf = {
      postMessage: vi.fn(),
      location:    { origin: `data:text/javascript,${encodeURIComponent(ENGINE)}` },
      onmessage:   null,
    }
    vi.stubGlobal('self', fake)
    await import('../optimizer.worker.ts')

    fake.onmessage!({ data: { type: 'init', config: {}, items: [], sets: [], base: {}, seed: 1 } })
    fake.onmessage!({ data: { type: 'finish', temperMs: 10 } })
    await new Promise(r => setTimeout(r, 20))
    open()

    await vi.waitFor(() => {
      expect(fake.postMessage.mock.calls.map(c => (c[0] as { type: string }).type)).toEqual(['ready', 'tempered'])
    })
  })
})
