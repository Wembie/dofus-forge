pub mod characteristics;
pub mod optimizer_types;
pub mod solver;
pub mod stat_map;
pub mod stats;
pub mod types;

use optimizer_types::{CatalogItem, CatalogSet, OptimizerBuildBase, OptimizerConfig};
use serde::Serialize;
use std::collections::HashMap;
use wasm_bindgen::prelude::*;

/// Call once at Worker startup — makes a Rust panic show a real message and
/// stack trace in the browser console instead of an opaque "unreachable"
/// trap, which is otherwise all WASM panics surface as.
#[wasm_bindgen]
pub fn init_panic_hook() {
    console_error_panic_hook::set_once();
}

// json_compatible(): Rust maps become plain JS objects, which is how every
// caller reads `result.equipped[slot]` (a JS Map would read as undefined).
fn to_js<T: Serialize>(value: &T) -> Result<JsValue, JsValue> {
    let serializer = serde_wasm_bindgen::Serializer::json_compatible();
    value.serialize(&serializer).map_err(|e| JsValue::from_str(&format!("serialize: {e}")))
}

/// Stateful solver handle owned by one Worker. The Worker calls `step()` in a
/// setTimeout loop so it can pause, resume, or accept migrants between steps.
#[wasm_bindgen]
pub struct WasmSolver {
    inner: solver::Solver,
}

#[wasm_bindgen]
impl WasmSolver {
    #[wasm_bindgen(constructor)]
    pub fn new(config: JsValue, items: JsValue, sets: JsValue, base: JsValue, seed: u32) -> Result<WasmSolver, JsValue> {
        let config: OptimizerConfig = serde_wasm_bindgen::from_value(config).map_err(|e| JsValue::from_str(&format!("bad config: {e}")))?;
        let items: Vec<CatalogItem> = serde_wasm_bindgen::from_value(items).map_err(|e| JsValue::from_str(&format!("bad items: {e}")))?;
        let sets: Vec<CatalogSet> = serde_wasm_bindgen::from_value(sets).map_err(|e| JsValue::from_str(&format!("bad sets: {e}")))?;
        let base: OptimizerBuildBase = serde_wasm_bindgen::from_value(base).map_err(|e| JsValue::from_str(&format!("bad base: {e}")))?;
        Ok(WasmSolver { inner: solver::Solver::new(config, items, sets, base, seed as u64) })
    }

    /// Runs whole generations until `budget_ms` has elapsed (at least one,
    /// at most `max_generations` in total), then reports the current top
    /// builds.
    pub fn step(&mut self, budget_ms: f64, max_generations: u32) -> Result<JsValue, JsValue> {
        let start = js_sys::Date::now();
        while self.inner.generation() < max_generations as u64 {
            self.inner.run_generation();
            if js_sys::Date::now() - start >= budget_ms {
                break;
            }
        }
        to_js(&self.inner.report())
    }

    pub fn inject(&mut self, equipped: JsValue) {
        if let Ok(equipped) = serde_wasm_bindgen::from_value::<HashMap<String, i64>>(equipped) {
            self.inner.inject(&equipped);
        }
    }
}
