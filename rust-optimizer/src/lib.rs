pub mod characteristics;
pub mod optimizer;
pub mod optimizer_types;
pub mod stat_map;
pub mod stats;
pub mod types;

use optimizer::ProgressUpdate;
use optimizer_types::{BuildResult, CatalogItem, CatalogSet, OptimizerBuildBase, OptimizerConfig};
use serde::Serialize;
use wasm_bindgen::prelude::*;

/// Call once at Worker startup — makes a Rust panic show a real message and
/// stack trace in the browser console instead of an opaque "unreachable"
/// trap, which is otherwise all WASM panics surface as.
#[wasm_bindgen]
pub fn init_panic_hook() {
    console_error_panic_hook::set_once();
}

/// The optimizer's WASM entry point. Takes the same `config`/`items`/`sets`/
/// `base` shapes the TS worker already builds for `runOptimizer()` (see
/// src/workers/optimizer.worker.ts) as plain JS values, plus a JS callback
/// invoked periodically during the search (see `optimizer::ProgressUpdate`'s
/// doc comment) — returning `false` from it stops the search early and
/// still returns a fully-polished result, not a raw mid-search snapshot.
/// Returns the same `BuildResult[]` shape as before — the callback is new,
/// nothing else about the worker's protocol changes.
#[wasm_bindgen]
pub fn run_optimizer_wasm(config: JsValue, items: JsValue, sets: JsValue, base: JsValue, on_progress: js_sys::Function) -> Result<JsValue, JsValue> {
    let config: OptimizerConfig = serde_wasm_bindgen::from_value(config).map_err(|e| JsValue::from_str(&format!("bad config: {e}")))?;
    let items: Vec<CatalogItem> = serde_wasm_bindgen::from_value(items).map_err(|e| JsValue::from_str(&format!("bad items: {e}")))?;
    let sets: Vec<CatalogSet> = serde_wasm_bindgen::from_value(sets).map_err(|e| JsValue::from_str(&format!("bad sets: {e}")))?;
    let base: OptimizerBuildBase = serde_wasm_bindgen::from_value(base).map_err(|e| JsValue::from_str(&format!("bad base: {e}")))?;

    // Any failure converting the update to JS, or the callback itself
    // throwing, is treated as "keep going" rather than aborting the whole
    // search over what's purely a progress-reporting side channel.
    let progress_callback = |update: ProgressUpdate| -> bool {
        let serializer = serde_wasm_bindgen::Serializer::json_compatible();
        let Ok(payload) = update.serialize(&serializer) else { return true };
        match on_progress.call1(&JsValue::NULL, &payload) {
            Ok(v) => v.as_bool().unwrap_or(true),
            Err(_) => true,
        }
    };

    let results: Vec<BuildResult> = optimizer::run_optimizer_with_progress(config, items, sets, base, &progress_callback);

    // serde_wasm_bindgen's default serializer turns a Rust HashMap into a JS
    // Map, not a plain object — but BuildResult.equipped is read everywhere
    // on the JS side as a plain object (`result.equipped[slot]`, matching
    // the TS engine's `Partial<Record<SlotId, number>>`). json_compatible()
    // serializes maps as plain objects instead, matching what every caller
    // already expects (confirmed in a real browser: without this, computed
    // stats were correct — proving items WERE being equipped internally —
    // but every result showed zero equipped items, because `equipped[slot]`
    // on a real Map is always undefined).
    let serializer = serde_wasm_bindgen::Serializer::json_compatible();
    results.serialize(&serializer).map_err(|e| JsValue::from_str(&format!("bad results: {e}")))
}
