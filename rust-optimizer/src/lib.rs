pub mod characteristics;
pub mod optimizer;
pub mod optimizer_types;
pub mod stat_map;
pub mod stats;
pub mod types;

use optimizer_types::{BuildResult, CatalogItem, CatalogSet, OptimizerBuildBase, OptimizerConfig};
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
/// src/workers/optimizer.worker.ts) as plain JS values, and returns the same
/// `BuildResult[]` shape back — a drop-in replacement for the TS engine at
/// this one call site, nothing else about the worker's protocol changes.
#[wasm_bindgen]
pub fn run_optimizer_wasm(config: JsValue, items: JsValue, sets: JsValue, base: JsValue) -> Result<JsValue, JsValue> {
    let config: OptimizerConfig = serde_wasm_bindgen::from_value(config).map_err(|e| JsValue::from_str(&format!("bad config: {e}")))?;
    let items: Vec<CatalogItem> = serde_wasm_bindgen::from_value(items).map_err(|e| JsValue::from_str(&format!("bad items: {e}")))?;
    let sets: Vec<CatalogSet> = serde_wasm_bindgen::from_value(sets).map_err(|e| JsValue::from_str(&format!("bad sets: {e}")))?;
    let base: OptimizerBuildBase = serde_wasm_bindgen::from_value(base).map_err(|e| JsValue::from_str(&format!("bad base: {e}")))?;

    let results: Vec<BuildResult> = optimizer::run_optimizer(config, items, sets, base);

    serde_wasm_bindgen::to_value(&results).map_err(|e| JsValue::from_str(&format!("bad results: {e}")))
}
