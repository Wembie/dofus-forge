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
 * src/workers/optimizer.worker.ts) as plain JS values, and returns the same
 * `BuildResult[]` shape back — a drop-in replacement for the TS engine at
 * this one call site, nothing else about the worker's protocol changes.
 */
export function run_optimizer_wasm(config: any, items: any, sets: any, base: any): any;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly init_panic_hook: () => void;
    readonly run_optimizer_wasm: (a: any, b: any, c: any, d: any) => [number, number, number];
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
