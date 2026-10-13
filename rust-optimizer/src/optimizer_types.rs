// Wire types for the optimizer boundary — mirrors src/data/loaders.ts's
// AppItem/AppCondition/AppSet and src/features/optimizer/types.ts exactly.
// Deserialize-only where the JS side only ever sends them (catalog data,
// config, build base); Serialize-only for BuildResult, the only thing sent
// back to JS. Unused catalog fields (image_url, description, ability, weapon
// combat stats, ...) are simply omitted — serde ignores unknown JSON fields
// by default, so the full catalog JSON still deserializes fine.

use crate::types::{AllocatedCharacteristics, ItemEffect, ScrolledCharacteristics, StatBlock};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Deserialize)]
pub struct CatalogCondition {
    pub stat: String,
    pub operator: String,
    pub value: i64,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CatalogItem {
    pub ankama_id: i64,
    pub name: String,
    pub level: i64,
    #[serde(rename = "type")]
    pub item_type: String,
    pub slot: String,
    pub effects: Vec<ItemEffect>,
    #[serde(default)]
    pub conditions: Option<Vec<CatalogCondition>>,
    pub set_id: Option<i64>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CatalogSet {
    pub ankama_id: i64,
    pub items: Vec<i64>,
    pub bonuses: HashMap<String, Vec<ItemEffect>>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct StatConfig {
    pub stat: String,
    pub weight: i64,
    #[serde(rename = "minVal")]
    pub min_val: i64,
}

#[derive(Debug, Clone, Deserialize)]
pub struct ExoConfig {
    pub ap: bool,
    pub mp: bool,
    pub range: bool,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OptimizerConfig {
    pub stats: Vec<StatConfig>,
    pub exo: ExoConfig,
    pub max_level: i64,
    /// Wire format is an array of slot-id strings (the worker spreads the JS
    /// `Set<SlotId>` into `[...lockedSlots]` before postMessage), not a set.
    pub locked_slots: Vec<String>,
    pub assume_fully_scrolled: bool,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OptimizerBuildBase {
    pub level: i64,
    pub allocated: AllocatedCharacteristics,
    pub scrolled: ScrolledCharacteristics,
    /// `Partial<Record<SlotId, number>>` on the wire — a plain object keyed
    /// by slot id string.
    pub equipped: HashMap<String, i64>,
    /// `Partial<Record<SlotId, RuneMap>>` — slot -> stat name -> flat bonus.
    #[serde(default)]
    pub runes: HashMap<String, HashMap<String, i64>>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BuildResult {
    pub equipped: HashMap<String, i64>,
    pub stats: StatBlock,
    pub score: f64,
    pub meets_required: bool,
    pub conditions_ok: bool,
    pub allocated: AllocatedCharacteristics,
    pub scrolled: ScrolledCharacteristics,
}
