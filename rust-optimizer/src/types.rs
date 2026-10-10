// Mirrors src/engine/types.ts exactly — field names, shapes and semantics
// must stay in lockstep with that file (the TypeScript engine is the
// reference implementation; this is a from-scratch Rust port of it, not a
// derivative, so it has to be re-synced by hand if stats.ts ever changes).

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

pub const CHARACTERISTICS: [&str; 6] = [
    "vitality",
    "wisdom",
    "strength",
    "intelligence",
    "chance",
    "agility",
];

#[derive(Debug, Clone, Deserialize, Serialize, Default)]
pub struct AllocatedCharacteristics {
    pub vitality: i64,
    pub wisdom: i64,
    pub strength: i64,
    pub intelligence: i64,
    pub chance: i64,
    pub agility: i64,
}

#[derive(Debug, Clone, Deserialize, Serialize, Default)]
pub struct ScrolledCharacteristics {
    pub vitality: bool,
    pub wisdom: bool,
    pub strength: bool,
    pub intelligence: bool,
    pub chance: bool,
    pub agility: bool,
}

// ankama_id/set_id/effect_id stay snake_case here, matching the raw API
// field names the rest of the app (src/data/loaders.ts's AppItem/AppEffect)
// already uses as-is — only StatBlock/BuildInput are camelCase on the JS side.
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct ItemEffect {
    pub stat: String,
    pub min: i64,
    pub max: i64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub effect_id: Option<i64>,
}

impl ItemEffect {
    /// Same rule as effectValue()/applyEffect() in stats.ts: use `max` when
    /// it's a real upper bound (nonzero and greater than min), otherwise
    /// `min` — a fixed-value effect encodes as min == max, and some API
    /// rows use max == 0 as "no upper bound" rather than a literal zero.
    pub fn value(&self) -> i64 {
        if self.max != 0 && self.max > self.min {
            self.max
        } else {
            self.min
        }
    }
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct EquippedItem {
    pub ankama_id: i64,
    pub effects: Vec<ItemEffect>,
    pub set_id: Option<i64>,
    pub slot: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct SetData {
    pub ankama_id: i64,
    pub items: Vec<i64>,
    /// Keyed by piece count (as a string over the wire, since JSON object
    /// keys are always strings) — parsed to i64 where needed.
    pub bonuses: HashMap<String, Vec<ItemEffect>>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BuildInput {
    pub level: i64,
    pub allocated: AllocatedCharacteristics,
    pub scrolled: ScrolledCharacteristics,
    pub items: Vec<EquippedItem>,
    pub sets: Vec<SetData>,
    #[serde(default)]
    pub rune_effects: Vec<ItemEffect>,
}

#[derive(Debug, Clone, Deserialize, Serialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct StatBlock {
    pub ap: i64,
    pub mp: i64,
    pub range: i64,

    pub vitality: i64,
    pub wisdom: i64,
    pub strength: i64,
    pub intelligence: i64,
    pub chance: i64,
    pub agility: i64,

    pub max_hp: i64,

    pub power: i64,

    pub damage: i64,
    pub neutral_damage: i64,
    pub earth_damage: i64,
    pub fire_damage: i64,
    pub water_damage: i64,
    pub air_damage: i64,

    pub neutral_steal: i64,
    pub earth_steal: i64,
    pub fire_steal: i64,
    pub water_steal: i64,
    pub air_steal: i64,
    pub best_elem_steal: i64,
    pub best_elem_damage: i64,

    pub neutral_res_fixed: i64,
    pub earth_res_fixed: i64,
    pub fire_res_fixed: i64,
    pub water_res_fixed: i64,
    pub air_res_fixed: i64,

    pub neutral_res_percent: i64,
    pub earth_res_percent: i64,
    pub fire_res_percent: i64,
    pub water_res_percent: i64,
    pub air_res_percent: i64,

    pub ap_raw: i64,
    pub mp_raw: i64,
    pub range_raw: i64,
    pub neutral_res_percent_raw: i64,
    pub earth_res_percent_raw: i64,
    pub fire_res_percent_raw: i64,
    pub water_res_percent_raw: i64,
    pub air_res_percent_raw: i64,

    pub crit_chance: i64,
    pub crit_damage: i64,
    pub crit_resistance: i64,

    pub melee_damage_percent: i64,
    pub ranged_damage_percent: i64,
    pub spell_damage_percent: i64,
    pub weapon_damage_percent: i64,
    pub melee_resist_percent: i64,
    pub ranged_resist_percent: i64,

    pub trap_damage: i64,
    pub trap_power: i64,
    pub pushback_damage: i64,
    pub pushback_resist: i64,
    pub reflected_damage: i64,

    pub heals: i64,
    pub initiative: i64,
    pub lock: i64,
    pub dodge: i64,
    pub prospecting: i64,
    pub summons: i64,
    pub pods: i64,

    pub ap_reduction: i64,
    pub mp_reduction: i64,
    pub ap_parry: i64,
    pub mp_parry: i64,
    pub mp_steal: i64,

    pub unknown_stats: HashMap<String, i64>,

    pub points_budget: i64,
    pub points_spent: i64,
}

/// Floor division matching JS `Math.floor(a / b)` exactly (including for
/// negative operands, where Rust's `/` truncates toward zero instead).
pub fn floor_div(a: i64, b: i64) -> i64 {
    let q = a / b;
    let r = a % b;
    if (r != 0) && ((r < 0) != (b < 0)) {
        q - 1
    } else {
        q
    }
}
