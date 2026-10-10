/// <reference lib="webworker" />
import { runOptimizer } from '@/engine/optimizer.ts'
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

// The Rust/WASM engine (rust-optimizer/) is the same search algorithm as
// engine/optimizer.ts, ported for an exhaustive triples-of-sets phase the TS
// version doesn't have time budget for — a plain static asset
// (public/wasm/), not part of the Vite build graph, so a plain runtime
// import by URL rather than a module specifier. Loaded lazily (only once,
// the first 'run') and only ever tried once per Worker lifetime: if it
// fails to load or run for any reason (older browser, blocked asset, a bug),
// every run for the rest of this Worker's life falls back to the
// already-shipped, already-correct TS engine instead of retrying and
// failing the same way again.
type WasmModule = {
  run_optimizer_wasm: (config: unknown, items: unknown, sets: unknown, base: unknown) => BuildResult[]
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
    console.warn('[optimizer.worker] WASM engine unavailable, falling back to TypeScript engine:', err)
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

    const { config: rawConfig, items = [], sets = [], base } = msg
    const wireConfig = rawConfig // already { ...config, lockedSlots: string[] } — the exact wire shape both engines expect

    const wasm = await loadWasm()
    if (wasm) {
      // No incremental progress from the single synchronous WASM call (see
      // rust-optimizer/src/optimizer.rs's module comment) — the modal's
      // spinner-only fallback when `progress` stays null already covers
      // this without any UI change.
      try {
        const results = wasm.run_optimizer_wasm(wireConfig, items, sets, base)
        if (!cancelRef.cancelled) self.postMessage({ type: 'done', results })
        else self.postMessage({ type: 'cancelled' })
        return
      } catch (err) {
        console.warn('[optimizer.worker] WASM run failed, falling back to TypeScript engine:', err)
        wasmModule = null
      }
    }

    const config: OptimizerConfig = {
      ...rawConfig,
      lockedSlots: new Set(rawConfig.lockedSlots),
    }

    const results = runOptimizer(
      config,
      items,
      sets,
      base!,
      (progress: OptimizerProgress) => self.postMessage({ type: 'progress', ...progress }),
      cancelRef,
    )

    if (!cancelRef.cancelled) {
      self.postMessage({ type: 'done', results })
    } else {
      self.postMessage({ type: 'cancelled' })
    }
  }
}
