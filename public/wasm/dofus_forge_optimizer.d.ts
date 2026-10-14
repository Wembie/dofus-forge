/* tslint:disable */
/* eslint-disable */

/**
 * Call once at Worker startup — makes a Rust panic show a real message and
 * stack trace in the browser console instead of an opaque "unreachable"
 * trap, which is otherwise all WASM panics surface as.
 */
export function init_panic_hook(): void;

/**
 * The optimizer's WASM entry point. Takes the same `config`/`items`/`sets`/
 * `base` shapes the TS worker already builds for `runOptimizer()` (see
 * src/workers/optimizer.worker.ts) as plain JS values, plus a JS callback
 * invoked periodically during the search (see `optimizer::ProgressUpdate`'s
 * doc comment) — returning `false` from it stops the search early and
 * still returns a fully-polished result, not a raw mid-search snapshot.
 * Returns the same `BuildResult[]` shape as before — the callback is new,
 * nothing else about the worker's protocol changes.
 */
export function run_optimizer_wasm(config: any, items: any, sets: any, base: any, on_progress: Function): any;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly init_panic_hook: () => void;
    readonly run_optimizer_wasm: (a: any, b: any, c: any, d: any, e: any) => [number, number, number];
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
    readonly __wbindgen_exn_store: (a: number) => void;
    readonly __externref_table_alloc: () => number;
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __wbindgen_free: (a: number, b: number, c: number) => void;
    readonly __externref_table_dealloc: (a: number) => void;
    readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
