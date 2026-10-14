pub mod characteristics;
pub mod optimizer_types;
pub mod forge;
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

/// One Worker's share of a forging run. The Worker calls `step()` from a
/// setTimeout loop, so it can stop, exchange migrants or temper between steps.
#[wasm_bindgen]
pub struct WasmForge {
    inner: forge::Forge,
}

#[wasm_bindgen]
impl WasmForge {
    #[wasm_bindgen(constructor)]
    pub fn new(config: JsValue, items: JsValue, sets: JsValue, base: JsValue, seed: u32) -> Result<WasmForge, JsValue> {
        let config: OptimizerConfig = serde_wasm_bindgen::from_value(config).map_err(|e| JsValue::from_str(&format!("bad config: {e}")))?;
        let items: Vec<CatalogItem> = serde_wasm_bindgen::from_value(items).map_err(|e| JsValue::from_str(&format!("bad items: {e}")))?;
        let sets: Vec<CatalogSet> = serde_wasm_bindgen::from_value(sets).map_err(|e| JsValue::from_str(&format!("bad sets: {e}")))?;
        let base: OptimizerBuildBase = serde_wasm_bindgen::from_value(base).map_err(|e| JsValue::from_str(&format!("bad base: {e}")))?;
        Ok(WasmForge { inner: forge::Forge::new(config, items, sets, base, seed as u64) })
    }

    /// Runs whole generations until `budget_ms` has elapsed (at least one),
    /// then reports the best builds so far.
    pub fn step(&mut self, budget_ms: f64) -> Result<JsValue, JsValue> {
        let start = js_sys::Date::now();
        loop {
            self.inner.run_generation();
            if js_sys::Date::now() - start >= budget_ms {
                break;
            }
        }
        to_js(&self.inner.report())
    }

    /// Final local polish of the best builds, then the final report.
    pub fn temper(&mut self, budget_ms: f64) -> Result<JsValue, JsValue> {
        self.inner.temper(budget_ms, &js_sys::Date::now);
        to_js(&self.inner.report())
    }

    pub fn emigrants(&self) -> Result<JsValue, JsValue> {
        to_js(&self.inner.emigrants())
    }

    pub fn inject(&mut self, builds: JsValue) {
        if let Ok(builds) = serde_wasm_bindgen::from_value::<Vec<HashMap<String, i64>>>(builds) {
            self.inner.inject(&builds);
        }
    }
}
