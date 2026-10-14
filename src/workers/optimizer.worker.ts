/// <reference lib="webworker" />
import type { OptimizerConfig, OptimizerBuildBase, OptimizerProgress, BuildResult } from '@/features/optimizer/types.ts'
import type { AppItem, AppSet } from '@/data/loaders.ts'
import type { SlotId } from '@/store/buildStore.ts'

let cancelRef = { cancelled: false }

type IncomingMessage =
  | { type: 'cancel' }
  | {
      type:   'run'
      config: Omit<OptimizerConfig, 'lockedSlots'> & { lockedSlots: SlotId[] }
      items:  AppItem[]
      sets:   AppSet[]
      base:   OptimizerBuildBase
    }

// The Rust/WASM engine (rust-optimizer/) is the ONLY optimizer engine this
// app runs — a plain static asset (public/wasm/), not part of the Vite
// build graph, so a plain runtime import by URL rather than a module
// specifier. Loaded lazily (only once, the first 'run') and cached for the
// Worker's lifetime. There is deliberately no TypeScript fallback anymore:
// src/engine/optimizer.ts (the original, slower, less capable TS port) is
// kept in the repo purely as a tested reference implementation for
// cross-checking the Rust port's behavior in development — it is never
// imported here and ships zero bytes to users, since an unreferenced module
// isn't part of the bundle. A WASM load/run failure is a real, surfaced
// error instead of a silent drop to a weaker, duplicate-maintenance-tax
// engine that could quietly drift out of sync (exactly what happened
// across several bugs found and fixed only in one of the two engines
// before this change).
type WasmModule = {
  run_optimizer_wasm: (config: unknown, items: unknown, sets: unknown, base: unknown, onProgress: (update: OptimizerProgress) => boolean) => BuildResult[]
  init_panic_hook: () => void
}
let wasmModule: WasmModule | null | undefined // undefined = not attempted yet, null = failed

async function loadWasm(): Promise<WasmModule | null> {
  if (wasmModule !== undefined) return wasmModule
  try {
    const url = `${self.location.origin}${import.meta.env.BASE_URL}wasm/dofus_forge_optimizer.js`
    const mod = await import(/* @vite-ignore */ url) as { default: (init?: { module_or_path: string }) => Promise<unknown> } & WasmModule
    await mod.default({ module_or_path: `${self.location.origin}${import.meta.env.BASE_URL}wasm/dofus_forge_optimizer_bg.wasm` })
    mod.init_panic_hook()
    wasmModule = mod
  } catch (err) {
    console.error('[optimizer.worker] WASM engine failed to load:', err)
    wasmModule = null
  }
  return wasmModule
}

self.onmessage = (e: MessageEvent) => {
  void handleMessage(e)
}

async function handleMessage(e: MessageEvent) {
  const msg = e.data as IncomingMessage

  if (msg.type === 'cancel') {
    cancelRef.cancelled = true
    return
  }

  if (msg.type === 'run') {
    cancelRef = { cancelled: false }

    const { config: wireConfig, items = [], sets = [], base } = msg

    const wasm = await loadWasm()
    if (!wasm) {
      self.postMessage({ type: 'error', message: 'wasm-unavailable' })
      return
    }

    // Called periodically DURING the synchronous WASM call (a real callback
    // across the Rust/JS boundary, not a message-passing round-trip, since
    // the whole search runs on this one blocking call) — forwards progress
    // to the main thread and doubles as the only way to interrupt an
    // in-progress search: returning false tells Rust to stop right there
    // and finish up with whatever it has (the guaranteed final polish still
    // runs), rather than the old all-or-nothing "wait for the full budget
    // or get nothing" cancel.
    const onProgress = (update: OptimizerProgress): boolean => {
      self.postMessage({ type: 'progress', ...update })
      return !cancelRef.cancelled
    }

    try {
      const results = wasm.run_optimizer_wasm(wireConfig, items, sets, base, onProgress)
      self.postMessage({ type: 'done', results })
    } catch (err) {
      console.error('[optimizer.worker] WASM run failed:', err)
      self.postMessage({ type: 'error', message: 'wasm-run-failed' })
    }
  }
}
