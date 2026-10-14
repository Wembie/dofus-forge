/* tslint:disable */
/* eslint-disable */

/**
 * Stateful solver handle owned by one Worker. The Worker calls `step()` in a
 * setTimeout loop so it can pause, resume, or accept migrants between steps.
 */
export class WasmSolver {
    free(): void;
    [Symbol.dispose](): void;
    inject(equipped: any): void;
    constructor(config: any, items: any, sets: any, base: any, seed: number);
    /**
     * Runs whole generations until `budget_ms` has elapsed (at least one,
     * at most `max_generations` in total), then reports the current top
     * builds.
     */
    step(budget_ms: number, max_generations: number): any;
}

/**
 * Call once at Worker startup — makes a Rust panic show a real message and
 * stack trace in the browser console instead of an opaque "unreachable"
 * trap, which is otherwise all WASM panics surface as.
 */
export function init_panic_hook(): void;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly __wbg_wasmsolver_free: (a: number, b: number) => void;
    readonly init_panic_hook: () => void;
    readonly wasmsolver_inject: (a: number, b: any) => void;
    readonly wasmsolver_new: (a: any, b: any, c: any, d: any, e: number) => [number, number, number];
    readonly wasmsolver_step: (a: number, b: number, c: number) => [number, number, number];
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
