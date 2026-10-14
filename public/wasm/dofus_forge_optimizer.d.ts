/* tslint:disable */
/* eslint-disable */

/**
 * One Worker's share of a forging run. The Worker calls `step()` from a
 * setTimeout loop, so it can stop, exchange migrants or temper between steps.
 */
export class WasmForge {
    free(): void;
    [Symbol.dispose](): void;
    emigrants(): any;
    inject(builds: any): void;
    constructor(config: any, items: any, sets: any, base: any, seed: number);
    /**
     * Runs whole generations until `budget_ms` has elapsed (at least one),
     * then reports the best builds so far.
     */
    step(budget_ms: number): any;
    /**
     * Bellows: fresh material for every island but the best one.
     */
    stoke(): void;
    /**
     * Final local polish of the best builds, then the final report.
     */
    temper(budget_ms: number): any;
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
    readonly __wbg_wasmforge_free: (a: number, b: number) => void;
    readonly init_panic_hook: () => void;
    readonly wasmforge_emigrants: (a: number) => [number, number, number];
    readonly wasmforge_inject: (a: number, b: any) => void;
    readonly wasmforge_new: (a: any, b: any, c: any, d: any, e: number) => [number, number, number];
    readonly wasmforge_step: (a: number, b: number) => [number, number, number];
    readonly wasmforge_stoke: (a: number) => void;
    readonly wasmforge_temper: (a: number, b: number) => [number, number, number];
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
