/// <reference lib="webworker" />
import type { OptimizerBuildBase, ForgeReport } from '@/features/optimizer/types.ts'
import type { AppItem, AppSet } from '@/data/loaders.ts'
import type { SlotId } from '@/store/buildStore.ts'

// One share of a forging run. The Rust side keeps the whole search state
// between calls; this Worker drives it in short steps from a setTimeout loop
// so 'finish' and migrant messages land between generations.
type Equipped = Partial<Record<SlotId, number>>

type IncomingMessage =
  | { type: 'init'; config: unknown; items: AppItem[]; sets: AppSet[]; base: OptimizerBuildBase; seed: number; seedBuilds?: Equipped[] }
  | { type: 'stoke' }
  | { type: 'run' }
  | { type: 'finish'; temperMs: number }
  | { type: 'inject'; builds: Equipped[] }

type WasmForge = {
  step:      (budgetMs: number) => ForgeReport
  temper:    (budgetMs: number) => ForgeReport
  stoke:     () => void
  emigrants: () => Equipped[]
  inject:    (builds: unknown) => void
  free:      () => void
}

type WasmModule = {
  default:         (init?: { module_or_path: string }) => Promise<unknown>
  init_panic_hook: () => void
  WasmForge:       new (config: unknown, items: unknown, sets: unknown, base: unknown, seed: number) => WasmForge
}

const STEP_BUDGET_MS = 150
// Must match MIGRATION_EVERY in rust-optimizer/src/forge.rs.
const MIGRATION_EVERY = 41
// A short tempering pass every this many generations feeds polished pieces
// back into the population while the forge keeps running.
const HAMMER_EVERY = 30
const HAMMER_MS = 250

let wasmModule: WasmModule | null | undefined // undefined = not attempted yet, null = failed
let forge: WasmForge | null = null
let running = false
let lastMigration = 0
let lastHammer = 0

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

function fail(err: unknown) {
  console.error('[optimizer.worker] forge failed:', err)
  running = false
  self.postMessage({ type: 'error', message: 'wasm-run-failed' })
}

function loop() {
  if (!running || !forge) return
  try {
    let report = forge.step(STEP_BUDGET_MS)
    if (report.generation - lastHammer >= HAMMER_EVERY) {
      lastHammer = report.generation
      report = forge.temper(HAMMER_MS)
    }
    const wave = Math.floor(report.generation / MIGRATION_EVERY)
    let emigrants: Equipped[] | undefined
    if (wave > lastMigration) {
      lastMigration = wave
      emigrants = forge.emigrants()
    }
    self.postMessage({ type: 'report', report, emigrants })
  } catch (err) {
    fail(err)
    return
  }
  setTimeout(loop, 0)
}

// One message at a time: a 'finish' that lands while 'init' is still loading
// the engine must wait for the forge, or it would never be answered.
let pending: Promise<void> = Promise.resolve()
self.onmessage = (e: MessageEvent) => {
  pending = pending.then(() => handleMessage(e.data as IncomingMessage)).catch(fail)
}

async function handleMessage(msg: IncomingMessage) {
  if (msg.type === 'init') {
    running = false
    lastMigration = 0
    lastHammer = 0
    const wasm = await loadWasm()
    if (!wasm) {
      self.postMessage({ type: 'error', message: 'wasm-unavailable' })
      return
    }
    try {
      forge?.free()
      forge = new wasm.WasmForge(msg.config, msg.items, msg.sets, msg.base, msg.seed)
      if (msg.seedBuilds?.length) forge.inject(msg.seedBuilds)
      self.postMessage({ type: 'ready' })
    } catch (err) {
      forge = null
      fail(err)
    }
    return
  }
  if (msg.type === 'run') {
    if (!forge || running) return
    running = true
    loop()
    return
  }
  if (msg.type === 'finish') {
    running = false
    if (!forge) return
    try {
      self.postMessage({ type: 'tempered', report: forge.temper(msg.temperMs) })
    } catch (err) {
      fail(err)
    }
    return
  }
  if (msg.type === 'stoke') {
    forge?.stoke()
    return
  }
  if (msg.type === 'inject') {
    forge?.inject(msg.builds)
  }
}
