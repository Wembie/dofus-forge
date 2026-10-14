/// <reference lib="webworker" />
import type { OptimizerConfig, OptimizerBuildBase, SolverReport } from '@/features/optimizer/types.ts'
import type { AppItem, AppSet } from '@/data/loaders.ts'
import type { SlotId } from '@/store/buildStore.ts'

// One solver island group per Worker. The Rust side keeps the whole search
// state between calls; this Worker only drives it in short steps through a
// setTimeout loop, which is what lets 'stop' and 'inject' messages land
// between generations instead of waiting for a whole blocking search.
type WireConfig = Omit<OptimizerConfig, 'lockedSlots'> & { lockedSlots: SlotId[] }

type IncomingMessage =
  | { type: 'init'; config: WireConfig; items: AppItem[]; sets: AppSet[]; base: OptimizerBuildBase; seed: number }
  | { type: 'start' }
  | { type: 'stop' }
  | { type: 'inject'; equipped: Partial<Record<SlotId, number>> }

type WasmSolver = {
  step:   (budgetMs: number, maxGenerations: number) => SolverReport
  inject: (equipped: unknown) => void
  free:   () => void
}

type WasmModule = {
  default:         (init?: { module_or_path: string }) => Promise<unknown>
  init_panic_hook: () => void
  WasmSolver:      new (config: unknown, items: unknown, sets: unknown, base: unknown, seed: number) => WasmSolver
}

const STEP_BUDGET_MS = 120

let wasmModule: WasmModule | null | undefined // undefined = not attempted yet, null = failed
let solver: WasmSolver | null = null
let maxGenerations = 2500
let running = false

async function loadWasm(): Promise<WasmModule | null> {
  if (wasmModule !== undefined) return wasmModule
  try {
    const root = `${self.location.origin}${import.meta.env.BASE_URL}wasm/`
    const mod = await import(/* @vite-ignore */ `${root}dofus_forge_optimizer.js`) as WasmModule
    await mod.default({ module_or_path: `${root}dofus_forge_optimizer_bg.wasm` })
    mod.init_panic_hook()
    wasmModule = mod
  } catch (err) {
    console.error('[optimizer.worker] WASM engine failed to load:', err)
    wasmModule = null
  }
  return wasmModule
}

function loop() {
  if (!running || !solver) return
  try {
    const report = solver.step(STEP_BUDGET_MS, maxGenerations)
    self.postMessage({ type: 'report', report })
    if (report.generation >= maxGenerations) {
      running = false
      self.postMessage({ type: 'paused', reachedLimit: true })
      return
    }
  } catch (err) {
    console.error('[optimizer.worker] WASM step failed:', err)
    running = false
    self.postMessage({ type: 'error', message: 'wasm-run-failed' })
    return
  }
  setTimeout(loop, 0)
}

self.onmessage = (e: MessageEvent) => {
  void handleMessage(e.data as IncomingMessage)
}

async function handleMessage(msg: IncomingMessage) {
  if (msg.type === 'init') {
    running = false
    const wasm = await loadWasm()
    if (!wasm) {
      self.postMessage({ type: 'error', message: 'wasm-unavailable' })
      return
    }
    try {
      solver?.free()
      solver = new wasm.WasmSolver(msg.config, msg.items, msg.sets, msg.base, msg.seed)
      maxGenerations = msg.config.maxGenerations
      self.postMessage({ type: 'ready' })
    } catch (err) {
      console.error('[optimizer.worker] WASM init failed:', err)
      solver = null
      self.postMessage({ type: 'error', message: 'wasm-run-failed' })
    }
    return
  }
  if (msg.type === 'start') {
    if (!solver || running) return
    running = true
    loop()
    return
  }
  if (msg.type === 'stop') {
    if (!running) return
    running = false
    self.postMessage({ type: 'paused', reachedLimit: false })
    return
  }
  if (msg.type === 'inject') {
    solver?.inject(msg.equipped)
  }
}
