// Mirrors src/engine/optimizer.ts exactly — same phases, same constants, same
// correctness fixes (M96-M101). Two deliberate simplifications versus the TS
// version, both safe because this always runs inside a Worker the JS side can
// terminate outright:
// - No cooperative cancellation (cancelRef checks) — killing the Worker
//   already stops a synchronous WASM call just as well as a JS one.
// - No progress callback — this runs fast enough in Rust that a single
//   "working..." spinner is enough; the TS version only needed incremental
//   progress because a slow JS run could take up to 15 real seconds.
// Everything else - the exhaustive set/pair search, hill-climbing, equip
// condition validation, the continuous constraint-satisfaction rank(), Power
// synergy, and characteristic point allocation - is a direct, verified port.

use crate::characteristics::{point_cost, stat_budget, SCROLL_BONUS};
use crate::optimizer_types::{BuildResult, CatalogItem, CatalogSet, ExoConfig, OptimizerBuildBase, OptimizerConfig, StatConfig};
use crate::stat_map::{stat_key, weapon_attack_ids};
use crate::stats::{compute_stats, get_stat};
use crate::types::{AllocatedCharacteristics, BuildInput, EquippedItem, ItemEffect, ScrolledCharacteristics, SetData, CHARACTERISTICS};
use serde::Serialize;
use std::collections::{HashMap, HashSet};

// Reported periodically during the search (see run_optimizer_with_progress)
// so the UI can show something more honest than a bare spinner for a
// search that can genuinely take minutes: how many of the user's hard
// requirements the current best candidate meets, and the candidate itself
// (so the UI can render a live-updating preview of the actual build, not
// just a number). `best` is a full BuildResult - no separate lightweight
// shape - specifically so the frontend can reuse BuildResultCard verbatim
// instead of building a second, parallel rendering path for "build in
// progress" vs "final build".
#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ProgressUpdate {
    pub generation: u64,
    pub elapsed_ms: f64,
    pub requirements_met: usize,
    pub requirements_total: usize,
    pub best: BuildResult,
}

pub const ALL_SLOTS: [&str; 17] = [
    "hat", "cape", "amulet", "ring1", "ring2", "belt", "boots", "weapon", "shield", "companion",
    "sidekick", "dofus1", "dofus2", "dofus3", "dofus4", "dofus5", "dofus6",
];
const DOFUS_SLOT_IDS: [&str; 6] = ["dofus1", "dofus2", "dofus3", "dofus4", "dofus5", "dofus6"];

fn companion_types() -> &'static HashSet<&'static str> {
    use std::sync::OnceLock;
    static SET: OnceLock<HashSet<&'static str>> = OnceLock::new();
    SET.get_or_init(|| ["Pet", "Petsmount", "Dragoturkey", "Seemyool", "Rhineetle"].into_iter().collect())
}

const WEAPON_ATK_STAT_NAMES: [&str; 5] = ["Earth damage", "Fire damage", "Water damage", "Air damage", "Neutral damage"];

// See optimizer.ts's NON_OBTAINABLE_IDS comment: ankama_id is stable across
// locales, the item NAME is not (dataStore.ts overlays a translated display
// name while keeping effects English, and the GM/test marker doesn't survive
// translation consistently) - so id is the authoritative check, with a loose
// name-based secondary net for anything not yet identified.
fn non_obtainable_ids() -> &'static HashSet<i64> {
    use std::sync::OnceLock;
    static SET: OnceLock<HashSet<i64>> = OnceLock::new();
    SET.get_or_init(|| [6894, 6895, 7913, 9031, 34569].into_iter().collect())
}

fn is_obtainable(item: &CatalogItem) -> bool {
    if non_obtainable_ids().contains(&item.ankama_id) {
        return false;
    }
    let lower = item.name.to_lowercase();
    if lower.contains("(mj)") || lower.contains("(gm)") || lower.contains("gms only") || lower.contains("gm only") {
        return false;
    }
    if lower == "hide effect test" {
        return false;
    }
    true
}

fn filter_items_for_slot<'a>(items: &'a [CatalogItem], slot: &str, max_level: i64) -> Vec<&'a CatalogItem> {
    let leveled: Vec<&CatalogItem> = items.iter().filter(|it| it.level <= max_level && is_obtainable(it)).collect();
    if slot == "ring1" || slot == "ring2" {
        return leveled.into_iter().filter(|it| it.slot == "ring").collect();
    }
    if DOFUS_SLOT_IDS.contains(&slot) {
        return leveled.into_iter().filter(|it| it.slot == "dofus").collect();
    }
    if slot == "companion" {
        return leveled
            .into_iter()
            .filter(|it| it.slot == "pet" || (it.slot == "other" && companion_types().contains(it.item_type.as_str())))
            .collect();
    }
    if slot == "sidekick" {
        return leveled.into_iter().filter(|it| it.slot == "other" && it.item_type == "Sidekick").collect();
    }
    leveled.into_iter().filter(|it| it.slot == slot).collect()
}

// Which concrete slot IDs could hold this item (generic categories like
// "ring"/"dofus" expand to every sub-slot of that category).
fn candidate_slots_for(item: &CatalogItem) -> Vec<&'static str> {
    if item.slot == "ring" {
        return vec!["ring1", "ring2"];
    }
    if item.slot == "dofus" {
        return DOFUS_SLOT_IDS.to_vec();
    }
    if item.slot == "pet" || (item.slot == "other" && companion_types().contains(item.item_type.as_str())) {
        return vec!["companion"];
    }
    if item.slot == "other" && item.item_type == "Sidekick" {
        return vec!["sidekick"];
    }
    ALL_SLOTS.iter().find(|&&s| s == item.slot).map(|&s| vec![s]).unwrap_or_default()
}

fn can_equip(equipped: &HashMap<String, i64>, slot: &str, item_id: i64) -> bool {
    if slot == "ring2" && equipped.get("ring1") == Some(&item_id) {
        return false;
    }
    if slot == "ring1" && equipped.get("ring2") == Some(&item_id) {
        return false;
    }
    if DOFUS_SLOT_IDS.contains(&slot) {
        for ds in DOFUS_SLOT_IDS {
            if ds != slot && equipped.get(ds) == Some(&item_id) {
                return false;
            }
        }
    }
    true
}

fn compare_op(actual: i64, operator: &str, value: i64) -> bool {
    match operator {
        ">" => actual > value,
        ">=" => actual >= value,
        "<" => actual < value,
        "<=" => actual <= value,
        "=" | "==" => actual == value,
        _ => true,
    }
}

struct ConditionContext<'a> {
    stats: &'a crate::types::StatBlock,
    character_level: i64,
    max_set_piece_count: i64,
}

// See optimizer.ts's meetsItemConditions comment for the full rationale on
// each special-cased condition stat.
fn meets_item_conditions(item: &CatalogItem, ctx: &ConditionContext) -> bool {
    let Some(conditions) = &item.conditions else { return true };
    conditions.iter().all(|c| {
        if c.stat == "Be level {0} or higher" {
            return compare_op(ctx.character_level, &c.operator, c.value);
        }
        if c.stat == "Set bonus" {
            return compare_op(ctx.max_set_piece_count, &c.operator, c.value);
        }
        if c.stat == "Be subscribed" {
            return true;
        }
        match stat_key(&c.stat) {
            Some(key) => compare_op(get_stat(ctx.stats, key), &c.operator, c.value),
            None => true,
        }
    })
}

const DAMAGE_SYNERGY_STATS: [&str; 7] = [
    "damage", "fireDamage", "earthDamage", "waterDamage", "airDamage", "neutralDamage", "bestElemDamage",
];

// Same set as DAMAGE_SYNERGY_STATS minus "damage" itself - used as the
// synergy SOURCE for "damage"'s own branch below, so it can't inherit from
// itself.
const ELEMENTAL_DAMAGE_STATS: [&str; 6] = [
    "fireDamage", "earthDamage", "waterDamage", "airDamage", "neutralDamage", "bestElemDamage",
];

// See optimizer.ts's effectiveWeight comment: Power rides along with
// whichever elemental damage stat has the highest explicit weight, unless
// Power has its own weight/minimum to respect instead.
fn effective_weight(stat_key_name: &str, stats: &[StatConfig], fallback: f64) -> f64 {
    if let Some(cfg) = stats.iter().find(|c| c.stat == stat_key_name) {
        if cfg.weight > 0 || cfg.min_val > 0 {
            return if cfg.weight > 0 { cfg.weight as f64 } else { 5.0 };
        }
    }
    if stat_key_name == "power" {
        let mut max_damage_weight = 0i64;
        for dmg_key in DAMAGE_SYNERGY_STATS {
            if let Some(cfg) = stats.iter().find(|c| c.stat == dmg_key) {
                if cfg.weight > max_damage_weight {
                    max_damage_weight = cfg.weight;
                }
            }
        }
        if max_damage_weight > 0 {
            return max_damage_weight as f64;
        }
    }
    // Flat "Damage" (generic, not tied to an element) adds to every
    // elemental damage type the same universal way Power does — found via a
    // user report after Power's synergy fix (M100) only covered Power,
    // never extended to the OTHER universal damage stat. Without this,
    // prioritizing e.g. Earth Damage never valued a flat-Damage item over
    // an equally-costed non-damage item, even though flat Damage helps
    // Earth Damage output exactly as much as Power does.
    if stat_key_name == "damage" {
        let mut max_elem_weight = 0i64;
        for dmg_key in ELEMENTAL_DAMAGE_STATS {
            if let Some(cfg) = stats.iter().find(|c| c.stat == dmg_key) {
                if cfg.weight > max_elem_weight {
                    max_elem_weight = cfg.weight;
                }
            }
        }
        if max_elem_weight > 0 {
            return max_elem_weight as f64;
        }
    }
    // Max HP is driven directly by the Vitality characteristic — same
    // relationship Power has with elemental damage above. See
    // optimizer.ts's matching comment: without this, optimal_allocation()
    // never spends a single point on Vitality for an HP-only target, since
    // it only invests in characteristics that have their OWN weight.
    if stat_key_name == "vitality" {
        if let Some(cfg) = stats.iter().find(|c| c.stat == "maxHp") {
            if cfg.weight > 0 {
                return cfg.weight as f64;
            }
            if cfg.min_val > 0 {
                return 5.0;
            }
        }
    }
    fallback
}

// See optimizer.ts's optimalAllocation comment: a greedy weight-per-cost
// algorithm, provably optimal here since every characteristic's point cost is
// non-decreasing and its score contribution is linear and uncapped.
fn get_scrolled(s: &ScrolledCharacteristics, c: &str) -> bool {
    match c {
        "vitality" => s.vitality,
        "wisdom" => s.wisdom,
        "strength" => s.strength,
        "intelligence" => s.intelligence,
        "chance" => s.chance,
        "agility" => s.agility,
        _ => false,
    }
}

fn optimal_allocation(level: i64, stats: &[StatConfig], scrolled: &ScrolledCharacteristics, current: &AllocatedCharacteristics) -> AllocatedCharacteristics {
    let any_weighted = CHARACTERISTICS.iter().any(|c| effective_weight(c, stats, 0.0) > 0.0);
    if !any_weighted {
        return current.clone();
    }

    let budget = stat_budget(level);
    let mut allocated = AllocatedCharacteristics::default();
    let mut spent = 0i64;

    // Reserve points for any characteristic with its OWN hard minVal first,
    // cheapest-to-satisfy before pricier ones, so two simultaneous hard
    // floors on DIFFERENT characteristics (e.g. Strength >= 1500 AND
    // Vitality >= 395, the latter maybe inherited from an "HP >= X" target
    // via effective_weight's synergy branch) don't get shortchanged by the
    // plain greedy loop below, which only ever maximizes total weighted
    // score and has no notion of "cross this specific threshold first" -
    // it can leave BOTH thresholds unmet even when a different split would
    // have satisfied both, simply because continuing to spend on whichever
    // has the best weight/cost ratio right now doesn't care that it's
    // already crossed its own target. This pre-pass is a conservative
    // worst case (assumes zero help from items, which aren't known yet at
    // allocation time) - it only ever reserves the MINIMUM needed to reach
    // the floor from points + scroll bonus alone; the greedy loop still
    // freely spends any leftover budget exactly as before. A target that
    // doesn't fit the whole budget on its own is simply skipped here (left
    // to the greedy loop to do its best), never forced past what's left.
    let mut required: Vec<(&str, i64)> = CHARACTERISTICS
        .iter()
        .filter_map(|&c| {
            let min_val = stats.iter().find(|s| s.stat == c).map(|s| s.min_val).unwrap_or(0);
            if min_val <= 0 {
                return None;
            }
            let scroll_bonus = if get_scrolled(scrolled, c) { SCROLL_BONUS } else { 0 };
            let needed_points = (min_val - scroll_bonus).max(0);
            if needed_points <= 0 {
                return None;
            }
            Some((c, needed_points))
        })
        .collect();
    required.sort_by_key(|&(c, needed_points)| point_cost(c, needed_points));
    for (c, needed_points) in required {
        let cost_to_reach = point_cost(c, needed_points);
        if cost_to_reach <= budget - spent {
            spent += cost_to_reach;
            set_characteristic(&mut allocated, c, needed_points);
        }
    }

    loop {
        let mut best_char: Option<&str> = None;
        let mut best_ratio = 0.0f64;
        for c in CHARACTERISTICS {
            let weight = effective_weight(c, stats, 0.0);
            if weight <= 0.0 {
                continue;
            }
            let current_points = get_characteristic(&allocated, c);
            let next_cost = point_cost(c, current_points + 1) - point_cost(c, current_points);
            if next_cost <= 0 || spent + next_cost > budget {
                continue;
            }
            let ratio = weight / next_cost as f64;
            if ratio > best_ratio {
                best_ratio = ratio;
                best_char = Some(c);
            }
        }
        let Some(c) = best_char else { break };
        let current_points = get_characteristic(&allocated, c);
        spent += point_cost(c, current_points + 1) - point_cost(c, current_points);
        set_characteristic(&mut allocated, c, current_points + 1);
    }
    allocated
}

fn get_characteristic(a: &AllocatedCharacteristics, c: &str) -> i64 {
    match c {
        "vitality" => a.vitality,
        "wisdom" => a.wisdom,
        "strength" => a.strength,
        "intelligence" => a.intelligence,
        "chance" => a.chance,
        "agility" => a.agility,
        _ => 0,
    }
}
fn set_characteristic(a: &mut AllocatedCharacteristics, c: &str, value: i64) {
    match c {
        "vitality" => a.vitality = value,
        "wisdom" => a.wisdom = value,
        "strength" => a.strength = value,
        "intelligence" => a.intelligence = value,
        "chance" => a.chance = value,
        "agility" => a.agility = value,
        _ => {}
    }
}

// Rough per-item score used only to rank/seed candidate pools - never the
// actual fitness (that's always the real compute_stats(), see evaluate()).
fn item_partial_score(item: &CatalogItem, stats: &[StatConfig]) -> f64 {
    let mut s = item.level as f64 * 0.1;
    let attack_ids = weapon_attack_ids();
    for eff in &item.effects {
        if let Some(id) = eff.effect_id {
            if attack_ids.contains(&id) {
                continue;
            }
        }
        if item.slot == "weapon" && WEAPON_ATK_STAT_NAMES.contains(&eff.stat.as_str()) {
            continue;
        }
        let Some(key) = stat_key(&eff.stat) else { continue };
        s += eff.value() as f64 * effective_weight(key, stats, 0.3);
    }
    s
}

fn equipped_fingerprint(eq: &HashMap<String, i64>) -> String {
    ALL_SLOTS.iter().map(|s| eq.get(*s).copied().unwrap_or(0).to_string()).collect::<Vec<_>>().join(",")
}

type Individual = HashMap<String, i64>;

// Candidate-pool size for the guaranteed final hill-climb polish (see
// local_search and the "Guaranteed final polish" block in run_optimizer).
// Tried uncapped (every legal item per slot, up to ~770 for weapons) on the
// reasoning that a specific high-value item could live outside any
// heuristic-ranked top-N — measured WORSE on the hardest known benchmark
// than this cap, most likely because polishing each candidate against a
// 2-3x bigger pool left less of the time budget for the NUMBER of diverse
// candidates polished, which empirically mattered more (see
// FINAL_POLISH_COUNT). Kept separate from the GA's per-generation
// LIGHT_POLISH_POOL so this one-time final pass can still afford more
// candidates per slot than something that runs every generation.
const HILL_CLIMB_POOL: usize = 250;
const HILL_CLIMB_MAX_SWEEPS: usize = 10;
// The user explicitly prioritized always finding the best result over how
// long it takes — this runs inside a Worker, so it never blocks the UI
// thread regardless of duration. Phases 1/2/2.5 (every set standalone, then
// bounded pairs/triples — see the comment above the pairs loop for why
// those two came back as GA seeding) share this slice; the rest is left
// for the genetic/memetic search, which is where most search depth is
// spent now.
const TIME_BUDGET_MS: f64 = 240000.0;
const SET_SEARCH_DEADLINE_MS: f64 = TIME_BUDGET_MS * 0.35;
// The generation loop stops at TIME_BUDGET_MS, but the guaranteed final
// polish (see that block below) runs AFTER that check and wasn't bounded
// itself — measured taking the real total past 240s on a real-catalog
// case (confirmed: 334s wall-clock for a call that should have capped at
// 240). This gives that one-time pass its own fixed allowance on top,
// so the real worst-case total stays a known, bounded number instead of
// open-ended.
const FINAL_POLISH_DEADLINE_MS: f64 = TIME_BUDGET_MS + 60000.0;
const RESULT_COUNT: usize = 5;
const DIVERSITY_MIN_DIFF: usize = 3;

// js_sys::Date::now() only works when actually running under wasm-bindgen's
// JS glue (a browser/worker) — native `cargo test` has no JS runtime to call
// into, so it needs a real wall clock instead for the exact same elapsed-ms
// semantics.
#[cfg(target_arch = "wasm32")]
fn now_ms() -> f64 {
    js_sys::Date::now()
}
#[cfg(not(target_arch = "wasm32"))]
fn now_ms() -> f64 {
    use std::time::{SystemTime, UNIX_EPOCH};
    SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs_f64() * 1000.0
}

struct Ctx<'a> {
    item_map: HashMap<i64, &'a CatalogItem>,
    set_data: Vec<SetData>,
    stats: &'a [StatConfig],
    hard_constraints: Vec<(String, i64)>,
    locked_equipped: HashMap<String, i64>,
    locked_rune_effects: Vec<ItemEffect>,
    allocated: AllocatedCharacteristics,
    scrolled: ScrolledCharacteristics,
    base_level: i64,
    exo: ExoConfig,
}

impl<'a> Ctx<'a> {
    fn full_equipped(&self, ind: &Individual) -> HashMap<String, i64> {
        let mut out = self.locked_equipped.clone();
        for (k, v) in ind {
            out.insert(k.clone(), *v);
        }
        out
    }

    fn build_equipped_items(&self, equipped: &HashMap<String, i64>) -> Vec<EquippedItem> {
        let mut out = Vec::new();
        for slot in ALL_SLOTS {
            let Some(&id) = equipped.get(slot) else { continue };
            if let Some(it) = self.item_map.get(&id) {
                out.push(EquippedItem { ankama_id: it.ankama_id, effects: it.effects.clone(), set_id: it.set_id, slot: it.slot.clone() });
            }
        }
        out
    }

    // Most pieces this build has equipped from any single set - the gate
    // real Trophy items carry ("Set bonus" < 2).
    fn max_set_piece_count(&self, equipped: &HashMap<String, i64>) -> i64 {
        let mut counts: HashMap<i64, i64> = HashMap::new();
        for slot in ALL_SLOTS {
            let Some(&id) = equipped.get(slot) else { continue };
            if let Some(it) = self.item_map.get(&id) {
                if let Some(set_id) = it.set_id {
                    *counts.entry(set_id).or_insert(0) += 1;
                }
            }
        }
        counts.values().copied().max().unwrap_or(0)
    }

    fn meets_all_conditions(&self, equipped: &HashMap<String, i64>, stats_block: &crate::types::StatBlock) -> bool {
        let ctx = ConditionContext {
            stats: stats_block,
            character_level: self.base_level,
            max_set_piece_count: self.max_set_piece_count(equipped),
        };
        for slot in ALL_SLOTS {
            let Some(&id) = equipped.get(slot) else { continue };
            if let Some(it) = self.item_map.get(&id) {
                if !meets_item_conditions(it, &ctx) {
                    return false;
                }
            }
        }
        true
    }

    fn evaluate(&self, ind: &Individual) -> BuildResult {
        let equipped = self.full_equipped(ind);
        let mut computed_stats = compute_stats(&BuildInput {
            level: self.base_level,
            allocated: self.allocated.clone(),
            scrolled: self.scrolled.clone(),
            items: self.build_equipped_items(&equipped),
            sets: &self.set_data,
            rune_effects: self.locked_rune_effects.clone(),
        });

        // The Exo AP/MP/Range checkboxes mean "assume the respective Exo
        // rune gets forged on" — in real Dofus, forgemagie can only put an
        // Exo PA/PM/PO bonus on a RING, never another slot. Modeled as a
        // flat +1 to whichever ring is equipped, re-applying the same
        // official cap compute_stats already enforces, rather than as a
        // bare numeric floor the search had to satisfy purely from items'
        // OWN natural effects — which was quietly asking for more than the
        // feature's own description ("include items with +1 AP exo-maged")
        // promised, and made the floor harder to reach than it should be.
        // No bonus without an equipped ring — nothing to forge it onto.
        if equipped.contains_key("ring1") || equipped.contains_key("ring2") {
            if self.exo.ap {
                computed_stats.ap_raw += 1;
                computed_stats.ap = computed_stats.ap_raw.min(12);
            }
            if self.exo.mp {
                computed_stats.mp_raw += 1;
                computed_stats.mp = computed_stats.mp_raw.min(6);
            }
            if self.exo.range {
                computed_stats.range_raw += 1;
                computed_stats.range = computed_stats.range_raw.min(6);
            }
        }

        let mut score = 0.0f64;
        let mut power_row_present = false;
        for cfg in self.stats {
            if cfg.stat == "power" {
                power_row_present = true;
            }
            let weight = effective_weight(&cfg.stat, self.stats, 0.0);
            if weight > 0.0 {
                score += get_stat(&computed_stats, &cfg.stat) as f64 * weight;
            }
        }
        // Power's synergy weight (effective_weight's "power" branch) only
        // gets a chance to apply when `self.stats` already has a row for
        // "power" to iterate over, even a zero one — true for every real
        // caller (the UI always seeds a zero row per stat) but not something
        // this function should silently depend on. Checked separately so
        // Power scores correctly even for a caller that only lists the
        // stats it actually cares about.
        if !power_row_present {
            let weight = effective_weight("power", self.stats, 0.0);
            if weight > 0.0 {
                score += get_stat(&computed_stats, "power") as f64 * weight;
            }
        }

        let conditions_ok = self.meets_all_conditions(&equipped, &computed_stats);
        let meets_required = self.hard_constraints.iter().all(|(stat, min_val)| get_stat(&computed_stats, stat) >= *min_val) && conditions_ok;

        BuildResult {
            equipped,
            stats: computed_stats,
            score,
            meets_required,
            conditions_ok,
            allocated: self.allocated.clone(),
            scrolled: self.scrolled.clone(),
        }
    }

    // See optimizer.ts's rank()/constraintSatisfaction() comment: a
    // continuous 0..1 satisfaction ratio instead of an all-or-nothing bonus,
    // so hill-climbing has a real gradient toward feasibility. Equip
    // condition failures stay an absolute disqualifier.
    // A pure average of per-constraint ratios (the original M99 design)
    // treats "11 constraints each 90% of the way there" as basically
    // indistinguishable from "10 fully met, 1 completely unmet" — both sum
    // to roughly the same total, so the search gets no specific signal that
    // CROSSING one more threshold outright is what actually matters, versus
    // padding margin on ones already met. Confirmed to matter in practice,
    // not just in theory: on a demanding real 11-requirement case, the
    // search kept finding builds that nudged several already-satisfied
    // stats further while leaving others flatly unmet, rather than
    // converging on fewer-but-fully-met requirements. The flat +1 bonus
    // per FULLY met constraint (on top of its own 0..1 ratio) makes
    // "satisfied count" the dominant signal — a build with one more
    // constraint fully crossed always outranks one with none, regardless
    // of how much margin the unsatisfied ones have — while the continuous
    // ratio still gives hill-climbing/mutation a gradient toward whichever
    // unmet constraint is closest, instead of an all-or-nothing cliff.
    fn constraint_satisfaction(&self, stats_block: &crate::types::StatBlock) -> f64 {
        if self.hard_constraints.is_empty() {
            return 1.0;
        }
        let mut sum = 0.0f64;
        for (stat, min_val) in &self.hard_constraints {
            if *min_val <= 0 {
                sum += 2.0;
                continue;
            }
            let actual = get_stat(stats_block, stat) as f64;
            let min_val = *min_val as f64;
            sum += (actual / min_val).min(1.0);
            if actual >= min_val {
                sum += 1.0;
            }
        }
        sum / (self.hard_constraints.len() as f64 * 2.0)
    }

    fn rank(&self, r: &BuildResult) -> f64 {
        if !r.conditions_ok {
            return r.score - 1e15;
        }
        self.constraint_satisfaction(&r.stats) * 1e12 + r.score
    }

    // How many hard requirements the given stats fully satisfy - the plain
    // number progress updates report, since "constraint_satisfaction's
    // fractional score" isn't something a user reads at a glance the way
    // "8 of 11" is.
    fn requirements_met_count(&self, stats_block: &crate::types::StatBlock) -> usize {
        self.hard_constraints.iter().filter(|(stat, min_val)| get_stat(stats_block, stat) >= *min_val).count()
    }
}

fn best_item_for_slot<'a>(pool: &[&'a CatalogItem], exclude: &Individual, slot: &str) -> Option<&'a CatalogItem> {
    pool.iter().find(|it| can_equip(exclude, slot, it.ankama_id)).copied()
}

fn greedy_fill_remaining(pools: &HashMap<String, Vec<&CatalogItem>>, base: &Individual, open_slots: &[String]) -> Individual {
    let mut ind = base.clone();
    for slot in open_slots {
        if ind.contains_key(slot) {
            continue;
        }
        if let Some(pool) = pools.get(slot) {
            if let Some(pick) = best_item_for_slot(pool, &ind, slot) {
                ind.insert(slot.clone(), pick.ankama_id);
            }
        }
    }
    ind
}

// Assigns as many of set_items as fit into available_slots (not already used
// by claimed); returns the assignment plus which slots it used.
fn apply_set(set_items: &[&CatalogItem], available_slots: &HashSet<String>, claimed: &Individual) -> (Individual, HashSet<String>) {
    let mut assigned = Individual::new();
    let mut used = HashSet::new();
    for item in set_items {
        let target = candidate_slots_for(item)
            .into_iter()
            .find(|s| available_slots.contains(*s) && !used.contains(*s) && !claimed.contains_key(*s) && !assigned.contains_key(*s));
        if let Some(target) = target {
            assigned.insert(target.to_string(), item.ankama_id);
            used.insert(target.to_string());
        }
    }
    (assigned, used)
}

// A Trophy's "Set bonus" condition and an active multi-piece set bonus are
// mutually exclusive by game rule — the only STRUCTURAL equip condition this
// app models (every other condition is a simple numeric stat check on the
// build's own totals; see meets_item_conditions's "Set bonus" branch). Every
// earlier phase (0 through 2.75) and hill-climbing pick each slot's item by
// score alone, blind to this interaction, so when a strong Trophy and a
// strong set are each independently the best-scoring pick for their slots,
// the search converges on equipping both — which the game disallows.
// Single-slot hill-climbing often can't escape this on its own: dropping ONE
// piece of a 3+-piece set still leaves the Trophy's condition unmet (piece
// count still >= 2), so no single swap improves rank() and the search gets
// stuck on the illegal combination, never discovering that dropping a
// SECOND piece would have worked. Rather than build a generic multi-step
// escape mechanism for this one structural case, repair it directly: there
// are only ever two ways out — drop the Trophy/Trophies, or drop the
// conflicting set — so try both explicitly and let normal ranking pick
// whichever (if either) is actually better. Returns only slots that are
// part of `candidate` (i.e. not locked by the user) — a conflict entirely
// within locked slots is the user's own call and is left untouched, same as
// today.
fn repair_trophy_set_conflict<'a>(
    ctx: &Ctx<'a>,
    pools: &HashMap<String, Vec<&'a CatalogItem>>,
    candidate: &Individual,
) -> Vec<Individual> {
    let equipped = ctx.full_equipped(candidate);
    let mut out = Vec::new();

    let is_set_bonus_trophy = |it: &CatalogItem| -> bool {
        it.conditions.as_ref().is_some_and(|cs| cs.iter().any(|c| c.stat == "Set bonus"))
    };

    // Variant A: drop every unlocked Trophy carrying a "Set bonus" condition,
    // refill those slots with the best alternative that doesn't carry the
    // same condition (so the repair can't just reintroduce the conflict).
    let trophy_slots: Vec<String> = candidate
        .keys()
        .filter(|slot| equipped.get(*slot).and_then(|id| ctx.item_map.get(id)).is_some_and(|it| is_set_bonus_trophy(it)))
        .cloned()
        .collect();
    if !trophy_slots.is_empty() {
        let mut repaired = candidate.clone();
        for slot in &trophy_slots {
            repaired.remove(slot);
        }
        for slot in &trophy_slots {
            if let Some(pool) = pools.get(slot) {
                let cur = ctx.full_equipped(&repaired);
                if let Some(pick) = pool.iter().find(|it| !is_set_bonus_trophy(it) && can_equip(&cur, slot, it.ankama_id)) {
                    repaired.insert(slot.clone(), pick.ankama_id);
                }
            }
        }
        out.push(repaired);
    }

    // Variant B: find the set_id with the most unlocked equipped pieces (the
    // one actually breaking the Trophy's condition) and drop every one of
    // ITS slots, refilling with the best non-set alternative — keeps the
    // Trophy, sacrifices the set bonus instead.
    let mut counts: HashMap<i64, Vec<String>> = HashMap::new();
    for slot in candidate.keys() {
        if let Some(it) = equipped.get(slot).and_then(|id| ctx.item_map.get(id)) {
            if let Some(set_id) = it.set_id {
                counts.entry(set_id).or_default().push(slot.clone());
            }
        }
    }
    if let Some((_, offending_slots)) = counts.into_iter().max_by_key(|(_, slots)| slots.len()) {
        if offending_slots.len() >= 2 {
            let mut repaired = candidate.clone();
            for slot in &offending_slots {
                repaired.remove(slot);
            }
            for slot in &offending_slots {
                if let Some(pool) = pools.get(slot) {
                    let cur = ctx.full_equipped(&repaired);
                    if let Some(pick) = pool.iter().find(|it| it.set_id.is_none() && can_equip(&cur, slot, it.ankama_id)) {
                        repaired.insert(slot.clone(), pick.ankama_id);
                    }
                }
            }
            out.push(repaired);
        }
    }

    out
}

fn slot_diff(a: &HashMap<String, i64>, b: &HashMap<String, i64>) -> usize {
    ALL_SLOTS.iter().filter(|s| a.get(**s).copied().unwrap_or(0) != b.get(**s).copied().unwrap_or(0)).count()
}

fn apply_exo_floor(min_by_stat: &mut HashMap<String, i64>, exo: &ExoConfig, key: &str, floor: i64) {
    let enabled = match key {
        "ap" => exo.ap,
        "mp" => exo.mp,
        "range" => exo.range,
        _ => false,
    };
    if enabled {
        let current = min_by_stat.get(key).copied().unwrap_or(0);
        min_by_stat.insert(key.to_string(), current.max(floor));
    }
}

fn item_map_get<'a>(items: &'a [CatalogItem], id: i64) -> Option<&'a CatalogItem> {
    items.iter().find(|it| it.ankama_id == id)
}

// ---------------------------------------------------------------------
// Genetic/memetic search engine — replaces the old bounded pair/triple/
// quadruple set enumeration and its fixed hill-climb seed list. That
// approach needed a fixed K (how many sets to combine) chosen ahead of
// time, was provably blind to anything needing K+1 sets simultaneously,
// and always ranked every slot's candidates with the same rough heuristic
// (item_partial_score) before truncating hill-climbing to its top
// HILL_CLIMB_POOL — so an item outside that heuristic's top-N was NEVER
// considered, no matter how well it might score in a specific build. Two
// concrete symptoms traced back to this: results plateauing short of
// tight numeric targets the fixed-K enumeration just couldn't reach, and
// very different weight configurations converging on the same handful of
// "generically good" items, because the heuristic used to build every
// candidate pool barely changes between similar-but-distinct weight
// vectors. A population that recombines (crossover) and perturbs
// (mutation) whole builds, polished every generation by the exact same
// exhaustive-neighbor hill-climb used before (a "memetic algorithm"),
// draws from the FULL legal pool for every slot every generation instead
// of a heuristic-truncated prefix of it, and adapts to whatever THIS
// request's weights actually reward instead of re-deriving the same
// generically-strong pool every time.
// ---------------------------------------------------------------------

// Minimal dependency-free PRNG (SplitMix64). Pulling in the `rand` crate
// would also pull in getrandom, which needs its "js" feature just to have
// any entropy source at all under wasm32 (no OS RNG inside a browser or
// worker) — not worth the dependency for search randomness with no
// security requirement. Seeded deterministically from the request itself
// (seed_from_config) so the exact same input always searches the exact
// same way — the same reproducibility guarantee the old deterministic
// phases had, without forcing every DIFFERENT request down the same path.
struct Rng(u64);
impl Rng {
    fn new(seed: u64) -> Self {
        Rng(seed ^ 0x9E37_79B9_7F4A_7C15)
    }
    fn next_u64(&mut self) -> u64 {
        self.0 = self.0.wrapping_add(0x9E37_79B9_7F4A_7C15);
        let mut z = self.0;
        z = (z ^ (z >> 30)).wrapping_mul(0xBF58_476D_1CE4_E5B9);
        z = (z ^ (z >> 27)).wrapping_mul(0x94D0_49BB_1331_11EB);
        z ^ (z >> 31)
    }
    fn next_f64(&mut self) -> f64 {
        (self.next_u64() >> 11) as f64 * (1.0 / 9_007_199_254_740_992.0)
    }
    fn below(&mut self, n: usize) -> usize {
        if n == 0 {
            0
        } else {
            (self.next_u64() % n as u64) as usize
        }
    }
    fn chance(&mut self, p: f64) -> bool {
        self.next_f64() < p
    }
}

fn seed_from_config(config: &OptimizerConfig, base: &OptimizerBuildBase) -> u64 {
    use std::hash::{Hash, Hasher};
    let mut hasher = std::collections::hash_map::DefaultHasher::new();
    for s in &config.stats {
        s.stat.hash(&mut hasher);
        s.weight.hash(&mut hasher);
        s.min_val.hash(&mut hasher);
    }
    config.max_level.hash(&mut hasher);
    base.level.hash(&mut hasher);
    let mut locked: Vec<&String> = config.locked_slots.iter().collect();
    locked.sort();
    for s in locked {
        s.hash(&mut hasher);
    }
    hasher.finish()
}

// Rank-biased random index into anything already sorted descending by
// quality: squaring a uniform [0,1) draw skews it toward 0, so lower
// indices (better-ranked) are more likely to be picked without ever making
// a higher index IMPOSSIBLE to draw — the structural difference from the
// old approach's hard HILL_CLIMB_POOL truncation, which made anything past
// a fixed cutoff unreachable no matter how many times you asked.
fn weighted_index(n: usize, rng: &mut Rng) -> usize {
    if n == 0 {
        return 0;
    }
    let skew = rng.next_f64() * rng.next_f64();
    ((skew * n as f64) as usize).min(n - 1)
}

fn weighted_pick<'a>(pool: &[&'a CatalogItem], rng: &mut Rng) -> Option<&'a CatalogItem> {
    if pool.is_empty() {
        return None;
    }
    Some(pool[weighted_index(pool.len(), rng)])
}

// A fresh, independently-random build: every unlocked slot drawn from its
// own full legal pool via weighted_pick. Used both to fill out generation
// 0 and as "random immigrants" injected into every later generation (see
// RANDOM_IMMIGRANTS_PER_GEN) — a standard GA technique for countering
// premature convergence, where the whole population drifts into the same
// neighborhood and stalls there long before the time budget is used up.
fn random_individual(pools: &HashMap<String, Vec<&CatalogItem>>, slots: &[String], rng: &mut Rng) -> Individual {
    let mut ind = Individual::new();
    for slot in slots {
        if let Some(pool) = pools.get(slot) {
            if let Some(item) = weighted_pick(pool, rng) {
                if can_equip(&ind, slot, item.ankama_id) {
                    ind.insert(slot.clone(), item.ankama_id);
                }
            }
        }
    }
    fix_duplicate_constraints(&mut ind, pools, rng);
    ind
}

fn tournament_select<'p>(pop: &'p [(Individual, BuildResult)], k: usize, ctx: &Ctx, rng: &mut Rng) -> &'p Individual {
    let mut best_idx = rng.below(pop.len());
    for _ in 1..k {
        let i = rng.below(pop.len());
        if ctx.rank(&pop[i].1) > ctx.rank(&pop[best_idx].1) {
            best_idx = i;
        }
    }
    &pop[best_idx].0
}

fn redraw_slot(ind: &mut Individual, pools: &HashMap<String, Vec<&CatalogItem>>, slot: &str, rng: &mut Rng) {
    let Some(pool) = pools.get(slot) else { return };
    for _ in 0..8 {
        if let Some(item) = weighted_pick(pool, rng) {
            if can_equip(ind, slot, item.ankama_id) {
                ind.insert(slot.to_string(), item.ankama_id);
                return;
            }
        }
    }
    ind.remove(slot);
}

// Crossover and per-slot mutation each draw a slot independently, so a
// child can end up with the same item in both ring slots, or the same
// dofus item in more than one dofus slot — illegal, and never caught by
// either operator in isolation since neither looks at sibling slots.
// Swept once per child, cheap next to a full evaluate().
fn fix_duplicate_constraints(ind: &mut Individual, pools: &HashMap<String, Vec<&CatalogItem>>, rng: &mut Rng) {
    if let (Some(&a), Some(&b)) = (ind.get("ring1"), ind.get("ring2")) {
        if a == b {
            redraw_slot(ind, pools, "ring2", rng);
        }
    }
    for i in 0..DOFUS_SLOT_IDS.len() {
        for j in (i + 1)..DOFUS_SLOT_IDS.len() {
            let (si, sj) = (DOFUS_SLOT_IDS[i], DOFUS_SLOT_IDS[j]);
            if let (Some(&a), Some(&b)) = (ind.get(si), ind.get(sj)) {
                if a == b {
                    redraw_slot(ind, pools, sj, rng);
                }
            }
        }
    }
}

// Clears whichever slots this set's own pieces could occupy, then assigns
// the set into those now-free slots — an atomic "replace with this whole
// set" macro-mutation. Deliberately different from the crossover
// transplant in the main loop below (which only fills GAPS, preserving
// whatever the receiving parent already had): per-slot mutation can only
// drift toward a multi-piece set one slot at a time by sheer accident,
// since the bonus needs every piece present at once to pay off. This lets
// the search try "what if this whole set instead" directly, every
// generation, the same way a human theorycrafter would.
fn inject_set(child: &mut Individual, set_items: &[&CatalogItem], open_slots: &HashSet<String>) {
    let mut potential: HashSet<String> = HashSet::new();
    for item in set_items {
        for s in candidate_slots_for(item) {
            if open_slots.contains(s) {
                potential.insert(s.to_string());
            }
        }
    }
    let base: Individual = child.iter().filter(|(s, _)| !potential.contains(*s)).map(|(s, &v)| (s.clone(), v)).collect();
    let (assigned, _) = apply_set(set_items, open_slots, &base);
    for s in &potential {
        child.remove(s);
    }
    for (slot, id) in assigned {
        child.insert(slot, id);
    }
}

// One pass of per-slot steepest-ascent: for each slot, try every candidate
// in `pool` and keep whichever single swap improves rank() the most,
// repeating sweeps until one makes no improvement or max_sweeps is hit.
// Lifted verbatim from the old phase 3 seed-polishing loop so it can serve
// both as the GA's per-generation local-search step and as the guaranteed
// final polish pass — the exact same exhaustive-neighbor hill-climb this
// engine has used and had validated since M96.
fn local_search(ctx: &Ctx, pool: &HashMap<String, Vec<&CatalogItem>>, slots: &[String], start: &Individual, max_sweeps: usize) -> BuildResult {
    let mut current = start.clone();
    let mut current_result = ctx.evaluate(&current);
    for _sweep in 0..max_sweeps {
        let mut improved = false;
        for slot in slots {
            let original_id = current.get(slot).copied();
            let mut best_for_slot = current_result.clone();
            let mut best_id = original_id;
            if let Some(candidates) = pool.get(slot) {
                for item in candidates {
                    if Some(item.ankama_id) == original_id {
                        continue;
                    }
                    current.insert(slot.clone(), item.ankama_id);
                    if can_equip(&current, slot, item.ankama_id) {
                        let trial_result = ctx.evaluate(&current);
                        if ctx.rank(&trial_result) > ctx.rank(&best_for_slot) {
                            best_for_slot = trial_result;
                            best_id = Some(item.ankama_id);
                        }
                    }
                }
                match original_id {
                    Some(id) => {
                        current.insert(slot.clone(), id);
                    }
                    None => {
                        current.remove(slot);
                    }
                }
            }
            if best_id != original_id {
                if let Some(id) = best_id {
                    current.insert(slot.clone(), id);
                } else {
                    current.remove(slot);
                }
                current_result = best_for_slot;
                improved = true;
            }
        }
        if !improved {
            break;
        }
    }
    current_result
}

pub fn run_optimizer(config: OptimizerConfig, items: Vec<CatalogItem>, sets: Vec<CatalogSet>, base: OptimizerBuildBase) -> Vec<BuildResult> {
    run_optimizer_inner(config, items, sets, base, &|_| true)
}

// Same search, but calls `on_progress` periodically (throttled to roughly
// twice a second - see `report_progress` below) with the best candidate
// found so far. Returning `false` stops the search early and falls through
// to the SAME guaranteed final polish + legality repair + diverse-pick
// steps a normal run goes through - an early stop via "use this result
// now" gets a properly finished build, not whatever a mid-generation
// individual happened to look like.
pub fn run_optimizer_with_progress(config: OptimizerConfig, items: Vec<CatalogItem>, sets: Vec<CatalogSet>, base: OptimizerBuildBase, on_progress: &dyn Fn(ProgressUpdate) -> bool) -> Vec<BuildResult> {
    run_optimizer_inner(config, items, sets, base, on_progress)
}

fn run_optimizer_inner(config: OptimizerConfig, items: Vec<CatalogItem>, sets: Vec<CatalogSet>, base: OptimizerBuildBase, on_progress: &dyn Fn(ProgressUpdate) -> bool) -> Vec<BuildResult> {
    let start_time = now_ms();

    let scrolled = if config.assume_fully_scrolled {
        ScrolledCharacteristics { vitality: true, wisdom: true, strength: true, intelligence: true, chance: true, agility: true }
    } else {
        base.scrolled.clone()
    };

    let allocated = optimal_allocation(base.level, &config.stats, &scrolled, &base.allocated);

    let locked_slots: HashSet<String> = config.locked_slots.iter().cloned().collect();
    let slots_to_optimize: Vec<String> = ALL_SLOTS.iter().filter(|s| !locked_slots.contains(**s)).map(|s| s.to_string()).collect();

    let mut locked_equipped = HashMap::new();
    for slot in ALL_SLOTS {
        if locked_slots.contains(slot) {
            if let Some(&id) = base.equipped.get(slot) {
                locked_equipped.insert(slot.to_string(), id);
            }
        }
    }

    // Forged rune bonuses only matter for LOCKED slots - see optimizer.ts's
    // comment on this exact logic.
    let mut locked_rune_effects = Vec::new();
    for slot in ALL_SLOTS {
        if !locked_slots.contains(slot) {
            continue;
        }
        if let Some(rune_map) = base.runes.get(slot) {
            for (stat, value) in rune_map {
                if *value > 0 {
                    locked_rune_effects.push(ItemEffect { stat: stat.clone(), min: *value, max: *value, effect_id: None });
                }
            }
        }
    }

    let item_map: HashMap<i64, &CatalogItem> = items.iter().map(|it| (it.ankama_id, it)).collect();
    let set_data: Vec<SetData> = sets
        .iter()
        .map(|s| SetData { ankama_id: s.ankama_id, items: s.items.clone(), bonuses: s.bonuses.clone() })
        .collect();

    // Hard constraints: user minimums + the Exo checkboxes (AP>=12/MP>=6/Range>=6).
    let mut min_by_stat: HashMap<String, i64> = HashMap::new();
    for cfg in &config.stats {
        if cfg.min_val > 0 {
            min_by_stat.insert(cfg.stat.clone(), cfg.min_val);
        }
    }
    apply_exo_floor(&mut min_by_stat, &config.exo, "ap", 12);
    apply_exo_floor(&mut min_by_stat, &config.exo, "mp", 6);
    apply_exo_floor(&mut min_by_stat, &config.exo, "range", 6);
    let hard_constraints: Vec<(String, i64)> = min_by_stat.into_iter().collect();

    let ctx = Ctx {
        item_map,
        set_data,
        stats: &config.stats,
        hard_constraints,
        locked_equipped,
        locked_rune_effects,
        allocated,
        scrolled,
        base_level: base.level,
        exo: config.exo.clone(),
    };

    if slots_to_optimize.is_empty() {
        return vec![ctx.evaluate(&Individual::new())];
    }

    // Candidate pools per slot.
    let mut pools: HashMap<String, Vec<&CatalogItem>> = HashMap::new();
    for slot in &slots_to_optimize {
        let mut filtered = filter_items_for_slot(&items, slot, config.max_level);
        filtered.sort_by(|a, b| item_partial_score(b, &config.stats).partial_cmp(&item_partial_score(a, &config.stats)).unwrap());
        pools.insert(slot.clone(), filtered);
    }

    // BTreeMap, not HashMap: std HashMap uses a randomized hasher seeded per
    // process, so its iteration order (hall_of_fame.values()) varies between
    // otherwise-identical runs — harmless for lookups, but it meant two runs
    // of the exact same search could rank tied/near-tied candidates
    // differently and converge on a different final pick. BTreeMap iterates
    // in a fixed (sorted-key) order every time, making the whole search
    // reproducible — the same inputs always produce the same answer.
    let mut hall_of_fame: std::collections::BTreeMap<String, BuildResult> = std::collections::BTreeMap::new();
    let remember = |r: BuildResult, hof: &mut std::collections::BTreeMap<String, BuildResult>| {
        let fp = equipped_fingerprint(&r.equipped);
        let better = hof.get(&fp).map(|existing| r.score > existing.score).unwrap_or(true);
        if better {
            hof.insert(fp, r);
        }
    };

    // Defined this early (not just around the GA loop further down) because
    // phases 0/1/2/2.5 below can themselves take a real amount of wall-clock
    // time on the full catalog (bounded by SET_SEARCH_DEADLINE_MS, currently
    // up to ~84s) — without reporting progress during them too, a demanding
    // request could sit on the old silent spinner for that whole stretch
    // before the GA loop (and its own progress calls) ever got a chance to
    // run, which is exactly the "feels frozen" problem this whole mechanism
    // exists to fix. Throttled to roughly twice a second; `force` bypasses
    // the throttle for the very first report after each phase, so the UI
    // gets *something* almost immediately instead of waiting a full 500ms.
    let mut last_progress_ms = f64::NEG_INFINITY;
    let mut report_progress = |hof: &std::collections::BTreeMap<String, BuildResult>, gen: u64, force: bool| -> bool {
        let elapsed = now_ms() - start_time;
        if !force && elapsed - last_progress_ms < 500.0 {
            return true;
        }
        let Some(best) = hof.values().max_by(|a, b| ctx.rank(a).partial_cmp(&ctx.rank(b)).unwrap()) else { return true };
        last_progress_ms = elapsed;
        on_progress(ProgressUpdate {
            generation: gen,
            elapsed_ms: elapsed,
            requirements_met: ctx.requirements_met_count(&best.stats),
            requirements_total: ctx.hard_constraints.len(),
            best: best.clone(),
        })
    };

    // Phase 0: pure "best item per slot, no sets" baseline.
    remember(ctx.evaluate(&greedy_fill_remaining(&pools, &Individual::new(), &slots_to_optimize)), &mut hall_of_fame);
    report_progress(&hall_of_fame, 0, true);

    // Phase 1: every single set, standalone.
    struct SetEntry<'a> {
        set_items: Vec<&'a CatalogItem>,
        standalone_score: f64,
    }
    let mut set_entries: Vec<SetEntry> = Vec::new();
    let open_slots_set: HashSet<String> = slots_to_optimize.iter().cloned().collect();

    for set in &sets {
        if now_ms() - start_time > SET_SEARCH_DEADLINE_MS || !report_progress(&hall_of_fame, 0, false) {
            break;
        }
        let set_items: Vec<&CatalogItem> = set
            .items
            .iter()
            .filter_map(|id| item_map_get(&items, *id))
            .filter(|it| it.level <= config.max_level && is_obtainable(it))
            .collect();
        if set_items.len() < 2 {
            continue;
        }
        let (assigned, used) = apply_set(&set_items, &open_slots_set, &Individual::new());
        if used.len() < 2 {
            continue;
        }
        let remaining: Vec<String> = slots_to_optimize.iter().filter(|s| !used.contains(*s)).cloned().collect();
        let result = ctx.evaluate(&greedy_fill_remaining(&pools, &assigned, &remaining));
        let standalone_score = result.score;
        remember(result, &mut hall_of_fame);
        set_entries.push(SetEntry { set_items, standalone_score });
    }

    set_entries.sort_by(|a, b| b.standalone_score.partial_cmp(&a.standalone_score).unwrap());

    // Phase 2/2.5: bounded-exhaustive pairs (full O(n^2)) and triples (top-K
    // standalone performers only) of sets, reinstated specifically as GA
    // SEEDS rather than as the terminal search they used to be. Empirically
    // necessary, not theoretical: three different rounds of GA-only tuning
    // (bigger population, random immigrants, rank-biased set operators, far
    // more diverse final-polish starts) never matched what this bounded
    // enumeration alone used to find on a demanding real 11-requirement
    // case — per-slot crossover and the set-injection macro-mutation can
    // still take many generations to land on the SPECIFIC 2-3-set
    // combination a tight multi-stat request needs, while brute-forcing
    // that small a space directly is cheap and exact. Capped to the top-K
    // standalone sets for triples (same reasoning as the old phase 2.5):
    // full triples over hundreds of sets is combinatorially unreasonable,
    // but restricting to the sets already ranked well on their own misses
    // essentially nothing in practice. The GA then takes these as a
    // starting population instead of the final answer — crossover and
    // mutation can still extend a strong pair/triple with a 4th set or
    // refine it further, which is exactly the kind of incremental
    // improvement GA is suited for once it has a genuinely good seed.
    struct MultiSetSeed {
        individual: Individual,
        rank: f64,
    }
    let mut multi_set_seeds: Vec<MultiSetSeed> = Vec::new();
    let n = set_entries.len();
    let mut pairs_done: u64 = 0;
    'pairs: for i in 0..n {
        for j in (i + 1)..n {
            pairs_done += 1;
            if pairs_done % 200 == 0
                && (now_ms() - start_time > SET_SEARCH_DEADLINE_MS || !report_progress(&hall_of_fame, 0, false))
            {
                break 'pairs;
            }
            let (assigned_a, used_a) = apply_set(&set_entries[i].set_items, &open_slots_set, &Individual::new());
            let (assigned_b, used_b) = apply_set(&set_entries[j].set_items, &open_slots_set, &assigned_a);
            if used_b.is_empty() {
                continue;
            }
            let mut combined = assigned_a;
            for (k, v) in assigned_b {
                combined.insert(k, v);
            }
            let used_slots: HashSet<String> = used_a.union(&used_b).cloned().collect();
            let remaining: Vec<String> = slots_to_optimize.iter().filter(|s| !used_slots.contains(*s)).cloned().collect();
            let filled = greedy_fill_remaining(&pools, &combined, &remaining);
            let result = ctx.evaluate(&filled);
            let r = ctx.rank(&result);
            remember(result, &mut hall_of_fame);
            multi_set_seeds.push(MultiSetSeed { individual: filled, rank: r });
        }
    }

    const TOP_K_FOR_TRIPLES: usize = 150;
    let triple_n = n.min(TOP_K_FOR_TRIPLES);
    let mut triples_done: u64 = 0;
    'triples: for i in 0..triple_n {
        for j in (i + 1)..triple_n {
            for k in (j + 1)..triple_n {
                triples_done += 1;
                if triples_done % 200 == 0
                    && (now_ms() - start_time > SET_SEARCH_DEADLINE_MS || !report_progress(&hall_of_fame, 0, false))
                {
                    break 'triples;
                }
                let (assigned_a, used_a) = apply_set(&set_entries[i].set_items, &open_slots_set, &Individual::new());
                let (assigned_b, used_b) = apply_set(&set_entries[j].set_items, &open_slots_set, &assigned_a);
                let mut combined = assigned_a;
                for (slot, id) in &assigned_b {
                    combined.insert(slot.clone(), *id);
                }
                let (assigned_c, used_c) = apply_set(&set_entries[k].set_items, &open_slots_set, &combined);
                if used_c.is_empty() {
                    continue; // c got nothing once a+b's slots were taken — the pairs loop above already covers "just a+b"
                }
                for (slot, id) in &assigned_c {
                    combined.insert(slot.clone(), *id);
                }
                let used_slots: HashSet<String> = used_a.union(&used_b).cloned().collect::<HashSet<_>>().union(&used_c).cloned().collect();
                let remaining: Vec<String> = slots_to_optimize.iter().filter(|s| !used_slots.contains(*s)).cloned().collect();
                let filled = greedy_fill_remaining(&pools, &combined, &remaining);
                let result = ctx.evaluate(&filled);
                let r = ctx.rank(&result);
                remember(result, &mut hall_of_fame);
                multi_set_seeds.push(MultiSetSeed { individual: filled, rank: r });
            }
        }
    }
    multi_set_seeds.sort_by(|a, b| b.rank.partial_cmp(&a.rank).unwrap());

    // ---- Population-based memetic search --------------------------------
    // Seed generation 0 from what phases 0/1 already found (the pure-greedy
    // baseline, plus every individual set's best standalone assembly, just
    // ranked above) and fill the rest with weighted-random individuals for
    // raw exploration coverage. Crossover recombines whatever is currently
    // working for THIS weight vector; the two set-aware operators (set
    // crossover transplant and set-injection mutation) give the search a
    // direct way to assemble or combine multi-piece set bonuses instead of
    // relying on per-slot mutation to stumble onto a whole set by chance,
    // which for a 4-6 piece set is astronomically unlikely on its own.
    const POP_SIZE: usize = 300;
    const ELITE_COUNT: usize = 15;
    const ELITE_POLISH_COUNT: usize = 4;
    const LIGHT_POLISH_SWEEPS: usize = 1;
    const LIGHT_POLISH_POOL: usize = 120;
    // Low on purpose: a high tournament size turns into strong selection
    // pressure, which converges fast but burns through population
    // diversity just as fast — confirmed empirically (see the first-pass
    // benchmark in this change's commit message) to stall out in under 10
    // real seconds on the hardest known case, regressing below what the
    // old, much slower exhaustive search used to find. A gentler K=3
    // leaves more of the budget's many available generations actually
    // exploring instead of re-converging on the same few individuals.
    const TOURNAMENT_K: usize = 3;
    const MUTATION_GENE_RATE: f64 = 0.15;
    // Tried higher (0.1 / 0.4) while chasing a demanding set-heavy
    // benchmark — measured a real regression on cases that need NO
    // particular set at all (pure stat-stacking via loose items): with 40%
    // of crossovers forcibly transplanting a set, good loose-item
    // individuals kept getting disrupted by irrelevant set pieces before
    // they could converge. Back to a lower rate that still gives sets a
    // real chance to combine without dominating every breeding event.
    const SET_INJECT_RATE: f64 = 0.06;
    const SET_CROSSOVER_RATE: f64 = 0.3;
    // How many of each generation's non-elite slots are a brand new random
    // build instead of a crossover child — "random immigrants", a standard
    // counter to premature convergence: without a steady trickle of
    // genuinely fresh genetic material, the whole population can drift
    // into the same neighborhood and stall there (generations_since_improvement
    // hits STALL_LIMIT_GENERATIONS) long before the time budget is used up.
    const RANDOM_IMMIGRANTS_PER_GEN: usize = 24;
    // Raised sharply after the same first-pass benchmark: with POP_SIZE
    // this size and evaluate() this cheap, even several hundred
    // generations finish in well under the 240s ceiling, so a low stall
    // limit was cutting hard cases off at a small fraction of the real
    // available search depth for no speed benefit that actually mattered.
    // Unconditional (not gated on reaching full feasibility), same
    // reasoning as the old per-seed STALL_LIMIT: an ambitious,
    // never-fully-feasible request still plateaus just as concretely as
    // an easy one solved instantly, and both should stop once they do.
    const STALL_LIMIT_GENERATIONS: usize = 400;
    // Raised from an initial 8 after empirical proof it mattered: polishing
    // only the final generation's top 8 landed on the EXACT same answer
    // regardless of population size or generation count, because selection
    // pressure had already clustered them into one neighborhood — single-
    // slot steepest-ascent only ever escapes the one basin it starts in, so
    // a handful of near-identical starting points can only ever rediscover
    // the same basin. Pulling diverse starts from the WHOLE run's history
    // (hall_of_fame, every individual ever evaluated) instead of just the
    // final population, and polishing many more of them, is what actually
    // buys extra chances to land in a better one.
    const FINAL_POLISH_COUNT: usize = 40;

    let mut rng = Rng::new(seed_from_config(&config, &base));

    let mut light_polish_pool: HashMap<String, Vec<&CatalogItem>> = HashMap::new();
    for slot in &slots_to_optimize {
        let mut p = pools.get(slot).cloned().unwrap_or_default();
        p.truncate(LIGHT_POLISH_POOL);
        light_polish_pool.insert(slot.clone(), p);
    }

    let mut population: Vec<Individual> = Vec::with_capacity(POP_SIZE);
    population.push(greedy_fill_remaining(&pools, &Individual::new(), &slots_to_optimize));
    // Best pairs/triples first — these are already the most promising
    // combined starting points for THIS weight vector, so they get first
    // claim on the population's seeded (non-random) share.
    for seed in multi_set_seeds.iter().take(POP_SIZE / 10) {
        population.push(seed.individual.clone());
    }
    for entry in set_entries.iter().take(POP_SIZE / 5) {
        let (assigned, used) = apply_set(&entry.set_items, &open_slots_set, &Individual::new());
        if used.len() < 2 {
            continue;
        }
        let remaining: Vec<String> = slots_to_optimize.iter().filter(|s| !used.contains(*s)).cloned().collect();
        population.push(greedy_fill_remaining(&pools, &assigned, &remaining));
    }
    while population.len() < POP_SIZE {
        population.push(random_individual(&pools, &slots_to_optimize, &mut rng));
    }

    let mut evaluated: Vec<(Individual, BuildResult)> = population
        .into_iter()
        .map(|ind| {
            let r = ctx.evaluate(&ind);
            (ind, r)
        })
        .collect();
    for (_, r) in &evaluated {
        remember(r.clone(), &mut hall_of_fame);
    }
    evaluated.sort_by(|a, b| ctx.rank(&b.1).partial_cmp(&ctx.rank(&a.1)).unwrap());

    let mut best_rank_ever = evaluated.first().map(|(_, r)| ctx.rank(r)).unwrap_or(f64::NEG_INFINITY);
    let mut generations_since_improvement: usize = 0;
    let mut generation: u64 = 0;

    if !report_progress(&hall_of_fame, 0, true) {
        generations_since_improvement = STALL_LIMIT_GENERATIONS; // fall through to the same wrap-up every normal stop goes through
    }

    loop {
        if now_ms() - start_time > TIME_BUDGET_MS {
            break;
        }
        if generations_since_improvement >= STALL_LIMIT_GENERATIONS {
            break;
        }
        generation += 1;

        let mut next_gen: Vec<(Individual, BuildResult)> = Vec::with_capacity(POP_SIZE);
        for (i, (ind, result)) in evaluated.iter().take(ELITE_COUNT).enumerate() {
            if i < ELITE_POLISH_COUNT {
                let polished_result = local_search(&ctx, &light_polish_pool, &slots_to_optimize, ind, LIGHT_POLISH_SWEEPS);
                let polished_ind: Individual = slots_to_optimize
                    .iter()
                    .filter_map(|s| polished_result.equipped.get(s).map(|&id| (s.clone(), id)))
                    .collect();
                remember(polished_result.clone(), &mut hall_of_fame);
                next_gen.push((polished_ind, polished_result));
            } else {
                next_gen.push((ind.clone(), result.clone()));
            }
        }

        let mut immigrants_added = 0usize;
        let mut stop_requested = false;
        while next_gen.len() < POP_SIZE {
            // Checked mid-generation (not just once per full generation) so
            // an explicit "use this result now" from the UI doesn't have to
            // wait for the rest of a population (up to POP_SIZE strong) to
            // finish breeding first — confirmed in a real browser that a
            // single generation can itself take several real seconds, which
            // otherwise meant "stop" wasn't actually responsive during it.
            if next_gen.len() % 50 == 0 && !report_progress(&hall_of_fame, generation, false) {
                stop_requested = true;
                break;
            }
            if immigrants_added < RANDOM_IMMIGRANTS_PER_GEN {
                immigrants_added += 1;
                let ind = random_individual(&pools, &slots_to_optimize, &mut rng);
                let result = ctx.evaluate(&ind);
                remember(result.clone(), &mut hall_of_fame);
                next_gen.push((ind, result));
                continue;
            }

            let parent_a = tournament_select(&evaluated, TOURNAMENT_K, &ctx, &mut rng).clone();
            let parent_b = tournament_select(&evaluated, TOURNAMENT_K, &ctx, &mut rng).clone();

            let mut child = if !set_entries.is_empty() && rng.chance(SET_CROSSOVER_RATE) {
                // Set-block transplant: start from parent A, layer one of
                // parent B's candidate sets into whatever slots parent A
                // left free — lets a child inherit two different parents'
                // sets in one move instead of needing many generations of
                // lucky per-slot crossover to assemble the same thing.
                let mut child = parent_a.clone();
                // Rank-biased, not uniform: set_entries is sorted best-
                // standalone-score-first for THIS weight vector, and a
                // uniform pick among (often) hundreds of mostly-irrelevant
                // sets was diluting crossover's one real advantage —
                // actually combining the handful of sets that matter here.
                let idx = weighted_index(set_entries.len(), &mut rng);
                let (assigned, _) = apply_set(&set_entries[idx].set_items, &open_slots_set, &child);
                for (slot, id) in assigned {
                    child.insert(slot, id);
                }
                child
            } else {
                // Uniform crossover: each slot independently from one
                // parent or the other.
                let mut child = Individual::new();
                for slot in &slots_to_optimize {
                    let src = if rng.chance(0.5) { &parent_a } else { &parent_b };
                    if let Some(&id) = src.get(slot) {
                        child.insert(slot.clone(), id);
                    }
                }
                child
            };

            for slot in &slots_to_optimize {
                if rng.chance(MUTATION_GENE_RATE) {
                    if let Some(pool) = pools.get(slot) {
                        if let Some(item) = weighted_pick(pool, &mut rng) {
                            child.insert(slot.clone(), item.ankama_id);
                        }
                    }
                }
            }
            if !set_entries.is_empty() && rng.chance(SET_INJECT_RATE) {
                let idx = weighted_index(set_entries.len(), &mut rng);
                inject_set(&mut child, &set_entries[idx].set_items, &open_slots_set);
            }

            fix_duplicate_constraints(&mut child, &pools, &mut rng);

            let mut result = ctx.evaluate(&child);
            if !result.conditions_ok {
                // Same Trophy/set repair used in the final safety pass
                // below — cheap (at most two extra evaluations) and keeps
                // an illegal combination from quietly winning a tournament
                // just because its raw score looks good before legality
                // is checked.
                for repaired in repair_trophy_set_conflict(&ctx, &pools, &child) {
                    let repaired_result = ctx.evaluate(&repaired);
                    if ctx.rank(&repaired_result) > ctx.rank(&result) {
                        child = repaired;
                        result = repaired_result;
                    }
                }
            }
            remember(result.clone(), &mut hall_of_fame);
            next_gen.push((child, result));
        }

        evaluated = next_gen;
        evaluated.sort_by(|a, b| ctx.rank(&b.1).partial_cmp(&ctx.rank(&a.1)).unwrap());

        let gen_best_rank = ctx.rank(&evaluated[0].1);
        if gen_best_rank > best_rank_ever + 1e-9 {
            best_rank_ever = gen_best_rank;
            generations_since_improvement = 0;
        } else {
            generations_since_improvement += 1;
        }

        if stop_requested || !report_progress(&hall_of_fame, generation, false) {
            break;
        }
    }

    // Guaranteed final polish: whatever the population converged to, give
    // the current best candidates one full exhaustive-neighbor hill-climb
    // pass (the same pool size and sweep count the old engine always used
    // on every seed) before returning. The per-generation polish above is
    // deliberately light (small pool, one sweep) to keep many generations
    // affordable; this closes the gap for whatever survived to the end.
    {
        let mut hill_pool: HashMap<String, Vec<&CatalogItem>> = HashMap::new();
        for slot in &slots_to_optimize {
            let mut p = pools.get(slot).cloned().unwrap_or_default();
            p.truncate(HILL_CLIMB_POOL);
            hill_pool.insert(slot.clone(), p);
        }
        // Diverse starting points drawn from EVERY individual ever
        // evaluated this run (hall_of_fame), not just whatever the final
        // generation's population happened to converge to — see the
        // comment on FINAL_POLISH_COUNT above for why that distinction is
        // the one that actually matters here.
        let mut by_rank: Vec<&BuildResult> = hall_of_fame.values().collect();
        by_rank.sort_by(|a, b| ctx.rank(b).partial_cmp(&ctx.rank(a)).unwrap());
        let mut polish_starts: Vec<Individual> = Vec::new();
        for r in &by_rank {
            let candidate: Individual = slots_to_optimize.iter().filter_map(|s| r.equipped.get(s).map(|&id| (s.clone(), id))).collect();
            let diverse_enough = polish_starts.iter().all(|p| slot_diff(&ctx.full_equipped(p), &ctx.full_equipped(&candidate)) >= 2);
            if diverse_enough {
                polish_starts.push(candidate);
            }
            if polish_starts.len() >= FINAL_POLISH_COUNT {
                break;
            }
        }

        for start in &polish_starts {
            // Checked BEFORE each candidate (not mid-candidate — a single
            // local_search call isn't interrupted partway) so an explicit
            // "use this result now" stops picking up new candidates right
            // away instead of grinding through the rest of this batch
            // first — confirmed in a real browser to otherwise add ~20
            // extra seconds after the user already asked to stop, which
            // defeats the entire point of that button.
            if now_ms() - start_time > FINAL_POLISH_DEADLINE_MS || !report_progress(&hall_of_fame, generation, false) {
                break;
            }
            let polished = local_search(&ctx, &hill_pool, &slots_to_optimize, start, HILL_CLIMB_MAX_SWEEPS);
            remember(polished, &mut hall_of_fame);
        }
    }

    // Phase 4: Trophy/set-bonus conflict repair (see repair_trophy_set_conflict's
    // comment for why this needs special-casing instead of relying on
    // hill-climbing alone). Only tried against the top illegal candidates by
    // raw score — repairing every illegal candidate ever evaluated would be
    // wasted work, and a conflict worth escaping only ever shows up among
    // the highest-scoring ones anyway (that's exactly why the search wanted
    // to combine the Trophy and the set in the first place).
    {
        let mut illegal: Vec<&BuildResult> = hall_of_fame.values().filter(|r| !r.conditions_ok).collect();
        illegal.sort_by(|a, b| b.score.partial_cmp(&a.score).unwrap());
        illegal.truncate(20);
        let illegal: Vec<BuildResult> = illegal.into_iter().cloned().collect();
        for r in &illegal {
            let candidate: Individual = r
                .equipped
                .iter()
                .filter(|(slot, _)| !ctx.locked_equipped.contains_key(*slot))
                .map(|(slot, id)| (slot.clone(), *id))
                .collect();
            for repaired in repair_trophy_set_conflict(&ctx, &pools, &candidate) {
                remember(ctx.evaluate(&repaired), &mut hall_of_fame);
            }
        }
    }

    // Pick diverse top results from everything ever evaluated.
    let mut ranked: Vec<BuildResult> = hall_of_fame.into_values().collect();
    ranked.sort_by(|a, b| ctx.rank(b).partial_cmp(&ctx.rank(a)).unwrap());

    let pick_diverse = |min_diff: usize| -> Vec<BuildResult> {
        let mut picked: Vec<BuildResult> = Vec::new();
        for r in &ranked {
            if picked.iter().all(|p: &BuildResult| slot_diff(&p.equipped, &r.equipped) >= min_diff) {
                picked.push(r.clone());
            }
            if picked.len() >= RESULT_COUNT {
                break;
            }
        }
        picked
    };

    let target = RESULT_COUNT.min(ranked.len());
    let mut final_results = pick_diverse(DIVERSITY_MIN_DIFF);
    if final_results.len() < target {
        final_results = pick_diverse(1);
    }
    if final_results.len() < target {
        final_results = ranked.into_iter().take(RESULT_COUNT).collect();
    }

    final_results
}

// Direct ports of src/engine/__tests__/optimizer.test.ts's key regression
// cases - each one pins a specific bug this algorithm was built/fixed to
// avoid (M96-M101), so passing here means the Rust port preserves the same
// correctness guarantees as the verified TypeScript original, not just the
// same shape of code.
#[cfg(test)]
mod tests {
    use super::*;
    use crate::optimizer_types::CatalogCondition;
    use crate::types::ScrolledCharacteristics;

    fn effect(stat: &str, min: i64, max: i64) -> ItemEffect {
        ItemEffect { stat: stat.to_string(), min, max, effect_id: None }
    }
    fn item(id: i64, slot: &str, set_id: Option<i64>, effects: Vec<ItemEffect>) -> CatalogItem {
        CatalogItem { ankama_id: id, name: format!("Item {id}"), level: 50, item_type: "Misc".to_string(), slot: slot.to_string(), effects, conditions: None, set_id }
    }
    fn stat_cfg(stat: &str, weight: i64, min_val: i64) -> StatConfig {
        StatConfig { stat: stat.to_string(), weight, min_val }
    }
    fn no_exo() -> ExoConfig {
        ExoConfig { ap: false, mp: false, range: false }
    }
    fn base_config(stats: Vec<StatConfig>) -> OptimizerConfig {
        OptimizerConfig { stats, exo: no_exo(), max_level: 200, locked_slots: vec![], assume_fully_scrolled: false }
    }
    fn lock_all_except(open: &[&str]) -> Vec<String> {
        ALL_SLOTS.iter().filter(|s| !open.contains(s)).map(|s| s.to_string()).collect()
    }
    fn base_build(level: i64, equipped: HashMap<String, i64>, runes: HashMap<String, HashMap<String, i64>>) -> OptimizerBuildBase {
        OptimizerBuildBase { level, allocated: AllocatedCharacteristics::default(), scrolled: ScrolledCharacteristics::default(), equipped, runes }
    }

    #[test]
    fn assembles_the_weaker_individually_set_over_stronger_loose_items() {
        let set_hat = item(101, "hat", Some(1), vec![effect("Vitality", 50, 0)]);
        let set_cape = item(102, "cape", Some(1), vec![effect("Vitality", 50, 0)]);
        let set_amulet = item(103, "amulet", Some(1), vec![effect("Vitality", 50, 0)]);
        let loose_hat = item(201, "hat", None, vec![effect("Vitality", 200, 0)]);
        let loose_cape = item(202, "cape", None, vec![effect("Vitality", 200, 0)]);
        let loose_amulet = item(203, "amulet", None, vec![effect("Vitality", 200, 0)]);

        let mut bonuses = HashMap::new();
        bonuses.insert("2".to_string(), vec![effect("Vitality", 400, 0)]);
        bonuses.insert("3".to_string(), vec![effect("Vitality", 1000, 0)]);
        let set = CatalogSet { ankama_id: 1, items: vec![101, 102, 103], bonuses };

        let mut config = base_config(vec![stat_cfg("vitality", 10, 0)]);
        config.locked_slots = lock_all_except(&["hat", "cape", "amulet"]);
        // level: 1 keeps the point budget at zero so allocation doesn't add
        // extra Vitality and muddy a test specifically about set assembly.
        let build = base_build(1, HashMap::new(), HashMap::new());

        let results = run_optimizer(config, vec![set_hat, set_cape, set_amulet, loose_hat, loose_cape, loose_amulet], vec![set], build);
        let best = &results[0];
        assert_eq!(best.equipped.get("hat"), Some(&101));
        assert_eq!(best.equipped.get("cape"), Some(&102));
        assert_eq!(best.equipped.get("amulet"), Some(&103));
        // 50+50+50 (pieces) + 1000 (3pc set bonus) = 1150, vs 600 for the loose trio.
        assert_eq!(get_stat(&best.stats, "vitality"), 1150);
    }

    #[test]
    fn rejects_an_item_whose_own_equip_condition_the_build_cannot_meet() {
        let belt_gated = CatalogItem {
            conditions: Some(vec![CatalogCondition { stat: "Intelligence".to_string(), operator: ">".to_string(), value: 1000 }]),
            ..item(301, "belt", None, vec![effect("Strength", 500, 0)])
        };
        let belt_plain = item(302, "belt", None, vec![effect("Strength", 50, 0)]);

        let mut config = base_config(vec![stat_cfg("strength", 10, 0)]);
        config.locked_slots = lock_all_except(&["belt"]);
        let build = base_build(1, HashMap::new(), HashMap::new());

        let results = run_optimizer(config, vec![belt_gated, belt_plain], vec![], build);
        let best = &results[0];
        assert!(best.meets_required);
        assert_eq!(best.equipped.get("belt"), Some(&302));
    }

    #[test]
    fn power_rides_along_with_the_highest_weighted_elemental_damage() {
        let fd_plain = item(340, "amulet", None, vec![effect("Fire damage", 50, 0)]);
        let fd_with_power = item(341, "amulet", None, vec![effect("Fire damage", 30, 0), effect("Power", 70, 0)]);

        let mut config = base_config(vec![stat_cfg("fireDamage", 10, 0)]);
        config.locked_slots = lock_all_except(&["amulet"]);
        let build = base_build(1, HashMap::new(), HashMap::new());

        let results = run_optimizer(config, vec![fd_plain, fd_with_power], vec![], build);
        assert_eq!(results[0].equipped.get("amulet"), Some(&341));
    }

    #[test]
    fn includes_a_locked_slots_forged_rune_in_computed_stats() {
        let runed_amulet = item(330, "amulet", None, vec![effect("Vitality", 50, 0)]);
        let plain_hat = item(331, "hat", None, vec![effect("Vitality", 20, 0)]);

        let mut config = base_config(vec![stat_cfg("vitality", 10, 0)]);
        config.locked_slots = lock_all_except(&["hat"]);

        let mut equipped = HashMap::new();
        equipped.insert("amulet".to_string(), 330);
        let mut rune_map = HashMap::new();
        rune_map.insert("Vitality".to_string(), 500);
        let mut runes = HashMap::new();
        runes.insert("amulet".to_string(), rune_map);
        let build = base_build(1, equipped, runes);

        let results = run_optimizer(config, vec![runed_amulet, plain_hat], vec![], build);
        // 50 (amulet base) + 500 (forged rune) + 20 (hat) = 570
        assert_eq!(get_stat(&results[0].stats, "vitality"), 570);
    }

    #[test]
    fn spends_every_point_on_the_single_weighted_characteristic() {
        let config = base_config(vec![stat_cfg("strength", 10, 0)]);
        let build = base_build(100, HashMap::new(), HashMap::new());
        let results = run_optimizer(config, vec![], vec![], build);
        assert!(results[0].allocated.strength > 0);
        assert_eq!(results[0].allocated.vitality, 0);
        let spent = point_cost("strength", results[0].allocated.strength);
        assert!(spent <= stat_budget(100));
    }

    #[test]
    fn satisfies_two_simultaneous_characteristic_minimums_instead_of_averaging_between_them() {
        // Level 200 budget (995) exactly equals point_cost("strength", 300)
        // [100*1 + 100*2 + 100*3 = 600] + point_cost("vitality", 395) [395,
        // 1pt/pt] = 995 - a deliberately tight fit. At equal weight,
        // Vitality's ratio (weight/1, constant at every point) ties
        // Strength's ratio for strength's first 100 points and then beats
        // it outright once strength enters its pricier brackets — the OLD
        // plain greedy, with no notion of "this characteristic has its own
        // floor to clear first", would keep buying the better-ratio
        // characteristic (Vitality) well past what Strength needed,
        // leaving Strength's 1500 target (or here, 300) unmet even though
        // the exact budget to satisfy BOTH simultaneously exists. The
        // reservation pre-pass in optimal_allocation must claim each
        // floor's minimum first before the greedy loop spends what's left.
        let mut config = base_config(vec![stat_cfg("strength", 6, 300), stat_cfg("vitality", 6, 395)]);
        config.assume_fully_scrolled = false;
        let build = base_build(200, HashMap::new(), HashMap::new());
        let results = run_optimizer(config, vec![], vec![], build);
        let best = &results[0];
        assert!(best.allocated.strength >= 300, "expected Strength >= 300, got {}", best.allocated.strength);
        assert!(best.allocated.vitality >= 395, "expected Vitality >= 395, got {}", best.allocated.vitality);
        let spent = point_cost("strength", best.allocated.strength) + point_cost("vitality", best.allocated.vitality);
        assert!(spent <= stat_budget(200), "allocation spent {spent}, over the {} budget", stat_budget(200));
    }

    #[test]
    fn finds_a_combination_of_three_different_sets_that_beats_any_pair() {
        // Three distinct 2-piece sets, each individually weak (+10/piece,
        // +200 for its own 2pc bonus) but additive across different slots —
        // combining all three (6 slots, 3 bonuses = 660) beats using any two
        // of them and leaving the rest empty (4 slots, 2 bonuses = 440).
        // Phase 2 (pairs) can reach 440 at best; only phase 2.5 (triples)
        // can discover 660, since it requires three DIFFERENT sets active
        // simultaneously, not pieces of the same set.
        let set_a = CatalogSet { ankama_id: 1, items: vec![10, 11], bonuses: HashMap::from([("2".to_string(), vec![effect("Vitality", 200, 0)])]) };
        let set_b = CatalogSet { ankama_id: 2, items: vec![20, 21], bonuses: HashMap::from([("2".to_string(), vec![effect("Vitality", 200, 0)])]) };
        let set_c = CatalogSet { ankama_id: 3, items: vec![30, 31], bonuses: HashMap::from([("2".to_string(), vec![effect("Vitality", 200, 0)])]) };

        let items = vec![
            item(10, "hat", Some(1), vec![effect("Vitality", 10, 0)]),
            item(11, "cape", Some(1), vec![effect("Vitality", 10, 0)]),
            item(20, "amulet", Some(2), vec![effect("Vitality", 10, 0)]),
            item(21, "ring1", Some(2), vec![effect("Vitality", 10, 0)]),
            item(30, "ring2", Some(3), vec![effect("Vitality", 10, 0)]),
            item(31, "belt", Some(3), vec![effect("Vitality", 10, 0)]),
        ];

        let mut config = base_config(vec![stat_cfg("vitality", 10, 0)]);
        config.locked_slots = lock_all_except(&["hat", "cape", "amulet", "ring1", "ring2", "belt"]);
        let build = base_build(1, HashMap::new(), HashMap::new());

        let results = run_optimizer(config, items, vec![set_a, set_b, set_c], build);
        let best = &results[0];
        assert_eq!(get_stat(&best.stats, "vitality"), 660);
        for id in [10, 11, 20, 21, 30, 31] {
            assert!(best.equipped.values().any(|&v| v == id), "expected item {id} to be equipped");
        }
    }

    #[test]
    fn finds_a_combination_of_four_different_sets_that_beats_any_triple() {
        // Four distinct 2-piece sets, each individually weak (+10/piece,
        // +200 for its own 2pc bonus) but additive across different slots —
        // combining all four (8 items x 10 + 4 bonuses x 200 = 880) beats
        // using the best three and filling the 2 leftover slots with loose
        // pieces from the fourth set (6 items x 10 + 3 bonuses x 200 + 2
        // loose items x 10 = 680). Only phase 2.75 (quadruples) can discover
        // 880, since it requires four DIFFERENT sets active simultaneously.
        let set_a = CatalogSet { ankama_id: 1, items: vec![10, 11], bonuses: HashMap::from([("2".to_string(), vec![effect("Vitality", 200, 0)])]) };
        let set_b = CatalogSet { ankama_id: 2, items: vec![20, 21], bonuses: HashMap::from([("2".to_string(), vec![effect("Vitality", 200, 0)])]) };
        let set_c = CatalogSet { ankama_id: 3, items: vec![30, 31], bonuses: HashMap::from([("2".to_string(), vec![effect("Vitality", 200, 0)])]) };
        let set_d = CatalogSet { ankama_id: 4, items: vec![40, 41], bonuses: HashMap::from([("2".to_string(), vec![effect("Vitality", 200, 0)])]) };

        let items = vec![
            item(10, "hat", Some(1), vec![effect("Vitality", 10, 0)]),
            item(11, "cape", Some(1), vec![effect("Vitality", 10, 0)]),
            item(20, "amulet", Some(2), vec![effect("Vitality", 10, 0)]),
            item(21, "ring1", Some(2), vec![effect("Vitality", 10, 0)]),
            item(30, "ring2", Some(3), vec![effect("Vitality", 10, 0)]),
            item(31, "belt", Some(3), vec![effect("Vitality", 10, 0)]),
            item(40, "boots", Some(4), vec![effect("Vitality", 10, 0)]),
            item(41, "weapon", Some(4), vec![effect("Vitality", 10, 0)]),
        ];

        let mut config = base_config(vec![stat_cfg("vitality", 10, 0)]);
        config.locked_slots = lock_all_except(&["hat", "cape", "amulet", "ring1", "ring2", "belt", "boots", "weapon"]);
        let build = base_build(1, HashMap::new(), HashMap::new());

        let results = run_optimizer(config, items, vec![set_a, set_b, set_c, set_d], build);
        let best = &results[0];
        assert_eq!(get_stat(&best.stats, "vitality"), 880);
        for id in [10, 11, 20, 21, 30, 31, 40, 41] {
            assert!(best.equipped.values().any(|&v| v == id), "expected item {id} to be equipped");
        }
    }

    #[test]
    fn escapes_a_trophy_vs_set_bonus_conflict_to_find_the_true_legal_optimum() {
        // A Trophy ("Set bonus" < 2 condition) that looks amazing alone
        // (+1000 Vitality) vs. a 2pc set that also looks amazing (+10/piece,
        // +2000 for the 2pc bonus). Equipping both together is illegal (the
        // set bonus trips the Trophy's condition) but every phase ranks each
        // slot by raw score alone and would naturally pick the Trophy for
        // dofus1 AND the set for hat/cape, landing on the illegal 3020
        // (1000 + 10 + 10 + 2000) combo. The only two LEGAL alternatives are
        // trophy-alone (1000 + 0 + 0 = 1000, using zero-value loose hat/cape)
        // or set-alone (50 + 10 + 10 + 2000 = 2070, using a weak loose dofus
        // instead of the Trophy) — repair_trophy_set_conflict must discover
        // the second, better one, since hill-climbing's single-slot swaps
        // alone can get stuck on the illegal combo (removing only one of the
        // two set pieces still leaves the piece count at 1, which already
        // satisfies "< 2" in this 2pc case — so this specific fixture is
        // actually escapable by hill-climbing too; the repair phase is what
        // GUARANTEES it even for 3+-piece sets where hill-climbing alone
        // cannot, see the module comment above repair_trophy_set_conflict).
        let trophy = CatalogItem {
            ankama_id: 900,
            name: "Trophy".to_string(),
            level: 50,
            item_type: "Trophy".to_string(),
            slot: "dofus".to_string(),
            effects: vec![effect("Vitality", 1000, 0)],
            conditions: Some(vec![CatalogCondition { stat: "Set bonus".to_string(), operator: "<".to_string(), value: 2 }]),
            set_id: None,
        };
        let loose_dofus = item(901, "dofus", None, vec![effect("Vitality", 50, 0)]);
        let hat_piece = item(10, "hat", Some(1), vec![effect("Vitality", 10, 0)]);
        let cape_piece = item(11, "cape", Some(1), vec![effect("Vitality", 10, 0)]);
        let loose_hat = item(20, "hat", None, vec![effect("Vitality", 0, 0)]);
        let loose_cape = item(21, "cape", None, vec![effect("Vitality", 0, 0)]);
        let set = CatalogSet { ankama_id: 1, items: vec![10, 11], bonuses: HashMap::from([("2".to_string(), vec![effect("Vitality", 2000, 0)])]) };

        let mut config = base_config(vec![stat_cfg("vitality", 10, 0)]);
        config.locked_slots = lock_all_except(&["dofus1", "hat", "cape"]);
        let build = base_build(1, HashMap::new(), HashMap::new());

        let results = run_optimizer(config, vec![trophy, loose_dofus, hat_piece, cape_piece, loose_hat, loose_cape], vec![set], build);
        let best = &results[0];
        assert!(best.conditions_ok, "expected the returned best build to be legal (no equip-condition violations)");
        assert_eq!(get_stat(&best.stats, "vitality"), 2070, "expected the set-alone legal optimum (2070), not the illegal trophy+set combo (3020) or the weaker trophy-alone legal option (1000)");
    }

    #[test]
    fn uses_only_part_of_a_set_when_the_rest_of_its_pieces_lose_to_loose_alternatives() {
        // A 4-piece set whose bonus already maxes out at 2 pieces (only a "2"
        // tier is defined, so 3 or 4 pieces grant the SAME bonus, not more —
        // a real, common Dofus pattern). hat/cape have no better alternative
        // (the set pieces are forced there), but amulet/belt each have a
        // vastly better loose alternative. The true optimum uses the set
        // ONLY for hat/cape (to get the 2pc bonus) and loose items for
        // amulet/belt: 5+5+5000+5000+2000 = 12010. apply_set (phase 1) only
        // ever tries "every piece that fits" (4-of-4: 5+5+5+5+2000 = 2020,
        // since the tier stays capped at the 2pc value), never a deliberate
        // partial subset — and single-slot hill-climbing can't discover it
        // either: swapping just ONE of hat/cape to the set (starting from
        // the all-loose baseline) looks like a pure loss in isolation, since
        // the bonus only kicks in once BOTH are swapped together.
        let set_hat    = item(40, "hat",    Some(1), vec![effect("Vitality", 5, 0)]);
        let set_cape   = item(41, "cape",   Some(1), vec![effect("Vitality", 5, 0)]);
        let set_amulet = item(42, "amulet", Some(1), vec![effect("Vitality", 5, 0)]);
        let set_belt   = item(43, "belt",   Some(1), vec![effect("Vitality", 5, 0)]);
        let loose_amulet = item(142, "amulet", None, vec![effect("Vitality", 5000, 0)]);
        let loose_belt   = item(143, "belt",   None, vec![effect("Vitality", 5000, 0)]);
        let set = CatalogSet { ankama_id: 1, items: vec![40, 41, 42, 43], bonuses: HashMap::from([("2".to_string(), vec![effect("Vitality", 2000, 0)])]) };

        let mut config = base_config(vec![stat_cfg("vitality", 10, 0)]);
        config.locked_slots = lock_all_except(&["hat", "cape", "amulet", "belt"]);
        let build = base_build(1, HashMap::new(), HashMap::new());

        let results = run_optimizer(config, vec![set_hat, set_cape, set_amulet, set_belt, loose_amulet, loose_belt], vec![set], build);
        let best = &results[0];
        assert_eq!(get_stat(&best.stats, "vitality"), 12010, "expected the partial-set optimum (hat+cape for the 2pc bonus, loose amulet+belt) — got {}, suggesting the search only tried the full 4-piece set (2020) or no set at all (10020)", get_stat(&best.stats, "vitality"));
    }

    #[test]
    fn never_duplicates_an_item_across_the_two_ring_slots() {
        let ring_a = item(500, "ring", None, vec![effect("Strength", 100, 0)]);
        let ring_b = item(501, "ring", None, vec![effect("Strength", 90, 0)]);

        let mut config = base_config(vec![stat_cfg("strength", 10, 0)]);
        config.locked_slots = lock_all_except(&["ring1", "ring2"]);
        let build = base_build(1, HashMap::new(), HashMap::new());

        let results = run_optimizer(config, vec![ring_a, ring_b], vec![], build);
        for r in &results {
            let r1 = r.equipped.get("ring1");
            let r2 = r.equipped.get("ring2");
            if let (Some(a), Some(b)) = (r1, r2) {
                assert_ne!(a, b);
            }
        }
    }

    #[test]
    fn exo_ap_assumes_a_forged_ring_supplies_the_final_point() {
        // Base AP at level 200 is 7 (6 + the level-100 bonus); +4 from the
        // amulet below reaches 11 — exactly one short of the Exo AP floor
        // (12, the official cap). Checking "Exo AP" should supply that
        // last point by assuming whichever ring gets equipped carries a
        // forged Exo PA rune — the only slot real Dofus forgemagie allows
        // it on — rather than demanding the full 12 come from items' own
        // natural effects alone, which is more than the feature promises
        // ("include items with +1 AP exo-maged").
        let amulet = item(700, "amulet", None, vec![effect("AP", 4, 0)]);
        let plain_ring = item(701, "ring", None, vec![effect("Strength", 10, 0)]);

        let mut config = base_config(vec![stat_cfg("ap", 0, 0)]);
        config.exo = ExoConfig { ap: true, mp: false, range: false };
        config.locked_slots = lock_all_except(&["amulet", "ring1"]);
        let build = base_build(200, HashMap::new(), HashMap::new());

        let results = run_optimizer(config, vec![amulet, plain_ring], vec![], build);
        let best = &results[0];
        assert_eq!(get_stat(&best.stats, "ap"), 12, "expected Exo AP to supply the missing point once a ring is equipped, got {}", get_stat(&best.stats, "ap"));
        assert!(best.meets_required);
    }

    #[test]
    fn exo_ap_grants_nothing_without_a_ring_to_forge_it_onto() {
        // Same 11-raw-AP setup as above, but with BOTH ring slots locked
        // empty — nowhere to assume a forged Exo PA rune, so AP should
        // stay at the natural 11, short of the floor.
        let amulet = item(700, "amulet", None, vec![effect("AP", 4, 0)]);

        let mut config = base_config(vec![stat_cfg("ap", 0, 0)]);
        config.exo = ExoConfig { ap: true, mp: false, range: false };
        config.locked_slots = lock_all_except(&["amulet"]);
        let build = base_build(200, HashMap::new(), HashMap::new());

        let results = run_optimizer(config, vec![amulet], vec![], build);
        let best = &results[0];
        assert_eq!(get_stat(&best.stats, "ap"), 11, "expected no Exo bonus without an equipped ring, got {}", get_stat(&best.stats, "ap"));
        assert!(!best.meets_required);
    }

    #[test]
    fn progress_callback_fires_and_reports_a_real_candidate() {
        let ring_a = item(500, "ring", None, vec![effect("Strength", 100, 0)]);
        let ring_b = item(501, "ring", None, vec![effect("Strength", 90, 0)]);
        let mut config = base_config(vec![stat_cfg("strength", 10, 0)]);
        config.locked_slots = lock_all_except(&["ring1", "ring2"]);
        let build = base_build(1, HashMap::new(), HashMap::new());

        let calls = std::cell::Cell::new(0i32);
        let best_strength_seen = std::cell::Cell::new(0i64);
        let results = run_optimizer_with_progress(config, vec![ring_a, ring_b], vec![], build, &|update| {
            calls.set(calls.get() + 1);
            best_strength_seen.set(get_stat(&update.best.stats, "strength"));
            true
        });
        assert!(calls.get() >= 1, "expected the progress callback to fire at least once");
        assert!(best_strength_seen.get() > 0, "expected the reported candidate to actually have equipped something");
        assert!(!results.is_empty());
    }

    #[test]
    fn progress_callback_returning_false_stops_the_search_early_but_still_returns_results() {
        let ring_a = item(500, "ring", None, vec![effect("Strength", 100, 0)]);
        let ring_b = item(501, "ring", None, vec![effect("Strength", 90, 0)]);
        let mut config = base_config(vec![stat_cfg("strength", 10, 0)]);
        config.locked_slots = lock_all_except(&["ring1", "ring2"]);
        let build = base_build(1, HashMap::new(), HashMap::new());

        // Stop on the very first call - the search should still fall through
        // to the guaranteed final polish and return a fully legal, usable
        // result, not an empty or half-finished one.
        let results = run_optimizer_with_progress(config, vec![ring_a, ring_b], vec![], build, &|_| false);
        assert!(!results.is_empty());
        assert!(results[0].conditions_ok);
    }
}
