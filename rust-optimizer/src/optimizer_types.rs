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

/// One Forge requirement: reach `goal` (deficits cost `weight` per missing
/// unit), keep earning `weight` per unit above it up to `max`. A soft max
/// just stops counting past it; an `absolute` max rejects any build that
/// exceeds it.
#[derive(Debug, Clone, Deserialize)]
pub struct StatConfig {
    pub stat: String,
    pub goal: i64,
    pub weight: i64,
    #[serde(default)]
    pub max: Option<i64>,
    #[serde(default)]
    pub absolute: bool,
}

/// Exo forgemagie the Forge may add on its own (one +1 AP/MP/Range per
/// item, only where it closes a goal deficit).
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExoConfig {
    pub ap: bool,
    pub mp: bool,
    pub range: bool,
    pub only_on_ring: bool,
    pub max_count: i64,
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
    #[serde(default)]
    pub banned_items: Vec<i64>,
    #[serde(default)]
    pub banned_types: Vec<String>,
    /// Let the Forge add official transcendence runes to the items it picks.
    #[serde(default = "default_true")]
    pub transcendence: bool,
    /// Islands this Forge runs (a run splits its islands across Workers).
    #[serde(default = "default_islands")]
    pub islands: usize,
    /// Drop candidates another item of the same slot beats on every scored stat.
    #[serde(default = "default_true")]
    pub prune: bool,
}

fn default_true() -> bool {
    true
}

fn default_islands() -> usize {
    8
}

/// A transcendence rune the Forge chose for one item.
#[derive(Debug, Clone, Serialize)]
pub struct RuneChoice {
    pub stat: String,
    pub value: i64,
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
    /// slot -> "ap" | "mp" | "range": exo runes the Forge chose to add.
    pub exo: HashMap<String, String>,
    /// slot -> transcendence rune the Forge chose for that item.
    pub runes: HashMap<String, RuneChoice>,
    pub requirements_met: usize,
    pub requirements_total: usize,
}
