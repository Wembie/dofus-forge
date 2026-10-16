// La Forjadora's engine: an island-model evolutionary search over item
// combinations, advanced a batch of generations at a time.
//
// - Every build gets a tiered score: structurally illegal builds sit below
//   everything, then builds breaking an item condition or an absolute max,
//   then builds with unmet goals (score = -Σ weight·deficit, always
//   negative), and finally builds meeting every goal (score = Σ
//   weight·surplus, always >= 0). A soft max just stops counting past it.
// - Characteristic points, exo runes and transcendence runes are not part of
//   the genome: they are re-decided for every evaluated build (greedy by
//   marginal gain), so the search only explores item combinations.
// - `temper()` finishes a run with a slot-by-slot local search over the best
//   builds found, which the evolutionary search alone converges to slowly.

use crate::characteristics::{point_cost, stat_budget, SCROLL_BONUS};
use crate::optimizer_types::{BuildResult, CatalogItem, CatalogSet, OptimizerBuildBase, OptimizerConfig, RuneChoice};
use crate::stat_map::stat_key;
use crate::stats::{base_hp, compute_stats, get_stat, raw_effects_block, BASE_AP, BASE_MP, BASE_PODS};
use crate::types::{floor_div, AllocatedCharacteristics, BuildInput, EquippedItem, ItemEffect, ScrolledCharacteristics, SetData, StatBlock};
use serde::Serialize;
use std::collections::{HashMap, HashSet};

pub const ALL_SLOTS: [&str; 17] = [
    "hat", "cape", "amulet", "ring1", "ring2", "belt", "boots", "weapon", "shield", "companion",
    "sidekick", "dofus1", "dofus2", "dofus3", "dofus4", "dofus5", "dofus6",
];
const NSLOT: usize = ALL_SLOTS.len();
const RING1: usize = 3;
const RING2: usize = 4;
const DOFUS_FIRST: usize = 11;
// Slots forgemagie can touch: each can carry one exo or transcendence rune.
const FORGEABLE: [usize; 9] = [0, 1, 2, 3, 4, 5, 6, 7, 8];

// Dense stat layout: same keys get_stat() understands, so a dense vector
// converts to/from a StatBlock losslessly for every stat the Forge scores.
const FIELDS: [&str; 60] = [
    "ap", "mp", "range", "vitality", "wisdom", "strength", "intelligence", "chance", "agility", "maxHp",
    "power", "damage", "neutralDamage", "earthDamage", "fireDamage", "waterDamage", "airDamage",
    "neutralSteal", "earthSteal", "fireSteal", "waterSteal", "airSteal", "bestElemSteal", "bestElemDamage",
    "neutralResFixed", "earthResFixed", "fireResFixed", "waterResFixed", "airResFixed",
    "neutralResPercent", "earthResPercent", "fireResPercent", "waterResPercent", "airResPercent",
    "critChance", "critDamage", "critResistance",
    "meleeDamagePercent", "rangedDamagePercent", "spellDamagePercent", "weaponDamagePercent",
    "meleeResistPercent", "rangedResistPercent",
    "trapDamage", "trapPower", "pushbackDamage", "pushbackResist", "reflectedDamage",
    "heals", "initiative", "lock", "dodge", "prospecting", "summons", "pods",
    "apReduction", "mpReduction", "apParry", "mpParry", "mpSteal",
];
const NF: usize = FIELDS.len();
type Vec60 = [i64; NF];

const AP: usize = 0;
const MP: usize = 1;
const RANGE: usize = 2;
const VIT: usize = 3;
const WIS: usize = 4;
const STR: usize = 5;
const CHA: usize = 7;
const AGI: usize = 8;
const MAXHP: usize = 9;
const POWER: usize = 10;
const DAMAGE: usize = 11;
const ELEM_DMG_FIRST: usize = 12;
const ELEM_DMG_LAST: usize = 16;
const RES_PCT_FIRST: usize = 29;
const RES_PCT_LAST: usize = 33;
const INITIATIVE: usize = 49;
const LOCK: usize = 50;
const DODGE: usize = 51;
const PROSPECTING: usize = 52;
const SUMMONS: usize = 53;
const PODS: usize = 54;
const AP_REDUCTION: usize = 55;
const MP_PARRY: usize = 58;

// Characteristic order for allocation: matches AllocatedCharacteristics.
const CHARS: [&str; 6] = ["vitality", "wisdom", "strength", "intelligence", "chance", "agility"];

// Official forgemagie weight per stat point: how "heavy" a line is.
fn fm_weight(i: usize) -> f64 {
    match FIELDS[i] {
        "ap" => 100.0,
        "mp" => 90.0,
        "range" => 51.0,
        "summons" => 30.0,
        "vitality" => 0.2,
        "wisdom" => 3.0,
        "strength" | "intelligence" | "chance" | "agility" => 1.0,
        "power" => 2.0,
        "damage" => 20.0,
        "neutralDamage" | "earthDamage" | "fireDamage" | "waterDamage" | "airDamage" => 5.0,
        "critChance" | "heals" => 10.0,
        "critDamage" | "pushbackDamage" | "trapDamage" => 5.0,
        "critResistance" | "pushbackResist" => 2.0,
        "neutralResFixed" | "earthResFixed" | "fireResFixed" | "waterResFixed" | "airResFixed" => 2.0,
        "neutralResPercent" | "earthResPercent" | "fireResPercent" | "waterResPercent" | "airResPercent" => 6.0,
        "meleeDamagePercent" | "rangedDamagePercent" | "spellDamagePercent" | "weaponDamagePercent" => 15.0,
        "meleeResistPercent" | "rangedResistPercent" => 15.0,
        "lock" | "dodge" | "prospecting" => if FIELDS[i] == "prospecting" { 3.0 } else { 4.0 },
        "apReduction" | "mpReduction" | "apParry" | "mpParry" => 7.0,
        "initiative" => 0.1,
        "pods" => 0.25,
        _ => 1.0,
    }
}

// Official transcendence runes (Tra / Pa / Ra ranks): stat, bonus per rank.
// A rank only takes on an item whose existing line on that stat weighs at
// most RANK_WEIGHT_LIMIT of it.
const TRANSCENDENCE: [(&str, [i64; 3]); 31] = [
    ("vitality", [50, 75, 100]),
    ("strength", [10, 15, 20]),
    ("intelligence", [10, 15, 20]),
    ("chance", [10, 15, 20]),
    ("agility", [10, 15, 20]),
    ("power", [6, 9, 12]),
    ("earthDamage", [2, 4, 6]),
    ("fireDamage", [2, 4, 6]),
    ("waterDamage", [2, 4, 6]),
    ("airDamage", [2, 4, 6]),
    ("neutralDamage", [2, 4, 6]),
    ("critChance", [1, 2, 0]),
    ("critDamage", [6, 8, 0]),
    ("critResistance", [9, 12, 0]),
    ("pushbackDamage", [6, 8, 0]),
    ("pushbackResist", [9, 12, 0]),
    ("heals", [4, 7, 10]),
    ("initiative", [100, 150, 200]),
    ("pods", [100, 200, 400]),
    ("lock", [4, 6, 8]),
    ("dodge", [4, 6, 8]),
    ("apReduction", [2, 3, 4]),
    ("mpReduction", [2, 3, 4]),
    ("apParry", [2, 4, 6]),
    ("mpParry", [2, 4, 6]),
    ("earthResPercent", [2, 0, 0]),
    ("fireResPercent", [2, 0, 0]),
    ("waterResPercent", [2, 0, 0]),
    ("airResPercent", [2, 0, 0]),
    ("neutralResPercent", [2, 0, 0]),
    ("meleeDamagePercent", [1, 0, 0]),
];
const MORE_TRANSCENDENCE: [(&str, [i64; 3]); 5] = [
    ("rangedDamagePercent", [1, 0, 0]),
    ("spellDamagePercent", [1, 0, 0]),
    ("weaponDamagePercent", [1, 0, 0]),
    ("meleeResistPercent", [1, 0, 0]),
    ("rangedResistPercent", [1, 0, 0]),
];
const RANK_WEIGHT_LIMIT: [f64; 3] = [60.0, 40.0, 20.0];

// Sheet rune names (RuneModal's stat keys) for each runeable dense stat.
fn rune_stat_name(i: usize) -> &'static str {
    match FIELDS[i] {
        "vitality" => "Vitality",
        "strength" => "Strength",
        "intelligence" => "Intelligence",
        "chance" => "Chance",
        "agility" => "Agility",
        "power" => "Power",
        "earthDamage" => "Earth Damage",
        "fireDamage" => "Fire Damage",
        "waterDamage" => "Water Damage",
        "airDamage" => "Air Damage",
        "neutralDamage" => "Neutral Damage",
        "critChance" => "% Critical",
        "critDamage" => "Critical Damage",
        "critResistance" => "Critical Resistance",
        "pushbackDamage" => "Pushback Damage",
        "pushbackResist" => "Pushback Resistance",
        "heals" => "Heal",
        "initiative" => "Initiative",
        "pods" => "Pod",
        "lock" => "Lock",
        "dodge" => "Dodge",
        "apReduction" => "AP Reduction",
        "mpReduction" => "MP Reduction",
        "apParry" => "AP Parry",
        "mpParry" => "MP Parry",
        "earthResPercent" => "% Earth Resistance",
        "fireResPercent" => "% Fire Resistance",
        "waterResPercent" => "% Water Resistance",
        "airResPercent" => "% Air Resistance",
        "neutralResPercent" => "% Neutral Resistance",
        "meleeDamagePercent" => "% Melee Damage",
        "rangedDamagePercent" => "% Ranged Damage",
        "spellDamagePercent" => "% Spell Damage",
        "weaponDamagePercent" => "% Weapon Damage",
        "meleeResistPercent" => "% Melee Resistance",
        "rangedResistPercent" => "% Ranged Resistance",
        _ => "",
    }
}

const TIER_ILLEGAL: f64 = -2e9;
const TIER_CONDITION: f64 = -1e9;
const NO_MAX: i64 = i64::MAX / 4;
const CONDITION_WEIGHT: f64 = 1e4;

// Search shape. A run splits TOTAL_ISLANDS across its Workers.
pub const TOTAL_ISLANDS: usize = 96;
const ISLAND_SIZE: usize = 512;
const ELITE_FRACTION: f64 = 0.18;
const IMMIGRANT_FRACTION: f64 = 0.01;
const TOURNAMENT_K: usize = 9;
const SET_MUTATION_RATE: f64 = 0.40;
const SECOND_SET_RATE: f64 = 0.20;
// Measured on a real multi-basin order: restarting a stalled island after
// 50 generations finds the best basin more often than 95 (more independent
// attempts) or 30 (attempts too short to converge).
const STAGNATION_RESET: u32 = 50;
// Generations an island may idle on the current overall best before it is
// sent elsewhere.
const REDISCOVERY_RESET: u32 = 12;
// Top-ranked sets tried whole on the best piece during tempering.
const SET_SWAP_SETS: usize = 30;
pub const MIGRATION_EVERY: u64 = 41;
const MIGRATION_FRACTION: f64 = 0.03;
// Candidates per slot for the tempering passes (best standalone value first).
const SHORT_POOL: usize = 60;
// Items kept per (requested stat, slot) for targeted repairs.
const STAT_POOL: usize = 15;
// Alloy seeding: every combination of 1–3 sets among the top ALLOY_SETS
// (and of 4 among the top ALLOY_QUADS), greedily completed with loose items.
const ALLOY_SETS: usize = 30;
const ALLOY_QUADS: usize = 12;
const ALLOY_SEEDS_PER_ISLAND: usize = 24;
const ALLOY_POOL: usize = 256;
// Evaluation cache entries per Forge (~16 MB).
const CACHE_SIZE: usize = 400_000;

// The cache keys are already well-mixed 64-bit hashes: no need to hash
// them again.
#[derive(Default, Clone, Copy)]
struct IdentityBuild;
#[derive(Default)]
struct IdentityHasher(u64);
impl std::hash::Hasher for IdentityHasher {
    fn finish(&self) -> u64 {
        self.0
    }
    fn write(&mut self, bytes: &[u8]) {
        for b in bytes {
            self.0 = (self.0 << 8) | *b as u64;
        }
    }
    fn write_u64(&mut self, v: u64) {
        self.0 = v;
    }
}
impl std::hash::BuildHasher for IdentityBuild {
    type Hasher = IdentityHasher;
    fn build_hasher(&self) -> IdentityHasher {
        IdentityHasher(0)
    }
}
pub const HALL_SIZE: usize = 10;

fn obtainable(item: &CatalogItem) -> bool {
    if [6894, 6895, 7913, 9031, 34569].contains(&item.ankama_id) {
        return false;
    }
    let lower = item.name.to_lowercase();
    !(lower.contains("(mj)") || lower.contains("(gm)") || lower.contains("gms only") || lower.contains("gm only") || lower == "hide effect test")
}

fn is_companion(item: &CatalogItem) -> bool {
    item.slot == "pet" || (item.slot == "other" && ["Pet", "Petsmount", "Dragoturkey", "Seemyool", "Rhineetle"].contains(&item.item_type.as_str()))
}

fn fits_slot(item: &CatalogItem, slot: usize) -> bool {
    match ALL_SLOTS[slot] {
        "ring1" | "ring2" => item.slot == "ring",
        "companion" => is_companion(item),
        "sidekick" => item.slot == "other" && item.item_type == "Sidekick",
        s if s.starts_with("dofus") => item.slot == "dofus",
        s => item.slot == s,
    }
}

// Low-level items are never worth a slot at high character levels; skipping
// them keeps pools small (Dofus, trophies and companions are exempt since
// many of the best ones are low level).
fn level_floor(char_level: i64) -> i64 {
    if char_level >= 180 {
        60
    } else if char_level >= 150 {
        40
    } else if char_level > 99 {
        20
    } else {
        0
    }
}

fn dense(block: &StatBlock) -> Vec60 {
    let mut v = [0i64; NF];
    for (i, key) in FIELDS.iter().enumerate() {
        v[i] = get_stat(block, key);
    }
    v
}

fn add_into(acc: &mut Vec60, v: &Vec60) {
    for i in 0..NF {
        acc[i] += v[i];
    }
}

fn splitmix(mut z: u64) -> u64 {
    z = z.wrapping_add(0x9E37_79B9_7F4A_7C15);
    z = (z ^ (z >> 30)).wrapping_mul(0xBF58_476D_1CE4_E5B9);
    z = (z ^ (z >> 27)).wrapping_mul(0x94D0_49BB_1331_11EB);
    z ^ (z >> 31)
}

struct Rng(u64);
impl Rng {
    fn next_u64(&mut self) -> u64 {
        self.0 = self.0.wrapping_add(0x9E37_79B9_7F4A_7C15);
        splitmix(self.0)
    }
    fn f64(&mut self) -> f64 {
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
        self.f64() < p
    }
}

#[derive(Clone, Copy)]
enum CondKind {
    Level,
    SetPieces,
    Stat(usize),
}

#[derive(Clone)]
struct Cond {
    kind: CondKind,
    op: u8, // b'>', b'<', b'g' (>=), b'l' (<=), b'='
    value: i64,
}

fn compare(actual: i64, op: u8, value: i64) -> bool {
    match op {
        b'>' => actual > value,
        b'<' => actual < value,
        b'g' => actual >= value,
        b'l' => actual <= value,
        _ => actual == value,
    }
}

struct Item {
    ankama_id: i64,
    vec: Vec60,
    set: Option<usize>,
    conds: Vec<Cond>,
    prysmaradite: bool,
    // Best transcendence rune per scored stat this item may take.
    runes: Vec<(usize, i64)>,
}

#[derive(Clone)]
struct Target {
    idx: usize,
    goal: i64,
    weight: f64,
    max: i64,
    absolute: bool,
    // Strength/Intelligence/Chance/Agility goals also count Power, which
    // boosts damage exactly like the characteristic does.
    add_power: bool,
}

// Does raw stat `i` move the effective value of target `t`?
fn feeds(i: usize, t: &Target) -> bool {
    i == t.idx
        || (t.add_power && i == POWER)
        || ((ELEM_DMG_FIRST..=ELEM_DMG_LAST).contains(&t.idx) && i == DAMAGE)
        || (t.idx == MAXHP && i == VIT)
        || (t.idx == INITIATIVE && (STR..=AGI).contains(&i))
        || ((t.idx == DODGE || t.idx == LOCK) && i == AGI)
        || ((AP_REDUCTION..=MP_PARRY).contains(&t.idx) && i == WIS)
        || (t.idx == PODS && i == STR)
        || (t.idx == PROSPECTING && i == CHA)
}

#[derive(Clone, Copy)]
struct Individual {
    genes: [i32; NSLOT],
    score: f64,
    hash: u64,
}

struct Island {
    pop: Vec<Individual>,
    best: f64,
    stagnant: u32,
}

struct Eval {
    score: f64,
    alloc: [i64; 6],
    exo: [u8; NSLOT],                   // 0 none, 1 ap, 2 mp, 3 range
    rune: [Option<(usize, i64)>; NSLOT], // transcendence rune per slot
    conditions_ok: bool,
    meets_required: bool,
    requirements_met: usize,
    unmet: u64, // bit per target (first 64) whose minimum is still missing
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ForgeReport {
    pub generation: u64,
    /// Pieces evaluated so far ("hammer strikes").
    pub evaluations: u64,
    pub best_score: f64,
    pub results: Vec<BuildResult>,
}

pub struct Forge {
    items: Vec<Item>,
    catalog: Vec<CatalogItem>,
    set_data: Vec<SetData>,
    set_bonus: Vec<Vec<Vec60>>,               // [set][piece count] -> best reached tier
    set_members: Vec<Vec<(i32, Vec<usize>)>>, // [set] -> (item, free slots holding it in their pool)
    set_rank: Vec<usize>,                     // useful sets, most valuable for this order first
    alloy_pool: Vec<[i32; NSLOT]>,            // best set combinations, restart points for stalled islands
    pools: Vec<Vec<i32>>,
    short_pools: Vec<Vec<i32>>,
    stat_pools: Vec<Vec<Vec<i32>>>, // [target][slot] -> items strongest in that stat
    free_slots: Vec<usize>,
    fixed: [i32; NSLOT],
    base_pre: Vec60,
    targets: Vec<Target>,
    stat_targets: Vec<Vec<usize>>, // [dense stat] -> targets it feeds
    level: i64,
    scrolled: ScrolledCharacteristics,
    locked_runes: Vec<ItemEffect>,
    exo_ap: bool,
    exo_mp: bool,
    exo_range: bool,
    exo_only_ring: bool,
    exo_max: usize,
    islands: Vec<Island>,
    hall: Vec<Individual>,
    generation: u64,
    rng: Rng,
    inject_turn: usize,
    evaluations: std::cell::Cell<u64>,
    cache: std::cell::RefCell<HashMap<u64, f64, IdentityBuild>>,
    settle_tempered: bool,
    stagnation_reset: u32,
    set_rank_bias: f64,
    swap_cursor: usize,
    alloy_cursor: usize,
}

impl Forge {
    pub fn new(config: OptimizerConfig, catalog: Vec<CatalogItem>, sets: Vec<CatalogSet>, base: OptimizerBuildBase, seed: u64) -> Forge {
        let scrolled = if config.assume_fully_scrolled {
            ScrolledCharacteristics { vitality: true, wisdom: true, strength: true, intelligence: true, chance: true, agility: true }
        } else {
            base.scrolled.clone()
        };

        let targets: Vec<Target> = config
            .stats
            .iter()
            .filter(|c| c.weight > 0 || c.goal > 0 || (c.absolute && c.max.is_some()))
            .filter_map(|c| {
                let idx = FIELDS.iter().position(|f| *f == c.stat)?;
                let goal = c.goal.max(0);
                let max = c.max.map(|m| m.max(goal)).unwrap_or(NO_MAX);
                Some(Target {
                    idx,
                    goal,
                    weight: c.weight.max(0) as f64,
                    max,
                    absolute: c.absolute && c.max.is_some(),
                    add_power: (STR..=AGI).contains(&idx),
                })
            })
            .collect();
        let stat_targets: Vec<Vec<usize>> = (0..NF).map(|i| targets.iter().enumerate().filter(|(_, t)| feeds(i, t)).map(|(ti, _)| ti).collect()).collect();

        // Sets
        let set_index: HashMap<i64, usize> = sets.iter().enumerate().map(|(i, s)| (s.ankama_id, i)).collect();
        let set_bonus: Vec<Vec<Vec60>> = sets
            .iter()
            .map(|s| {
                let mut tiers: Vec<(i64, Vec60)> = s
                    .bonuses
                    .iter()
                    .filter_map(|(k, effs)| k.parse::<i64>().ok().map(|n| (n, dense(&raw_effects_block(effs, false)))))
                    .collect();
                tiers.sort_by_key(|(n, _)| *n);
                (0..=NSLOT as i64)
                    .map(|count| tiers.iter().filter(|(n, _)| *n <= count).last().map(|(_, v)| *v).unwrap_or([0; NF]))
                    .collect()
            })
            .collect();
        let set_data: Vec<SetData> = sets.iter().map(|s| SetData { ankama_id: s.ankama_id, items: s.items.clone(), bonuses: s.bonuses.clone() }).collect();

        let rune_table: Vec<(usize, [i64; 3])> = TRANSCENDENCE
            .iter()
            .chain(MORE_TRANSCENDENCE.iter())
            .filter_map(|(name, values)| FIELDS.iter().position(|f| f == name).map(|i| (i, *values)))
            .filter(|(i, _)| !stat_targets[*i].is_empty() && config.transcendence)
            .collect();

        // Items
        let items: Vec<Item> = catalog
            .iter()
            .map(|it| {
                let conds = it
                    .conditions
                    .as_ref()
                    .map(|cs| {
                        cs.iter()
                            .filter_map(|c| {
                                let kind = match c.stat.as_str() {
                                    "Be level {0} or higher" => CondKind::Level,
                                    "Set bonus" => CondKind::SetPieces,
                                    s => {
                                        stat_key(s)?;
                                        let probe = raw_effects_block(&[ItemEffect { stat: s.to_string(), min: 1, max: 1, effect_id: None }], false);
                                        CondKind::Stat(dense(&probe).iter().position(|v| *v == 1)?)
                                    }
                                };
                                let op = match c.operator.as_str() {
                                    ">" => b'>',
                                    "<" => b'<',
                                    ">=" => b'g',
                                    "<=" => b'l',
                                    _ => b'=',
                                };
                                Some(Cond { kind, op, value: c.value })
                            })
                            .collect()
                    })
                    .unwrap_or_default();
                let vec = dense(&raw_effects_block(&it.effects, it.slot == "weapon"));
                let forgeable = ["hat", "cape", "amulet", "ring", "belt", "boots", "weapon", "shield"].contains(&it.slot.as_str());
                let runes = if forgeable {
                    rune_table
                        .iter()
                        .filter_map(|(i, values)| {
                            let line_weight = vec[*i] as f64 * fm_weight(*i);
                            (0..3).rev().find(|&r| values[r] > 0 && line_weight <= RANK_WEIGHT_LIMIT[r]).map(|r| (*i, values[r]))
                        })
                        .collect()
                } else {
                    Vec::new()
                };
                Item {
                    ankama_id: it.ankama_id,
                    vec,
                    set: it.set_id.and_then(|id| set_index.get(&id).copied()),
                    conds,
                    prysmaradite: it.item_type == "Prysmaradite",
                    runes,
                }
            })
            .collect();
        let by_ankama: HashMap<i64, i32> = items.iter().enumerate().map(|(i, it)| (it.ankama_id, i as i32)).collect();

        let locked: HashSet<&str> = config.locked_slots.iter().map(|s| s.as_str()).collect();
        let mut fixed = [-1i32; NSLOT];
        let mut free_slots = Vec::new();
        let mut locked_runes = Vec::new();
        for (s, name) in ALL_SLOTS.iter().enumerate() {
            if locked.contains(name) {
                if let Some(id) = base.equipped.get(*name) {
                    fixed[s] = by_ankama.get(id).copied().unwrap_or(-1);
                }
                if let Some(runes) = base.runes.get(*name) {
                    for (stat, value) in runes {
                        if *value > 0 {
                            locked_runes.push(ItemEffect { stat: stat.clone(), min: *value, max: *value, effect_id: None });
                        }
                    }
                }
            } else {
                free_slots.push(s);
            }
        }

        let mut base_pre = [0i64; NF];
        base_pre[AP] = BASE_AP + if base.level >= 100 { 1 } else { 0 };
        base_pre[MP] = BASE_MP;
        base_pre[PODS] = BASE_PODS;
        base_pre[PROSPECTING] = 100;
        base_pre[SUMMONS] = 1;
        add_into(&mut base_pre, &dense(&raw_effects_block(&locked_runes, false)));
        let scroll_flags = [scrolled.vitality, scrolled.wisdom, scrolled.strength, scrolled.intelligence, scrolled.chance, scrolled.agility];
        for (c, on) in scroll_flags.iter().enumerate() {
            if *on {
                base_pre[VIT + c] += SCROLL_BONUS;
            }
        }

        let island_count = config.islands.clamp(1, TOTAL_ISLANDS);
        let mut forge = Forge {
            items,
            catalog,
            set_data,
            set_bonus,
            set_members: vec![Vec::new(); sets.len()],
            set_rank: Vec::new(),
            alloy_pool: Vec::new(),
            pools: vec![Vec::new(); NSLOT],
            short_pools: vec![Vec::new(); NSLOT],
            stat_pools: Vec::new(),
            free_slots,
            fixed,
            base_pre,
            targets,
            stat_targets,
            level: base.level,
            scrolled,
            locked_runes,
            exo_ap: config.exo.ap,
            exo_mp: config.exo.mp,
            exo_range: config.exo.range,
            exo_only_ring: config.exo.only_on_ring,
            exo_max: config.exo.max_count.clamp(0, 3) as usize,
            islands: Vec::new(),
            hall: Vec::new(),
            generation: 0,
            rng: Rng(seed ^ 0xD1B5_4A32_D192_ED03),
            inject_turn: 0,
            evaluations: std::cell::Cell::new(0),
            cache: std::cell::RefCell::new(HashMap::with_capacity_and_hasher(1 << 16, IdentityBuild)),
            settle_tempered: false,
            stagnation_reset: STAGNATION_RESET,
            set_rank_bias: 0.7,
            swap_cursor: 0,
            alloy_cursor: 0,
        };

        // Pools: only items that can move at least one scored stat (directly,
        // through their set's bonuses, or by hosting a useful rune) earn a gene.
        let banned_ids: HashSet<i64> = config.banned_items.iter().copied().collect();
        let banned_types: HashSet<&str> = config.banned_types.iter().map(|s| s.as_str()).collect();
        let floor = level_floor(base.level);
        let relevant_set: Vec<bool> = forge.set_bonus.iter().map(|tiers| tiers.iter().any(|v| forge.useful(v))).collect();
        let exo_wanted = forge.exo_max > 0 && (forge.exo_ap || forge.exo_mp || forge.exo_range);
        for &s in &forge.free_slots.clone() {
            let exempt = s >= DOFUS_FIRST || ALL_SLOTS[s] == "companion" || ALL_SLOTS[s] == "sidekick";
            let rune_host = FORGEABLE.contains(&s) && (exo_wanted && (!forge.exo_only_ring || s == RING1 || s == RING2));
            let pool: Vec<i32> = forge
                .catalog
                .iter()
                .enumerate()
                .filter(|(i, it)| {
                    let item = &forge.items[*i];
                    fits_slot(it, s)
                        && it.level <= config.max_level
                        && (exempt || it.level >= floor)
                        && obtainable(it)
                        && !banned_ids.contains(&it.ankama_id)
                        && !banned_types.contains(it.item_type.as_str())
                        && (forge.useful(&item.vec) || item.set.is_some_and(|st| relevant_set[st]) || !item.runes.is_empty() || rune_host)
                })
                .map(|(i, _)| i as i32)
                .collect();
            forge.pools[s] = pool;
        }
        if config.prune {
            forge.prune_dominated();
        }
        for &s in &forge.free_slots {
            for &i in &forge.pools[s] {
                if let Some(st) = forge.items[i as usize].set {
                    let members = &mut forge.set_members[st];
                    match members.iter_mut().find(|(id, _)| *id == i) {
                        Some((_, slots)) => slots.push(s),
                        None => members.push((i, vec![s])),
                    }
                }
            }
        }

        let values: Vec<f64> = (0..forge.items.len()).map(|i| forge.standalone_value(i, &relevant_set)).collect();
        for &s in &forge.free_slots {
            let mut short = forge.pools[s].clone();
            short.sort_by(|a, b| values[*b as usize].partial_cmp(&values[*a as usize]).unwrap());
            short.truncate(SHORT_POOL);
            forge.short_pools[s] = short;
        }
        // Items strongest in each requested stat, so a piece one or two
        // points short of a minimum can be fixed by a targeted swap even when
        // those items rank low on overall value.
        forge.stat_pools = (0..forge.targets.len())
            .map(|ti| {
                (0..NSLOT)
                    .map(|s| {
                        if !forge.free_slots.contains(&s) {
                            return Vec::new();
                        }
                        let mut scored: Vec<(i64, i32)> = forge.pools[s]
                            .iter()
                            .map(|&i| (forge.stat_contribution(i as usize, ti), i))
                            .filter(|(c, _)| *c > 0)
                            .collect();
                        scored.sort_by(|a, b| b.0.cmp(&a.0));
                        scored.into_iter().take(STAT_POOL).map(|(_, i)| i).collect()
                    })
                    .collect()
            })
            .collect();
        for &s in &forge.free_slots.clone() {
            let mut extra: Vec<i32> = forge.stat_pools.iter().flat_map(|per_slot| per_slot[s].iter().copied()).collect();
            extra.retain(|i| !forge.short_pools[s].contains(i));
            extra.sort_unstable();
            extra.dedup();
            forge.short_pools[s].extend(extra);
        }

        // Sets ranked by what they bring to this order: their members' own
        // value plus the bonus they reach with every member worn.
        // Baseline: the best loose (set-less) item value each slot could hold.
        let baseline: Vec<f64> = (0..NSLOT)
            .map(|s| forge.pools[s].iter().filter(|&&i| forge.items[i as usize].set.is_none()).map(|&i| values[i as usize]).fold(0.0, f64::max))
            .collect();
        let mut ranked: Vec<(f64, usize)> = (0..forge.set_members.len())
            .filter(|&st| forge.set_members[st].len() >= 2)
            .map(|st| {
                // Gain over loose items in the same slots, plus the full bonus.
                let members: f64 = forge.set_members[st].iter().map(|(i, slots)| values[*i as usize] - baseline[slots[0]]).sum();
                let full = forge.set_bonus[st][forge.set_members[st].len().min(NSLOT)];
                let bonus: f64 = (0..NF).filter(|&j| full[j] > 0).map(|j| forge.stat_targets[j].iter().map(|&t| forge.targets[t].weight * full[j] as f64).sum::<f64>()).sum();
                (members + bonus, st)
            })
            .filter(|(v, _)| *v > -1e12)
            .collect();
        ranked.sort_by(|a, b| b.0.partial_cmp(&a.0).unwrap());
        forge.set_rank = ranked.into_iter().map(|(_, st)| st).collect();

        for _ in 0..island_count {
            let pop: Vec<Individual> = (0..ISLAND_SIZE).map(|_| forge.random_individual()).collect();
            let mut island = Island { pop, best: f64::NEG_INFINITY, stagnant: 0 };
            island.pop.sort_by(|a, b| b.score.partial_cmp(&a.score).unwrap());
            island.best = island.pop[0].score;
            forge.islands.push(island);
        }
        forge.seed_alloys();
        forge.update_hall();
        forge
    }

    // Wears every member of set `st` it can, each in its first free slot.
    fn place_whole_set(&self, g: &mut [i32; NSLOT], used: &mut [bool; NSLOT], st: usize) {
        for (item, slots) in &self.set_members[st] {
            for &s in slots {
                if !used[s] && self.try_place(g, s, *item) {
                    used[s] = true;
                    break;
                }
            }
        }
    }

    // Ways to wear set `st` on `base`: members that fit several slots (rings,
    // Dofus) try each of them, so the set can replace whichever ring or Dofus
    // is worth replacing, not just the first one (at most 8 variants).
    fn set_placements(&self, base: &[i32; NSLOT], st: usize) -> Vec<[i32; NSLOT]> {
        let mut variants: Vec<[i32; NSLOT]> = vec![*base];
        let mut claimed: Vec<Vec<usize>> = vec![Vec::new()];
        for (item, slots) in &self.set_members[st] {
            let mut next: Vec<[i32; NSLOT]> = Vec::new();
            let mut next_claimed: Vec<Vec<usize>> = Vec::new();
            for (g, used) in variants.iter().zip(claimed.iter()) {
                let mut placed = false;
                for &s in slots {
                    if used.contains(&s) {
                        continue;
                    }
                    let mut g2 = *g;
                    if self.try_place(&mut g2, s, *item) {
                        let mut u = used.clone();
                        u.push(s);
                        next.push(g2);
                        next_claimed.push(u);
                        placed = true;
                        if next.len() >= 8 {
                            break;
                        }
                    }
                }
                if !placed {
                    next.push(*g);
                    next_claimed.push(used.clone());
                }
                if next.len() >= 8 {
                    break;
                }
            }
            variants = next;
            claimed = next_claimed;
        }
        variants.into_iter().filter(|g| g != base && self.valid(g)).collect()
    }

    // Fills every slot not yet claimed with its best-valued item that fits.
    fn greedy_fill(&self, g: &mut [i32; NSLOT], used: &[bool; NSLOT]) {
        for &s in &self.free_slots {
            if used[s] {
                continue;
            }
            g[s] = -1;
            // Items with equip conditions are left to the search itself: a
            // blind greedy pick of them mostly breaks the alloy.
            for &item in self.short_pools[s].iter().take(SHORT_POOL) {
                if self.items[item as usize].conds.is_empty() && self.try_place(g, s, item) {
                    break;
                }
            }
        }
    }

    fn alloy(&self, combo: &[usize]) -> Individual {
        let mut g = self.fixed;
        let mut used = [false; NSLOT];
        for &st in combo {
            self.place_whole_set(&mut g, &mut used, st);
        }
        self.greedy_fill(&mut g, &used);
        self.make(g)
    }

    // Seeds every island with the best set combinations ("alloys"): a strong
    // piece usually mixes 2–4 partial sets, which random set drops only hit
    // by luck.
    fn seed_alloys(&mut self) {
        let top: Vec<usize> = self.set_rank.iter().copied().take(ALLOY_SETS).collect();
        let mut alloys: Vec<Individual> = vec![self.alloy(&[])];
        for a in 0..top.len() {
            alloys.push(self.alloy(&[top[a]]));
            for b in (a + 1)..top.len() {
                alloys.push(self.alloy(&[top[a], top[b]]));
                for c in (b + 1)..top.len() {
                    alloys.push(self.alloy(&[top[a], top[b], top[c]]));
                    if c < ALLOY_QUADS {
                        for d in (c + 1)..top.len().min(ALLOY_QUADS) {
                            alloys.push(self.alloy(&[top[a], top[b], top[c], top[d]]));
                        }
                    }
                }
            }
        }
        alloys.sort_by(|a, b| b.score.partial_cmp(&a.score).unwrap());
        let mut kept: Vec<Individual> = Vec::new();
        for ind in alloys {
            if kept.iter().all(|k| k.hash != ind.hash) {
                kept.push(ind);
            }
            if kept.len() >= ALLOY_POOL.max(ALLOY_SEEDS_PER_ISLAND * self.islands.len().max(1)) {
                break;
            }
        }
        self.alloy_pool = kept.iter().take(ALLOY_POOL).map(|ind| ind.genes).collect();
        kept.truncate(ALLOY_SEEDS_PER_ISLAND * self.islands.len().max(1));
        let count = self.islands.len();
        for (k, ind) in kept.into_iter().enumerate() {
            let island = &mut self.islands[k % count];
            let len = island.pop.len();
            island.pop[len - 1 - k / count] = ind;
        }
        for island in &mut self.islands {
            island.pop.sort_by(|a, b| b.score.partial_cmp(&a.score).unwrap());
            island.best = island.pop[0].score;
        }
    }

    // Drops items another candidate of the same slot beats or ties on every
    // stat the order scores (including the transcendence rune each could
    // take). Ring and Dofus slots need 2 / 6 distinct dominators, since that
    // many can be worn at once. Set items, items with equip conditions and
    // Prysmaradites are never dropped. Fewer, stronger candidates per slot
    // let the search spend its strikes where they matter.
    fn prune_dominated(&mut self) {
        let dims: Vec<usize> = (0..NF).filter(|&j| !self.stat_targets[j].is_empty()).collect();
        // More is not always better on a stat with a strict cap: require
        // equality there instead of "at least".
        let exact: Vec<bool> = (0..NF).map(|j| self.stat_targets[j].iter().any(|&t| self.targets[t].absolute)).collect();
        let rune_of = |i: usize, j: usize| -> i64 { self.items[i].runes.iter().find(|(d, _)| *d == j).map(|(_, v)| *v).unwrap_or(0) };
        let protected = |i: usize| -> bool {
            let it = &self.items[i];
            it.set.is_some() || !it.conds.is_empty() || it.prysmaradite
        };
        let dominates = |b: usize, a: usize| -> bool {
            if protected(b) {
                return false;
            }
            let (vb, va) = (&self.items[b].vec, &self.items[a].vec);
            let mut strictly = false;
            for &j in &dims {
                if exact[j] {
                    if vb[j] != va[j] {
                        return false;
                    }
                    continue;
                }
                if vb[j] < va[j] {
                    return false;
                }
                if vb[j] > va[j] {
                    strictly = true;
                }
            }
            // Whatever rune `a` could take, `b` must still match it.
            for &(j, v) in &self.items[a].runes {
                if !exact[j] && vb[j] + rune_of(b, j) < va[j] + v {
                    return false;
                }
            }
            strictly || b < a
        };
        let mut pruned: Vec<Vec<i32>> = vec![Vec::new(); NSLOT];
        for &s in &self.free_slots {
            let need = if s == RING1 || s == RING2 { 2 } else if s >= DOFUS_FIRST { NSLOT - DOFUS_FIRST } else { 1 };
            let pool = &self.pools[s];
            pruned[s] = pool
                .iter()
                .copied()
                .filter(|&a| {
                    let a = a as usize;
                    if protected(a) {
                        return true;
                    }
                    let mut dominators = 0;
                    for &b in pool {
                        if b as usize != a && dominates(b as usize, a) {
                            dominators += 1;
                            if dominators >= need {
                                return false;
                            }
                        }
                    }
                    true
                })
                .collect();
        }
        for &s in &self.free_slots.clone() {
            self.pools[s] = std::mem::take(&mut pruned[s]);
        }
    }

    // Rough worth of an item on its own (stats, best rune, set potential),
    // only used to order the tempering candidates.
    fn standalone_value(&self, i: usize, relevant_set: &[bool]) -> f64 {
        let item = &self.items[i];
        let gain = |stat: usize, amount: i64| -> f64 { self.stat_targets[stat].iter().map(|&t| self.targets[t].weight * amount as f64).sum() };
        let own: f64 = (0..NF).filter(|&j| item.vec[j] > 0).map(|j| gain(j, item.vec[j])).sum();
        let rune = item.runes.iter().map(|&(j, v)| gain(j, v)).fold(0.0, f64::max);
        let set = item.set.filter(|&st| relevant_set[st]).map(|st| {
            let top = self.set_bonus[st].last().copied().unwrap_or([0; NF]);
            (0..NF).filter(|&j| top[j] > 0).map(|j| gain(j, top[j])).sum::<f64>() / self.set_members[st].len().max(1) as f64
        });
        own + rune + set.unwrap_or(0.0)
    }

    // How much one item (with its best rune) raises target `ti` on its own.
    fn stat_contribution(&self, i: usize, ti: usize) -> i64 {
        let item = &self.items[i];
        let t = &self.targets[ti];
        let own: i64 = (0..NF).filter(|&j| item.vec[j] > 0 && feeds(j, t)).map(|j| item.vec[j]).sum();
        let rune = item.runes.iter().filter(|(j, _)| feeds(*j, t)).map(|(_, v)| *v).max().unwrap_or(0);
        own + rune
    }

    // Puts an item strong in one of the missing stats into some free slot.
    fn targeted_kick(&mut self, g: &mut [i32; NSLOT], unmet: u64) -> bool {
        let missing: Vec<usize> = (0..self.targets.len().min(64)).filter(|ti| unmet & (1 << ti) != 0).collect();
        if missing.is_empty() {
            return false;
        }
        let ti = missing[self.rng.below(missing.len())];
        let slots: Vec<usize> = self.free_slots.iter().copied().filter(|&s| !self.stat_pools[ti][s].is_empty()).collect();
        if slots.is_empty() {
            return false;
        }
        for _ in 0..4 {
            let s = slots[self.rng.below(slots.len())];
            let pool = &self.stat_pools[ti][s];
            let item = pool[self.rng.below(pool.len())];
            if item != g[s] && self.try_place(g, s, item) {
                return true;
            }
        }
        false
    }

    // Does this raw stat vector add anything a weighted target cares about?
    fn useful(&self, v: &Vec60) -> bool {
        (0..NF).any(|i| v[i] > 0 && self.stat_targets[i].iter().any(|&t| self.targets[t].weight > 0.0))
    }

    fn valid(&self, g: &[i32; NSLOT]) -> bool {
        if g[RING1] >= 0 && g[RING1] == g[RING2] && self.items[g[RING1] as usize].set.is_some() {
            return false;
        }
        let mut prysma = 0;
        for a in DOFUS_FIRST..NSLOT {
            if g[a] < 0 {
                continue;
            }
            if self.items[g[a] as usize].prysmaradite {
                prysma += 1;
            }
            for b in (a + 1)..NSLOT {
                if g[a] == g[b] {
                    return false;
                }
            }
        }
        prysma <= 1
    }

    fn try_place(&self, g: &mut [i32; NSLOT], slot: usize, item: i32) -> bool {
        let old = g[slot];
        g[slot] = item;
        if self.valid(g) {
            true
        } else {
            g[slot] = old;
            false
        }
    }

    fn random_individual(&mut self) -> Individual {
        let mut g = self.fixed;
        for k in 0..self.free_slots.len() {
            let s = self.free_slots[k];
            let n = self.pools[s].len();
            if n == 0 {
                continue;
            }
            for _ in 0..3 {
                let pick = self.pools[s][self.rng.below(n)];
                if self.try_place(&mut g, s, pick) {
                    break;
                }
            }
        }
        self.make(g)
    }

    fn make(&self, genes: [i32; NSLOT]) -> Individual {
        self.evaluations.set(self.evaluations.get() + 1);
        // Same genes always score the same: the search keeps revisiting
        // builds (mutations, polish neighbourhoods), so remember them.
        let key = genes.iter().fold(0x51_7C_C1_B7_27_22_0A_95u64, |h, &x| splitmix(h ^ (x as i64 as u64)));
        let cached = self.cache.borrow().get(&key).copied();
        let score = match cached {
            Some(score) => score,
            None => {
                let score = self.evaluate(&genes).score;
                let mut cache = self.cache.borrow_mut();
                if cache.len() >= CACHE_SIZE {
                    cache.clear();
                }
                cache.insert(key, score);
                score
            }
        };
        Individual { genes, score, hash: self.hash(&genes) }
    }

    // Order-insensitive for the interchangeable ring and Dofus slots, so the
    // same build in a different arrangement counts as a duplicate.
    fn hash(&self, g: &[i32; NSLOT]) -> u64 {
        let mut h = 0u64;
        for (s, &item) in g.iter().enumerate() {
            let group = match s {
                RING1 | RING2 => 100,
                s if s >= DOFUS_FIRST => 200,
                s => s as u64,
            };
            h = h.wrapping_add(splitmix(((item as i64 + 1) as u64) << 8 | group));
        }
        h
    }

    // Final value of stat `i` once characteristic totals `ch` are known —
    // the same derivations and caps compute_stats applies.
    fn final_value(&self, pre: &Vec60, ch: &[i64; 6], i: usize) -> i64 {
        match i {
            AP => pre[AP].min(12),
            MP | RANGE | SUMMONS => pre[i].min(6),
            VIT..=AGI => ch[i - VIT],
            MAXHP => pre[MAXHP] + base_hp(self.level) + ch[0],
            INITIATIVE => pre[i] + ch[2] + ch[3] + ch[4] + ch[5],
            DODGE | LOCK => pre[i] + floor_div(ch[5], 10),
            PODS => pre[i] + ch[2] * 5,
            PROSPECTING => pre[i] + floor_div(ch[4], 10),
            i if (AP_REDUCTION..=MP_PARRY).contains(&i) => pre[i] + floor_div(ch[1], 10),
            i if (RES_PCT_FIRST..=RES_PCT_LAST).contains(&i) => pre[i].min(50),
            i => pre[i],
        }
    }

    fn effective(&self, pre: &Vec60, ch: &[i64; 6], t: &Target) -> i64 {
        let mut v = self.final_value(pre, ch, t.idx);
        if t.add_power {
            v += pre[POWER];
        }
        v
    }

    // Greedy-time value of one target: deficits dominate, then surplus.
    fn greedy_value(t: &Target, e: i64) -> f64 {
        if t.absolute && e > t.max {
            return -1e12 * (e - t.max) as f64;
        }
        let ec = e.min(t.max);
        let deficit = (t.goal - ec).max(0) as f64;
        t.weight * (ec as f64 - deficit * 1000.0)
    }

    fn chars_of(pre: &Vec60, alloc: &[i64; 6]) -> [i64; 6] {
        let mut ch = [0i64; 6];
        for c in 0..6 {
            ch[c] = pre[VIT + c] + alloc[c];
        }
        ch
    }

    // Spends the point budget greedily by marginal gain per point. Within a
    // step the gain per point is constant, so each step jumps straight to the
    // next boundary where it could change (cost bracket, a goal or cap of a
    // stat this characteristic feeds, the next 10-point step of a derived
    // stat) instead of crawling 5 points at a time. `extra` are equip
    // conditions of the build's own items ("Agility > 300"): points go to
    // them first, since an unmet condition invalidates the whole build.
    fn allocate(&self, pre: &Vec60, extra: &[Target]) -> [i64; 6] {
        let budget = stat_budget(self.level);
        let mut spent = 0i64;
        let mut alloc = [0i64; 6];
        let mut ch = Self::chars_of(pre, &alloc);
        loop {
            let mut best: Option<(usize, i64, i64)> = None;
            let mut best_ratio = 0.0f64;
            for c in 0..6 {
                let related = &self.stat_targets[VIT + c];
                let has_extra = extra.iter().any(|t| t.idx == VIT + c);
                if related.is_empty() && !has_extra {
                    continue;
                }
                let a = alloc[c];
                let unit = point_cost(CHARS[c], a + 1) - point_cost(CHARS[c], a);
                let mut k = if c >= 2 && a < 300 { 100 - a % 100 } else { i64::MAX / 4 };
                k = k.min((budget - spent) / unit);
                for t in related.iter().map(|&ti| &self.targets[ti]).chain(extra.iter().filter(|t| t.idx == VIT + c)) {
                    let e = self.effective(pre, &ch, t);
                    let per_point = match t.idx {
                        i if i == VIT + c => 1,
                        MAXHP | INITIATIVE => 1,
                        PODS => 5,
                        _ => 0, // a floor(x / 10) stat
                    };
                    if per_point == 0 {
                        k = k.min(10 - ch[c].rem_euclid(10));
                        continue;
                    }
                    if e < t.goal {
                        k = k.min((t.goal - e + per_point - 1) / per_point);
                    }
                    if t.max < NO_MAX && e < t.max {
                        k = k.min((t.max - e + per_point - 1) / per_point);
                    }
                }
                if k <= 0 {
                    continue;
                }
                let mut ch2 = ch;
                ch2[c] += k;
                let mut gain = 0.0;
                for &ti in related {
                    let t = &self.targets[ti];
                    gain += Self::greedy_value(t, self.effective(pre, &ch2, t)) - Self::greedy_value(t, self.effective(pre, &ch, t));
                }
                for t in extra.iter().filter(|t| t.idx == VIT + c) {
                    gain += Self::greedy_value(t, ch2[c]) - Self::greedy_value(t, ch[c]);
                }
                let ratio = gain / (k * unit) as f64;
                if ratio > best_ratio {
                    best_ratio = ratio;
                    best = Some((c, k, k * unit));
                }
            }
            let Some((c, k, cost)) = best else { break };
            alloc[c] += k;
            ch[c] += k;
            spent += cost;
        }
        alloc
    }

    // Gain of adding `amount` to raw stat `i`, at characteristic totals `ch`
    // (applied in place and reverted: no copy of the stat vector).
    fn stat_gain(&self, pre: &mut Vec60, ch: &mut [i64; 6], i: usize, amount: i64) -> f64 {
        let targets = &self.stat_targets[i];
        let before: f64 = targets.iter().map(|&ti| Self::greedy_value(&self.targets[ti], self.effective(pre, ch, &self.targets[ti]))).sum();
        let is_char = (VIT..=AGI).contains(&i);
        pre[i] += amount;
        if is_char {
            ch[i - VIT] += amount;
        }
        let after: f64 = targets.iter().map(|&ti| Self::greedy_value(&self.targets[ti], self.effective(pre, ch, &self.targets[ti]))).sum();
        pre[i] -= amount;
        if is_char {
            ch[i - VIT] -= amount;
        }
        after - before
    }

    fn evaluate(&self, g: &[i32; NSLOT]) -> Eval {
        let mut pre = self.base_pre;
        let mut set_counts: Vec<(usize, usize)> = Vec::new();
        for &item in g.iter() {
            if item < 0 {
                continue;
            }
            let it = &self.items[item as usize];
            add_into(&mut pre, &it.vec);
            if let Some(st) = it.set {
                match set_counts.iter_mut().find(|(s, _)| *s == st) {
                    Some((_, n)) => *n += 1,
                    None => set_counts.push((st, 1)),
                }
            }
        }
        let mut max_pieces = 0usize;
        for &(st, n) in &set_counts {
            add_into(&mut pre, &self.set_bonus[st][n]);
            max_pieces = max_pieces.max(n);
        }
        for i in ELEM_DMG_FIRST..=ELEM_DMG_LAST {
            pre[i] += pre[DAMAGE];
        }

        // Exo runes first: +1 AP/MP/Range only where it closes a goal.
        let mut exo = [0u8; NSLOT];
        let mut used = [false; NSLOT];
        if self.exo_max > 0 {
            let mut hosts: Vec<usize> = FORGEABLE
                .iter()
                .copied()
                .filter(|&s| g[s] >= 0 && self.fixed[s] < 0 && (!self.exo_only_ring || s == RING1 || s == RING2))
                .collect();
            hosts.truncate(self.exo_max);
            let mut next = 0;
            for (kind, stat, allowed) in [(1u8, AP, self.exo_ap), (2, MP, self.exo_mp), (3, RANGE, self.exo_range)] {
                if !allowed || next >= hosts.len() {
                    continue;
                }
                let goal = self.targets.iter().filter(|t| t.idx == stat).map(|t| t.goal).max().unwrap_or(0);
                if pre[stat].min(if stat == AP { 12 } else { 6 }) < goal {
                    pre[stat] += 1;
                    exo[hosts[next]] = kind;
                    used[hosts[next]] = true;
                    next += 1;
                }
            }
        }

        // Characteristic thresholds the equipped items themselves demand.
        let mut extra: Vec<Target> = Vec::new();
        for &item in g.iter() {
            if item < 0 {
                continue;
            }
            for c in &self.items[item as usize].conds {
                if let CondKind::Stat(i) = c.kind {
                    if (VIT..=AGI).contains(&i) && (c.op == b'>' || c.op == b'g') {
                        let goal = c.value + if c.op == b'>' { 1 } else { 0 };
                        extra.push(Target { idx: i, goal, weight: CONDITION_WEIGHT, max: goal, absolute: false, add_power: false });
                    }
                }
            }
        }

        // Transcendence runes: one per free forgeable item, each placed
        // where it gains the most, re-deciding points around them.
        let mut rune = [None; NSLOT];
        let mut alloc = self.allocate(&pre, &extra);
        if FORGEABLE.iter().any(|&s| g[s] >= 0 && self.fixed[s] < 0 && !self.items[g[s] as usize].runes.is_empty()) {
            let mut ch = Self::chars_of(&pre, &alloc);
            // A rune's gain depends only on (stat, value), not on which item
            // carries it: compute each distinct one once per round.
            let mut memo: Vec<((usize, i64), f64)> = Vec::with_capacity(32);
            loop {
                let mut best: Option<(usize, usize, i64)> = None;
                let mut best_gain = 0.0f64;
                memo.clear();
                for &s in &FORGEABLE {
                    if g[s] < 0 || self.fixed[s] >= 0 || used[s] {
                        continue;
                    }
                    for &(i, v) in &self.items[g[s] as usize].runes {
                        let gain = match memo.iter().find(|(k, _)| *k == (i, v)) {
                            Some((_, gain)) => *gain,
                            None => {
                                let gain = self.stat_gain(&mut pre, &mut ch, i, v);
                                memo.push(((i, v), gain));
                                gain
                            }
                        };
                        if gain > best_gain {
                            best_gain = gain;
                            best = Some((s, i, v));
                        }
                    }
                }
                let Some((s, i, v)) = best else { break };
                pre[i] += v;
                if (VIT..=AGI).contains(&i) {
                    ch[i - VIT] += v;
                }
                rune[s] = Some((i, v));
                used[s] = true;
            }
            if rune.iter().any(|r| r.is_some()) {
                alloc = self.allocate(&pre, &extra);
            }
        }
        let ch = Self::chars_of(&pre, &alloc);

        let mut violation = 0.0f64;
        let mut conditions_ok = true;
        for &item in g.iter() {
            if item < 0 {
                continue;
            }
            for c in &self.items[item as usize].conds {
                let actual = match c.kind {
                    CondKind::Level => self.level,
                    CondKind::SetPieces => max_pieces as i64,
                    CondKind::Stat(i) => self.final_value(&pre, &ch, i),
                };
                if !compare(actual, c.op, c.value) {
                    conditions_ok = false;
                    violation += 1000.0 + (actual - c.value).abs() as f64;
                }
            }
        }

        let mut deficit = 0.0f64;
        let mut surplus = 0.0f64;
        let mut met = 0usize;
        let mut unmet = 0u64;
        for (ti, t) in self.targets.iter().enumerate() {
            let e = self.effective(&pre, &ch, t);
            if t.absolute && e > t.max {
                violation += (e - t.max) as f64 * if t.weight > 0.0 { t.weight } else { 100.0 };
            }
            let ec = e.min(t.max);
            if t.goal > 0 && ec >= t.goal {
                met += 1;
            } else if t.goal > 0 && ti < 64 {
                unmet |= 1 << ti;
            }
            let d = (t.goal - ec) as f64 * t.weight;
            if d > 0.0 {
                deficit += d;
            } else {
                surplus -= d;
            }
        }

        let legal = self.valid(g);
        let score = if !legal {
            TIER_ILLEGAL
        } else if violation > 0.0 {
            TIER_CONDITION - violation.min(9e8)
        } else if deficit > 0.0 {
            -deficit
        } else {
            surplus
        };
        Eval {
            score,
            alloc,
            exo,
            rune,
            conditions_ok: conditions_ok && legal,
            meets_required: legal && violation == 0.0 && deficit == 0.0,
            requirements_met: met,
            unmet,
        }
    }

    fn tournament(&mut self, island: usize) -> Individual {
        let pop = &self.islands[island].pop;
        let mut best = self.rng.below(pop.len());
        for _ in 1..TOURNAMENT_K {
            let i = self.rng.below(pop.len());
            if pop[i].score > pop[best].score {
                best = i;
            }
        }
        self.islands[island].pop[best]
    }

    // Drops 2–4 pieces of one set into free slots in a single move: a lone
    // per-slot change almost never assembles a set bonus by chance.
    fn inject_set(&mut self, g: &mut [i32; NSLOT]) -> bool {
        let candidates: Vec<usize> = self.free_slots.iter().copied().filter(|&s| !self.pools[s].is_empty()).collect();
        if candidates.is_empty() {
            return false;
        }
        let mut chosen_set = None;
        // Mostly sets that matter for this order (rank-biased), sometimes any.
        if !self.set_rank.is_empty() && self.rng.chance(self.set_rank_bias) {
            let skew = self.rng.f64() * self.rng.f64();
            chosen_set = Some(self.set_rank[((skew * self.set_rank.len() as f64) as usize).min(self.set_rank.len() - 1)]);
        } else {
            let slot = candidates[self.rng.below(candidates.len())];
            let pool_len = self.pools[slot].len();
            for _ in 0..5 {
                let item = self.pools[slot][self.rng.below(pool_len)];
                if let Some(st) = self.items[item as usize].set {
                    chosen_set = Some(st);
                    break;
                }
            }
        }
        let Some(st) = chosen_set else { return false };
        let mut members = self.set_members[st].clone();
        if members.len() < 2 {
            return false;
        }
        for i in (1..members.len()).rev() {
            let j = self.rng.below(i + 1);
            members.swap(i, j);
        }
        let want = 2 + self.rng.below(3);
        let mut placed = 0;
        let mut used: Vec<usize> = Vec::new();
        for (item, slots) in members {
            if placed >= want {
                break;
            }
            let open: Vec<usize> = slots.into_iter().filter(|s| !used.contains(s)).collect();
            if open.is_empty() {
                continue;
            }
            let s = open[self.rng.below(open.len())];
            if self.try_place(g, s, item) {
                used.push(s);
                placed += 1;
            }
        }
        placed >= 2
    }

    fn point_mutation(&mut self, g: &mut [i32; NSLOT]) {
        let candidates: Vec<usize> = self.free_slots.iter().copied().filter(|&s| !self.pools[s].is_empty()).collect();
        if candidates.is_empty() {
            return;
        }
        let s = candidates[self.rng.below(candidates.len())];
        let n = self.pools[s].len();
        for _ in 0..3 {
            let pick = self.pools[s][self.rng.below(n)];
            if self.try_place(g, s, pick) {
                return;
            }
        }
        g[s] = -1;
    }

    fn evolve_island(&mut self, i: usize) {
        let n = self.islands[i].pop.len();
        let elite = ((n as f64) * ELITE_FRACTION).ceil() as usize;
        let immigrants = ((n as f64) * IMMIGRANT_FRACTION).ceil() as usize;
        let mut next: Vec<Individual> = self.islands[i].pop[..elite].to_vec();
        for _ in 0..immigrants {
            next.push(self.random_individual());
        }
        while next.len() < n {
            let mut g = self.tournament(i).genes;
            let injected = self.rng.chance(SET_MUTATION_RATE) && {
                let ok = self.inject_set(&mut g);
                if ok && self.rng.chance(SECOND_SET_RATE) {
                    self.inject_set(&mut g);
                }
                ok
            };
            if !injected {
                self.point_mutation(&mut g);
            }
            next.push(self.make(g));
        }

        // Duplicates waste the island's diversity: keep the best copy of each
        // build and replace the rest with fresh random ones.
        next.sort_by(|a, b| a.hash.cmp(&b.hash).then(b.score.partial_cmp(&a.score).unwrap()));
        let mut kept_hash = None;
        for k in 0..next.len() {
            if kept_hash == Some(next[k].hash) {
                next[k] = self.random_individual();
            } else {
                kept_hash = Some(next[k].hash);
            }
        }
        next.sort_by(|a, b| b.score.partial_cmp(&a.score).unwrap());

        let island = &mut self.islands[i];
        island.pop = next;
        if island.pop[0].score > island.best + 1e-9 {
            island.best = island.pop[0].score;
            island.stagnant = 0;
        } else {
            island.stagnant += 1;
        }
        // An island sitting on the best piece found so far (already safe in
        // the hall, and polished by the hammer) only burns generations: send
        // it to explore another basin much sooner.
        let global_best = self.hall.first().map(|h| h.score).unwrap_or(f64::NEG_INFINITY);
        let island = &mut self.islands[i];
        let on_global_best = island.pop[0].score >= global_best - 1e-9;
        if island.stagnant >= self.stagnation_reset || (on_global_best && island.stagnant >= REDISCOVERY_RESET) {
            // A stalled island restarts somewhere new: half fresh random
            // builds, half mutated alloys (promising set combinations), so
            // each restart is a real new attempt at a different basin.
            let fresh: Vec<Individual> = (0..n)
                .map(|k| {
                    if k % 2 == 1 && !self.alloy_pool.is_empty() {
                        let mut g = self.alloy_pool[self.rng.below(self.alloy_pool.len())];
                        for _ in 0..self.rng.below(3) {
                            self.point_mutation(&mut g);
                        }
                        if self.valid(&g) {
                            return self.make(g);
                        }
                    }
                    self.random_individual()
                })
                .collect();
            let island = &mut self.islands[i];
            island.pop = fresh;
            island.pop.sort_by(|a, b| b.score.partial_cmp(&a.score).unwrap());
            island.best = island.pop[0].score;
            island.stagnant = 0;
        }
    }

    fn migration_size() -> usize {
        ((ISLAND_SIZE as f64) * MIGRATION_FRACTION).ceil() as usize
    }

    fn migrate(&mut self) {
        let k = Self::migration_size();
        let count = self.islands.len();
        if count < 2 {
            return;
        }
        let emigrants: Vec<Vec<Individual>> = self.islands.iter().map(|isl| isl.pop[..k].to_vec()).collect();
        for (from, group) in emigrants.into_iter().enumerate() {
            let to = &mut self.islands[(from + 1) % count];
            let len = to.pop.len();
            for (j, ind) in group.into_iter().enumerate() {
                to.pop[len - 1 - j] = ind;
            }
            to.pop.sort_by(|a, b| b.score.partial_cmp(&a.score).unwrap());
        }
    }

    fn update_hall(&mut self) {
        let mut pool: Vec<Individual> = self.hall.clone();
        for isl in &self.islands {
            let mut seen: Vec<u64> = Vec::with_capacity(HALL_SIZE);
            for ind in &isl.pop {
                if !seen.contains(&ind.hash) {
                    seen.push(ind.hash);
                    pool.push(*ind);
                    if seen.len() >= HALL_SIZE {
                        break;
                    }
                }
            }
        }
        self.merge_into_hall(pool);
    }

    fn merge_into_hall(&mut self, mut pool: Vec<Individual>) {
        pool.extend(self.hall.iter().copied());
        pool.sort_by(|a, b| b.score.partial_cmp(&a.score).unwrap());
        let mut hall: Vec<Individual> = Vec::with_capacity(HALL_SIZE);
        // Equal quality means the builds only differ in filler items that
        // add nothing to the order: not a real alternative.
        for ind in pool {
            if hall.iter().all(|h| h.hash != ind.hash && (h.score - ind.score).abs() > 1e-6) {
                hall.push(ind);
            }
            if hall.len() >= HALL_SIZE {
                break;
            }
        }
        self.hall = hall;
    }

    /// Runs one generation on every island.
    pub fn run_generation(&mut self) {
        self.generation += 1;
        for i in 0..self.islands.len() {
            self.evolve_island(i);
        }
        if self.generation % MIGRATION_EVERY == 0 {
            self.migrate();
        }
        self.update_hall();
    }

    /// Whether tempered pieces are written back into the population.
    pub fn set_settle_tempered(&mut self, on: bool) {
        self.settle_tempered = on;
    }

    /// Generations without improvement before an island restarts.
    pub fn set_stagnation_reset(&mut self, gens: u32) {
        self.stagnation_reset = gens.max(1);
    }

    /// Share of set drops that pick from the order's top-ranked sets.
    pub fn set_set_rank_bias(&mut self, p: f64) {
        self.set_rank_bias = p.clamp(0.0, 1.0);
    }

    pub fn generation(&self) -> u64 {
        self.generation
    }

    pub fn best_score(&self) -> f64 {
        self.hall.first().map(|h| h.score).unwrap_or(f64::NEG_INFINITY)
    }

    fn genes_from(&self, equipped: &HashMap<String, i64>) -> Option<[i32; NSLOT]> {
        let mut g = self.fixed;
        for &s in &self.free_slots {
            if let Some(id) = equipped.get(ALL_SLOTS[s]) {
                if let Some(i) = self.pools[s].iter().copied().find(|&i| self.items[i as usize].ankama_id == *id) {
                    g[s] = i;
                }
            }
        }
        self.valid(&g).then_some(g)
    }

    /// This Forge's best build plus the top of its last island, for ring
    /// migration to the next Worker.
    pub fn emigrants(&self) -> Vec<HashMap<String, i64>> {
        let Some(last) = self.islands.last() else { return Vec::new() };
        self.hall
            .iter()
            .take(1)
            .chain(last.pop.iter().take(Self::migration_size()))
            .map(|ind| self.equipped_map(&ind.genes))
            .collect()
    }

    /// Builds from another Worker replace the worst of the first island
    /// (several) or of the next island in turn (one).
    pub fn inject(&mut self, builds: &[HashMap<String, i64>]) {
        if self.islands.is_empty() {
            return;
        }
        let incoming: Vec<Individual> = builds.iter().filter_map(|b| self.genes_from(b)).map(|g| self.make(g)).collect();
        if incoming.is_empty() {
            return;
        }
        let target = if incoming.len() > 1 { 0 } else { self.inject_turn % self.islands.len() };
        self.inject_turn += 1;
        let island = &mut self.islands[target];
        let len = island.pop.len();
        for (j, ind) in incoming.iter().enumerate().take(len) {
            island.pop[len - 1 - j] = *ind;
        }
        island.pop.sort_by(|a, b| b.score.partial_cmp(&a.score).unwrap());
        self.merge_into_hall(incoming);
    }

    /// Bellows: re-melts every island but the first with fresh material and
    /// seeds the first with the best pieces so far, so the search leaves the
    /// region it got stuck in without losing what it already found.
    pub fn stoke(&mut self) {
        for i in 1..self.islands.len() {
            let n = self.islands[i].pop.len();
            let mut fresh: Vec<Individual> = (0..n).map(|_| self.random_individual()).collect();
            fresh.sort_by(|a, b| b.score.partial_cmp(&a.score).unwrap());
            let island = &mut self.islands[i];
            island.best = fresh[0].score;
            island.pop = fresh;
            island.stagnant = 0;
        }
        let hall = self.hall.clone();
        self.settle_into_population(&hall);
        if let Some(first) = self.islands.first_mut() {
            first.stagnant = 0;
        }
    }

    // Replaces the worst of the first island with these pieces.
    fn settle_into_population(&mut self, pieces: &[Individual]) {
        let Some(island) = self.islands.first_mut() else { return };
        let len = island.pop.len();
        for (j, ind) in pieces.iter().enumerate().take(len / 4) {
            island.pop[len - 1 - j] = *ind;
        }
        island.pop.sort_by(|a, b| b.score.partial_cmp(&a.score).unwrap());
    }

    // Single-slot steepest ascent until no swap helps or time runs out.
    fn ascend(&self, mut current: Individual, full: bool, deadline: f64, now: &dyn Fn() -> f64) -> Individual {
        loop {
            let mut improved = false;
            for &s in &self.free_slots {
                if now() > deadline {
                    return current;
                }
                let pool = if full { &self.pools[s] } else { &self.short_pools[s] };
                let mut best = current;
                for &item in std::iter::once(&-1).chain(pool.iter()) {
                    if item == current.genes[s] {
                        continue;
                    }
                    let mut g = current.genes;
                    g[s] = item;
                    if !self.valid(&g) {
                        continue;
                    }
                    let cand = self.make(g);
                    if cand.score > best.score + 1e-9 {
                        best = cand;
                    }
                }
                if best.hash != current.hash {
                    current = best;
                    improved = true;
                }
            }
            if !improved {
                return current;
            }
        }
    }

    /// Tempering: polishes every piece in the hall slot by slot, then spends
    /// the rest of `budget_ms` kicking the best piece (a few random slots or
    /// a set drop) and re-polishing it, which escapes the local optima a
    /// single-slot polish cannot. Results also go back into the population.
    pub fn temper(&mut self, budget_ms: f64, now: &dyn Fn() -> f64) {
        let deadline = now() + budget_ms;
        let mut found: Vec<Individual> = Vec::new();
        let starts = self.hall.clone();
        for (k, ind) in starts.iter().enumerate() {
            if now() > deadline {
                break;
            }
            found.push(self.ascend(*ind, k < 2, deadline, now));
        }
        // Multi-start: polish the next alloys (top set families) to their own
        // local optimum, so hundreds of set families get a real, polished
        // attempt over the run instead of depending on random moves.
        let alloy_deadline = now() + (deadline - now()) * 0.5;
        while self.alloy_cursor < self.alloy_pool.len() && now() < alloy_deadline {
            let g = self.alloy_pool[self.alloy_cursor];
            self.alloy_cursor += 1;
            let polished = self.ascend(self.make(g), false, deadline, now);
            found.push(polished);
        }
        let mut best = found.iter().chain(self.hall.iter()).copied().max_by(|a, b| a.score.partial_cmp(&b.score).unwrap());
        // Set swaps: wear each top-ranked set whole on the best piece and
        // re-polish. Crossing from one family of sets to another needs
        // several slots to change at once, which random kicks rarely hit;
        // trying every top set systematically does. A cursor spreads the
        // work across short hammer passes.
        let swap_sets = self.set_rank.len().min(SET_SWAP_SETS);
        let mut tried = 0;
        while let Some(current) = best {
            if tried >= swap_sets || now() > deadline {
                break;
            }
            let st = self.set_rank[(self.swap_cursor + tried) % swap_sets];
            tried += 1;
            let mut improved_to = None;
            for g in self.set_placements(&current.genes, st) {
                if now() > deadline {
                    break;
                }
                let cand = self.ascend(self.make(g), false, deadline, now);
                found.push(cand);
                if cand.score > improved_to.map(|c: Individual| c.score).unwrap_or(current.score) + 1e-9 {
                    improved_to = Some(cand);
                }
            }
            if let Some(cand) = improved_to {
                best = Some(cand);
            }
        }
        if swap_sets > 0 {
            self.swap_cursor = (self.swap_cursor + tried) % swap_sets;
        }
        while let Some(current) = best {
            if now() > deadline || self.free_slots.is_empty() {
                break;
            }
            let mut g = current.genes;
            let unmet = self.evaluate(&g).unmet;
            if unmet != 0 && self.rng.chance(0.6) && self.targeted_kick(&mut g, unmet) {
                if self.rng.chance(0.5) {
                    self.point_mutation(&mut g);
                }
            } else if self.rng.chance(0.3) {
                self.inject_set(&mut g);
            } else {
                for _ in 0..2 + self.rng.below(2) {
                    self.point_mutation(&mut g);
                }
            }
            if !self.valid(&g) {
                continue;
            }
            let kicked = self.make(g);
            let cand = self.ascend(kicked, false, deadline, now);
            found.push(cand);
            if cand.score > current.score + 1e-9 {
                best = Some(cand);
            }
        }
        found.sort_by(|a, b| b.score.partial_cmp(&a.score).unwrap());
        found.truncate(HALL_SIZE * 2);
        if self.settle_tempered {
            self.settle_into_population(&found);
        }
        self.merge_into_hall(found);
    }

    /// Scores a given build exactly as the search would (points, exos and
    /// runes re-decided), and lists the items the search could never pick
    /// because they are missing from that slot's candidate pool.
    pub fn assess(&self, equipped: &HashMap<String, i64>) -> (Option<BuildResult>, Vec<String>) {
        let mut g = self.fixed;
        let mut unreachable = Vec::new();
        for &s in &self.free_slots {
            let Some(id) = equipped.get(ALL_SLOTS[s]) else { continue };
            match self.items.iter().position(|it| it.ankama_id == *id) {
                Some(i) => {
                    if !self.pools[s].contains(&(i as i32)) {
                        unreachable.push(format!("{}: {} ({})", ALL_SLOTS[s], self.catalog[i].name, id));
                    }
                    g[s] = i as i32;
                }
                None => unreachable.push(format!("{}: unknown id {}", ALL_SLOTS[s], id)),
            }
        }
        let result = self.valid(&g).then(|| self.to_result(&g));
        (result, unreachable)
    }

    pub fn results(&self) -> Vec<BuildResult> {
        self.hall.iter().map(|ind| self.to_result(&ind.genes)).collect()
    }

    pub fn report(&self) -> ForgeReport {
        ForgeReport { generation: self.generation, evaluations: self.evaluations.get(), best_score: self.best_score(), results: self.results() }
    }

    // Dofus slots are interchangeable; a Prysmaradite always goes in the
    // first one (unless either slot is locked).
    fn arrange(&self, g: &[i32; NSLOT]) -> [i32; NSLOT] {
        let mut out = *g;
        if self.fixed[DOFUS_FIRST] >= 0 {
            return out;
        }
        if let Some(s) = (DOFUS_FIRST + 1..NSLOT).find(|&s| out[s] >= 0 && self.fixed[s] < 0 && self.items[out[s] as usize].prysmaradite) {
            if out[DOFUS_FIRST] < 0 || !self.items[out[DOFUS_FIRST] as usize].prysmaradite {
                out.swap(DOFUS_FIRST, s);
            }
        }
        out
    }

    fn equipped_map(&self, g: &[i32; NSLOT]) -> HashMap<String, i64> {
        let g = &self.arrange(g);
        g.iter()
            .enumerate()
            .filter(|(_, &item)| item >= 0)
            .map(|(s, &item)| (ALL_SLOTS[s].to_string(), self.items[item as usize].ankama_id))
            .collect()
    }

    fn to_result(&self, g: &[i32; NSLOT]) -> BuildResult {
        let g = &self.arrange(g);
        let ev = self.evaluate(g);
        let mut items = Vec::new();
        let mut exo = HashMap::new();
        let mut runes = HashMap::new();
        let mut rune_effects = self.locked_runes.clone();
        for (s, &item) in g.iter().enumerate() {
            if item < 0 {
                continue;
            }
            let it = &self.catalog[item as usize];
            items.push(EquippedItem { ankama_id: it.ankama_id, effects: it.effects.clone(), set_id: it.set_id, slot: it.slot.clone() });
            let kind = match ev.exo[s] {
                1 => Some(("ap", "AP")),
                2 => Some(("mp", "MP")),
                3 => Some(("range", "Range")),
                _ => None,
            };
            if let Some((key, stat)) = kind {
                exo.insert(ALL_SLOTS[s].to_string(), key.to_string());
                rune_effects.push(ItemEffect { stat: stat.to_string(), min: 1, max: 1, effect_id: None });
            }
            if let Some((i, v)) = ev.rune[s] {
                let stat = rune_stat_name(i).to_string();
                rune_effects.push(ItemEffect { stat: stat.clone(), min: v, max: v, effect_id: None });
                runes.insert(ALL_SLOTS[s].to_string(), RuneChoice { stat, value: v });
            }
        }
        let allocated = AllocatedCharacteristics {
            vitality: ev.alloc[0],
            wisdom: ev.alloc[1],
            strength: ev.alloc[2],
            intelligence: ev.alloc[3],
            chance: ev.alloc[4],
            agility: ev.alloc[5],
        };
        let stats = compute_stats(&BuildInput {
            level: self.level,
            allocated: allocated.clone(),
            scrolled: self.scrolled.clone(),
            items,
            sets: &self.set_data,
            rune_effects,
        });
        BuildResult {
            equipped: self.equipped_map(g),
            stats,
            score: ev.score,
            meets_required: ev.meets_required,
            conditions_ok: ev.conditions_ok,
            allocated,
            scrolled: self.scrolled.clone(),
            exo,
            runes,
            requirements_met: ev.requirements_met,
            requirements_total: self.targets.iter().filter(|t| t.goal > 0).count(),
        }
    }

    /// Recomputes every goal from the reported StatBlock (the slow, exact
    /// compute_stats path) and checks it agrees with what the fast dense
    /// evaluation claimed. Used by tests and the real-catalog validation.
    pub fn verify(&self, r: &BuildResult) -> Result<(), String> {
        for t in &self.targets {
            let mut v = get_stat(&r.stats, FIELDS[t.idx]);
            if t.add_power {
                v += r.stats.power;
            }
            let ec = v.min(t.max);
            if r.meets_required && t.goal > 0 && ec < t.goal {
                return Err(format!("{} claimed met but is {} < {}", FIELDS[t.idx], ec, t.goal));
            }
            if t.absolute && v > t.max && r.meets_required {
                return Err(format!("{} over absolute max {} > {}", FIELDS[t.idx], v, t.max));
            }
        }
        let spent = r.stats.points_spent;
        if spent > r.stats.points_budget {
            return Err(format!("points overspent {} > {}", spent, r.stats.points_budget));
        }
        if r.stats.ap > 12 || r.stats.mp > 6 || r.stats.range > 6 {
            return Err("game caps exceeded".into());
        }
        let forgeable_runes = r.exo.len() + r.runes.len();
        if forgeable_runes > 9 || r.exo.keys().any(|s| r.runes.contains_key(s)) {
            return Err("more than one rune on an item".into());
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::optimizer_types::{CatalogCondition, ExoConfig, StatConfig};

    fn effect(stat: &str, v: i64) -> ItemEffect {
        ItemEffect { stat: stat.to_string(), min: v, max: 0, effect_id: None }
    }
    fn item(id: i64, slot: &str, set_id: Option<i64>, effects: Vec<ItemEffect>) -> CatalogItem {
        CatalogItem { ankama_id: id, name: format!("Item {id}"), level: 50, item_type: "Misc".to_string(), slot: slot.to_string(), effects, conditions: None, set_id }
    }
    fn cond(stat: &str, goal: i64, weight: i64) -> StatConfig {
        StatConfig { stat: stat.to_string(), goal, weight, max: None, absolute: false }
    }
    fn config(stats: Vec<StatConfig>, open: &[&str]) -> OptimizerConfig {
        OptimizerConfig {
            stats,
            exo: ExoConfig { ap: false, mp: false, range: false, only_on_ring: true, max_count: 0 },
            max_level: 200,
            locked_slots: ALL_SLOTS.iter().filter(|s| !open.contains(s)).map(|s| s.to_string()).collect(),
            assume_fully_scrolled: false,
            banned_items: vec![],
            banned_types: vec![],
            transcendence: false,
            islands: 4,
            prune: true,
        }
    }
    fn base(level: i64) -> OptimizerBuildBase {
        OptimizerBuildBase { level, allocated: Default::default(), scrolled: Default::default(), equipped: HashMap::new(), runes: HashMap::new() }
    }
    fn run(f: &mut Forge, gens: usize) -> Vec<BuildResult> {
        for _ in 0..gens {
            f.run_generation();
        }
        let results = f.results();
        for r in &results {
            f.verify(r).unwrap();
        }
        results
    }
    // Fake clock that advances 1 ms per reading, so time budgets end.
    fn ticking() -> impl Fn() -> f64 {
        let tick = std::cell::Cell::new(0.0);
        move || {
            tick.set(tick.get() + 1.0);
            tick.get()
        }
    }
    fn target_value(r: &BuildResult, stat: &str) -> i64 {
        get_stat(&r.stats, stat) + if ["strength", "intelligence", "chance", "agility"].contains(&stat) { r.stats.power } else { 0 }
    }

    #[test]
    fn dense_evaluation_matches_compute_stats() {
        let items = vec![
            item(1, "hat", Some(9), vec![effect("Agility", 87), effect("Wisdom", 33), effect("Damage", 7), effect("% Fire Resistance", 30)]),
            item(2, "cape", Some(9), vec![effect("Strength", 45), effect("Chance", 61), effect("AP", 1), effect("Vitality", 300)]),
            item(3, "ring", None, vec![effect("Intelligence", 70), effect("% Fire Resistance", 30), effect("Range", 7)]),
        ];
        let mut bonuses = HashMap::new();
        bonuses.insert("2".to_string(), vec![effect("Power", 40), effect("MP", 4)]);
        let sets = vec![CatalogSet { ankama_id: 9, items: vec![1, 2], bonuses }];
        let stats: Vec<StatConfig> = FIELDS.iter().map(|f| cond(f, 0, 1)).collect();
        let mut cfg = config(stats, &["hat", "cape", "ring1"]);
        cfg.transcendence = true;
        let f = Forge::new(cfg, items, sets, base(150), 1);
        let mut g = [-1i32; NSLOT];
        g[0] = 0;
        g[1] = 1;
        g[RING1] = 2;
        let r = f.to_result(&g);
        let ev = f.evaluate(&g);
        assert!(ev.rune.iter().any(|r| r.is_some()), "runes should be placed");
        let mut pre = f.base_pre;
        for &i in &[0usize, 1, 2] {
            add_into(&mut pre, &f.items[i].vec);
        }
        add_into(&mut pre, &f.set_bonus[0][2]);
        for i in ELEM_DMG_FIRST..=ELEM_DMG_LAST {
            pre[i] += pre[DAMAGE];
        }
        for (s, slot_rune) in ev.rune.iter().enumerate() {
            if let Some((i, v)) = slot_rune {
                assert!(g[s] >= 0);
                pre[*i] += v;
            }
        }
        let ch = Forge::chars_of(&pre, &ev.alloc);
        for (i, key) in FIELDS.iter().enumerate() {
            assert_eq!(f.final_value(&pre, &ch, i), get_stat(&r.stats, key), "{key}");
        }
    }

    #[test]
    fn assembles_a_set_whose_bonus_beats_stronger_loose_items() {
        let items = vec![
            item(101, "hat", Some(1), vec![effect("Vitality", 50)]),
            item(102, "cape", Some(1), vec![effect("Vitality", 50)]),
            item(103, "amulet", Some(1), vec![effect("Vitality", 50)]),
            item(201, "hat", None, vec![effect("Vitality", 200)]),
            item(202, "cape", None, vec![effect("Vitality", 200)]),
            item(203, "amulet", None, vec![effect("Vitality", 200)]),
        ];
        let mut bonuses = HashMap::new();
        bonuses.insert("3".to_string(), vec![effect("Vitality", 1000)]);
        let sets = vec![CatalogSet { ankama_id: 1, items: vec![101, 102, 103], bonuses }];
        let mut f = Forge::new(config(vec![cond("vitality", 0, 1)], &["hat", "cape", "amulet"]), items, sets, base(1), 7);
        let best = &run(&mut f, 30)[0];
        assert_eq!(get_stat(&best.stats, "vitality"), 1150);
    }

    #[test]
    fn unmet_goals_score_negative_and_met_goals_score_surplus() {
        // Item 1 keeps a point of Chance so it is not dominated (pruned).
        let items = vec![item(1, "hat", None, vec![effect("Strength", 40), effect("Chance", 1)]), item(2, "hat", None, vec![effect("Strength", 120)])];
        let mut f = Forge::new(config(vec![cond("strength", 100, 2), cond("chance", 0, 1)], &["hat"]), items, vec![], base(1), 3);
        let results = run(&mut f, 10);
        assert_eq!(results[0].equipped.get("hat"), Some(&2));
        assert_eq!(results[0].score, 40.0);
        assert!(results[0].meets_required);
        let low = results.iter().find(|r| r.equipped.get("hat") == Some(&1)).unwrap();
        assert_eq!(low.score, -120.0);
        assert!(!low.meets_required);
    }

    #[test]
    fn soft_max_stops_counting_and_absolute_max_rejects() {
        let items = vec![
            item(1, "hat", None, vec![effect("Strength", 300), effect("Wisdom", 10)]),
            item(2, "hat", None, vec![effect("Strength", 150), effect("Wisdom", 40)]),
        ];
        let mut soft = cond("strength", 0, 1);
        soft.max = Some(150);
        let mut f = Forge::new(config(vec![soft, cond("wisdom", 0, 1)], &["hat"]), items.clone(), vec![], base(1), 5);
        assert_eq!(run(&mut f, 10)[0].equipped.get("hat"), Some(&2));

        let mut hard = cond("strength", 0, 10);
        hard.max = Some(200);
        hard.absolute = true;
        let mut f = Forge::new(config(vec![hard], &["hat"]), items, vec![], base(1), 5);
        let r = run(&mut f, 10);
        assert_eq!(r[0].equipped.get("hat"), Some(&2));
        let over = r.iter().find(|x| x.equipped.get("hat") == Some(&1)).unwrap();
        assert!(over.score <= TIER_CONDITION);
    }

    #[test]
    fn power_counts_toward_characteristic_goals() {
        let items = vec![item(1, "hat", None, vec![effect("Power", 80)]), item(2, "hat", None, vec![effect("Strength", 60)])];
        let mut f = Forge::new(config(vec![cond("strength", 70, 1)], &["hat"]), items, vec![], base(1), 2);
        let r = &run(&mut f, 10)[0];
        assert_eq!(r.equipped.get("hat"), Some(&1));
        assert!(r.meets_required);
        assert_eq!(target_value(r, "strength"), 80);
    }

    #[test]
    fn allocates_points_to_close_a_goal_first() {
        let mut hat = item(1, "hat", None, vec![effect("Strength", 50)]);
        hat.level = 190;
        let mut f = Forge::new(config(vec![cond("strength", 150, 1), cond("vitality", 0, 1)], &["hat"]), vec![hat], vec![], base(200), 4);
        let r = &run(&mut f, 3)[0];
        assert_eq!(r.allocated.strength, 100);
        assert!(r.meets_required);
        assert_eq!(r.allocated.vitality, 895);
    }

    #[test]
    fn spends_points_to_meet_an_items_own_condition() {
        let mut gated = item(1, "hat", None, vec![effect("Vitality", 400)]);
        gated.level = 190;
        gated.conditions = Some(vec![CatalogCondition { stat: "Agility".to_string(), operator: ">".to_string(), value: 150 }]);
        let mut plain = item(2, "hat", None, vec![effect("Vitality", 100)]);
        plain.level = 190;
        let mut f = Forge::new(config(vec![cond("vitality", 0, 1)], &["hat"]), vec![gated, plain], vec![], base(200), 8);
        let r = &run(&mut f, 5)[0];
        assert_eq!(r.equipped.get("hat"), Some(&1));
        assert!(r.conditions_ok);
        assert_eq!(r.allocated.agility, 151);
    }

    #[test]
    fn exo_closes_an_ap_deficit_on_a_ring_only() {
        let mut items = vec![item(1, "ring", None, vec![effect("AP", 1)]), item(2, "hat", None, vec![effect("AP", 3)])];
        items.iter_mut().for_each(|it| it.level = 190);
        let mut cfg = config(vec![cond("ap", 12, 100)], &["ring1", "hat"]);
        cfg.exo = ExoConfig { ap: true, mp: false, range: false, only_on_ring: true, max_count: 1 };
        let mut f = Forge::new(cfg, items, vec![], base(200), 9);
        let r = &run(&mut f, 5)[0];
        assert_eq!(get_stat(&r.stats, "ap"), 12);
        assert_eq!(r.exo.get("ring1").map(|s| s.as_str()), Some("ap"));
        assert!(r.meets_required);
    }

    #[test]
    fn every_damage_and_resistance_stat_the_ui_offers_is_scored() {
        let cases = [
            ("pushbackDamage", "Pushback Damage"),
            ("pushbackResist", "Pushback Resistance"),
            ("trapDamage", "Trap Damage"),
            ("trapPower", "Power (traps)"),
            ("reflectedDamage", "reflected damage"),
            ("meleeResistPercent", "% Melee Resistance"),
            ("rangedResistPercent", "% Ranged Resistance"),
            ("mpSteal", "Steals MP"),
            ("summons", "Summons"),
        ];
        for (key, effect_name) in cases {
            let mut items = vec![item(1, "hat", None, vec![effect(effect_name, 5)]), item(2, "hat", None, vec![effect("Vitality", 1)])];
            items.iter_mut().for_each(|it| it.level = 190);
            let mut f = Forge::new(config(vec![cond(key, 5, 10)], &["hat"]), items, vec![], base(200), 3);
            let r = &run(&mut f, 3)[0];
            assert!(r.meets_required, "{key} from \"{effect_name}\" was not reached: {} met {}/{} hat {:?}", get_stat(&r.stats, key), r.requirements_met, r.requirements_total, r.equipped.get("hat"));
            assert_eq!(r.equipped.get("hat"), Some(&1), "{key}");
        }
    }

    #[test]
    fn transcendence_rune_rank_follows_the_existing_line() {
        // 10 earth damage weighs 50 (> Ra 20, > Pa 40, <= Tra 60): only the
        // smallest rank fits. A bare item takes the biggest one.
        let mut heavy = item(1, "hat", None, vec![effect("Earth Damage", 10)]);
        let mut bare = item(2, "cape", None, vec![effect("Vitality", 1)]);
        heavy.level = 190;
        bare.level = 190;
        let mut cfg = config(vec![cond("earthDamage", 0, 10)], &["hat", "cape"]);
        cfg.transcendence = true;
        let mut f = Forge::new(cfg, vec![heavy, bare], vec![], base(200), 11);
        let r = &run(&mut f, 5)[0];
        assert_eq!(r.runes.get("hat").map(|x| x.value), Some(2));
        assert_eq!(r.runes.get("cape").map(|x| x.value), Some(6));
        assert_eq!(get_stat(&r.stats, "earthDamage"), 18);
    }

    #[test]
    fn runes_close_a_resistance_goal_items_cannot() {
        let mut items: Vec<CatalogItem> = ["hat", "cape", "amulet", "belt", "boots"]
            .iter()
            .enumerate()
            .map(|(i, s)| item(i as i64 + 1, s, None, vec![effect("% Fire Resistance", 6)]))
            .collect();
        items.iter_mut().for_each(|it| it.level = 190);
        let mut cfg = config(vec![cond("fireResPercent", 40, 30)], &["hat", "cape", "amulet", "belt", "boots"]);
        cfg.transcendence = true;
        let mut f = Forge::new(cfg, items, vec![], base(200), 12);
        let r = &run(&mut f, 5)[0];
        assert_eq!(get_stat(&r.stats, "fireResPercent"), 40);
        assert!(r.meets_required);
        assert_eq!(r.runes.len(), 5);
    }

    #[test]
    fn respects_item_conditions_with_multiword_stats() {
        let mut gated = item(1, "hat", None, vec![effect("Vitality", 500)]);
        gated.conditions = Some(vec![CatalogCondition { stat: "% Critical".to_string(), operator: ">".to_string(), value: 20 }]);
        let items = vec![gated, item(2, "hat", None, vec![effect("Vitality", 100)])];
        let mut f = Forge::new(config(vec![cond("vitality", 0, 1)], &["hat"]), items, vec![], base(1), 6);
        let r = &run(&mut f, 5)[0];
        assert_eq!(r.equipped.get("hat"), Some(&2));
    }

    #[test]
    fn banned_items_never_appear() {
        let items = vec![item(1, "hat", None, vec![effect("Vitality", 500)]), item(2, "hat", None, vec![effect("Vitality", 100)])];
        let mut cfg = config(vec![cond("vitality", 0, 1)], &["hat"]);
        cfg.banned_items = vec![1];
        let mut f = Forge::new(cfg, items, vec![], base(1), 6);
        assert!(run(&mut f, 5).iter().all(|r| r.equipped.get("hat") != Some(&1)));
    }

    #[test]
    fn locked_slot_keeps_its_item_and_runes() {
        let items = vec![item(1, "hat", None, vec![effect("Vitality", 10)]), item(2, "cape", None, vec![effect("Vitality", 20)])];
        let mut b = base(1);
        b.equipped.insert("hat".to_string(), 1);
        let mut runes = HashMap::new();
        runes.insert("Vitality".to_string(), 30);
        b.runes.insert("hat".to_string(), runes);
        let mut f = Forge::new(config(vec![cond("vitality", 0, 1)], &["cape"]), items, vec![], b, 6);
        let r = &run(&mut f, 5)[0];
        assert_eq!(r.equipped.get("hat"), Some(&1));
        assert_eq!(get_stat(&r.stats, "vitality"), 60);
        assert!(r.runes.get("hat").is_none());
    }

    #[test]
    fn temper_finds_the_best_single_slot_swaps() {
        let items: Vec<CatalogItem> = (0..60).map(|i| item(i, if i % 2 == 0 { "hat" } else { "cape" }, None, vec![effect("Vitality", i)])).collect();
        let mut f = Forge::new(config(vec![cond("vitality", 0, 1)], &["hat", "cape"]), items, vec![], base(1), 13);
        f.temper(5000.0, &ticking());
        let r = &f.results()[0];
        assert_eq!(r.equipped.get("hat"), Some(&58));
        assert_eq!(r.equipped.get("cape"), Some(&59));
    }

    #[test]
    fn stoking_never_loses_the_best_piece() {
        let items: Vec<CatalogItem> = (0..60).map(|i| item(i, if i % 2 == 0 { "hat" } else { "cape" }, None, vec![effect("Vitality", i)])).collect();
        let mut f = Forge::new(config(vec![cond("vitality", 0, 1)], &["hat", "cape"]), items, vec![], base(1), 21);
        run(&mut f, 10);
        let before = f.best_score();
        f.stoke();
        assert!(f.best_score() >= before);
        f.run_generation();
        assert!(f.best_score() >= before);
        assert!(f.report().evaluations > 0);
    }

    #[test]
    fn tempering_escapes_a_two_slot_trap() {
        // A 2-piece set beats the loose pair only when both pieces are worn,
        // so no single-slot swap from the loose pair reaches it.
        let mut items = vec![
            item(1, "hat", Some(5), vec![effect("Vitality", 10)]),
            item(2, "cape", Some(5), vec![effect("Vitality", 10)]),
            item(3, "hat", None, vec![effect("Vitality", 60)]),
            item(4, "cape", None, vec![effect("Vitality", 60)]),
        ];
        items.iter_mut().for_each(|it| it.level = 1);
        let mut bonuses = HashMap::new();
        bonuses.insert("2".to_string(), vec![effect("Vitality", 500)]);
        let sets = vec![CatalogSet { ankama_id: 5, items: vec![1, 2], bonuses }];
        let mut cfg = config(vec![cond("vitality", 0, 1)], &["hat", "cape"]);
        cfg.islands = 1;
        let mut f = Forge::new(cfg, items, sets, base(1), 4);
        let mut g = f.fixed;
        g[0] = 2;
        g[1] = 3;
        f.hall = vec![f.make(g)];
        let tick = std::cell::Cell::new(0.0);
        let now = || {
            tick.set(tick.get() + 1.0);
            tick.get()
        };
        f.temper(5000.0, &now);
        assert_eq!(get_stat(&f.results()[0].stats, "vitality"), 520);
    }

    #[test]
    fn targeted_kick_closes_a_small_gap() {
        // The only fire-resistance hat is weak overall, so value-ranked
        // tempering never tries it; the targeted kick does.
        let mut items: Vec<CatalogItem> = (0..80).map(|i| item(i, "hat", None, vec![effect("Vitality", 100 + i)])).collect();
        items.push(item(500, "hat", None, vec![effect("% Fire Resistance", 5), effect("Vitality", 1)]));
        items.push(item(501, "cape", None, vec![effect("% Fire Resistance", 5)]));
        items.iter_mut().for_each(|it| it.level = 1);
        let mut cfg = config(vec![cond("fireResPercent", 10, 30), cond("vitality", 0, 1)], &["hat", "cape"]);
        cfg.islands = 1;
        let mut f = Forge::new(cfg, items, vec![], base(1), 31);
        assert!(f.short_pools[0].contains(&80), "stat pool merged into short pool");
        let mut g = f.fixed;
        g[0] = 79;
        g[1] = 81;
        f.hall = vec![f.make(g)];
        f.temper(4000.0, &ticking());
        let r = &f.results()[0];
        assert!(r.meets_required);
        assert_eq!(r.equipped.get("hat"), Some(&500));
    }

    #[test]
    #[ignore]
    fn diagnose_user_order() {
        let items: Vec<CatalogItem> = serde_json::from_str(&std::fs::read_to_string("../public/data/en/equipment.json").unwrap()).unwrap();
        let sets: Vec<CatalogSet> = serde_json::from_str(&std::fs::read_to_string("../public/data/en/sets.json").unwrap()).unwrap();
        let set_names: HashMap<i64, String> = serde_json::from_str::<Vec<serde_json::Value>>(&std::fs::read_to_string("../public/data/en/sets.json").unwrap())
            .unwrap()
            .iter()
            .map(|v| (v["ankama_id"].as_i64().unwrap(), v["name"].as_str().unwrap_or("").to_string()))
            .collect();
        let stats = vec![
            StatConfig { stat: "ap".into(), goal: 12, weight: 500, max: Some(12), absolute: false },
            StatConfig { stat: "mp".into(), goal: 6, weight: 500, max: Some(6), absolute: false },
            StatConfig { stat: "range".into(), goal: 6, weight: 250, max: Some(6), absolute: false },
            StatConfig { stat: "maxHp".into(), goal: 5000, weight: 1, max: None, absolute: false },
            StatConfig { stat: "strength".into(), goal: 1350, weight: 5, max: None, absolute: false },
            StatConfig { stat: "earthDamage".into(), goal: 180, weight: 25, max: None, absolute: false },
            StatConfig { stat: "fireResPercent".into(), goal: 40, weight: 30, max: Some(50), absolute: false },
            StatConfig { stat: "earthResPercent".into(), goal: 40, weight: 30, max: Some(50), absolute: false },
            StatConfig { stat: "waterResPercent".into(), goal: 40, weight: 30, max: Some(50), absolute: false },
            StatConfig { stat: "airResPercent".into(), goal: 40, weight: 30, max: Some(50), absolute: false },
            StatConfig { stat: "neutralResPercent".into(), goal: 20, weight: 30, max: Some(50), absolute: false },
        ];
        let mut cfg = config(stats, &ALL_SLOTS);
        cfg.exo = ExoConfig { ap: true, mp: true, range: true, only_on_ring: true, max_count: 2 };
        cfg.assume_fully_scrolled = true;
        cfg.islands = 1;
        let f = Forge::new(cfg, items, sets, base(200), 1);
        let pool_sizes: Vec<String> = f.free_slots.iter().map(|&s| format!("{}:{}", ALL_SLOTS[s], f.pools[s].len())).collect();
        println!("pool sizes {}", pool_sizes.join(" "));
        let wanted = ["Erotegg Set", "Count Harebourg Set", "Eternal Gardens Sanctuary Set", "Rhineetle Set"];
        let mut wanted_idx = Vec::new();
        for (rank, &st) in f.set_rank.iter().enumerate() {
            let name = &set_names[&f.set_data[st].ankama_id];
            if wanted.contains(&name.as_str()) {
                println!("set rank {rank}: {name}");
                wanted_idx.push(st);
            }
        }
        println!("ranked sets: {}", f.set_rank.len());
        let alloy = f.alloy(&wanted_idx[..wanted_idx.len().min(3)]);
        println!("alloy of top-3 wanted sets: score {}", alloy.score);
        let polished = f.ascend(alloy, true, f64::INFINITY, &ticking());
        println!("alloy polished (full pools): score {}", polished.score);
        let ids = [34327, 14168, 34329, 14077, 32234, 19983, 14078, 32235, 32236, 33035, 0, 7043, 7115, 7754, 21996, 694, 29136];
        let optimum: HashMap<String, i64> = ALL_SLOTS.iter().zip(ids).filter(|(_, id)| *id != 0).map(|(s, id)| (s.to_string(), id)).collect();
        let (r, _) = f.assess(&optimum);
        println!("optimum score {}", r.unwrap().score);
        let mut g = f.fixed;
        for &s in &f.free_slots {
            if let Some(id) = optimum.get(ALL_SLOTS[s]) {
                g[s] = f.items.iter().position(|it| it.ankama_id == *id).unwrap() as i32;
            }
        }
        let polished_opt = f.ascend(f.make(g), true, f64::INFINITY, &ticking());
        println!("optimum after full polish: score {}", polished_opt.score);
    }

    #[test]
    fn dominated_items_leave_the_pool_but_set_items_stay() {
        let mut items = vec![
            item(1, "hat", None, vec![effect("Vitality", 100), effect("Strength", 50)]),
            item(2, "hat", None, vec![effect("Vitality", 80), effect("Strength", 50)]),
            item(3, "hat", Some(9), vec![effect("Vitality", 10)]),
            item(4, "ring", None, vec![effect("Vitality", 100)]),
            item(5, "ring", None, vec![effect("Vitality", 90)]),
            item(6, "ring", None, vec![effect("Vitality", 80)]),
        ];
        items.iter_mut().for_each(|it| it.level = 1);
        let mut bonuses = HashMap::new();
        bonuses.insert("2".to_string(), vec![effect("Vitality", 1)]);
        let sets = vec![CatalogSet { ankama_id: 9, items: vec![3], bonuses }];
        let f = Forge::new(config(vec![cond("vitality", 0, 1), cond("strength", 0, 1)], &["hat", "ring1", "ring2"]), items, sets, base(1), 3);
        let ids = |s: usize| -> Vec<i64> { f.pools[s].iter().map(|&i| f.items[i as usize].ankama_id).collect() };
        assert_eq!(ids(0), vec![1, 3]);
        assert_eq!(ids(RING1), vec![4, 5]);
    }

    #[test]
    fn a_prysmaradite_always_sits_in_the_first_dofus_slot() {
        let mut prysma = item(7, "dofus", None, vec![effect("Vitality", 300)]);
        prysma.item_type = "Prysmaradite".to_string();
        let items = vec![item(1, "dofus", None, vec![effect("Vitality", 200)]), item(2, "dofus", None, vec![effect("Vitality", 100)]), prysma];
        let f = Forge::new(config(vec![cond("vitality", 0, 1)], &["dofus1", "dofus2", "dofus3"]), items, vec![], base(1), 2);
        let mut g = f.fixed;
        g[DOFUS_FIRST] = 0;
        g[DOFUS_FIRST + 1] = 1;
        g[DOFUS_FIRST + 2] = 2;
        let r = f.to_result(&g);
        assert_eq!(r.equipped.get("dofus1"), Some(&7));
        assert_eq!(get_stat(&r.stats, "vitality"), 600);
    }

    #[test]
    fn migrants_carry_over_between_forges() {
        let items: Vec<CatalogItem> = (0..40).map(|i| item(i, if i % 2 == 0 { "hat" } else { "cape" }, None, vec![effect("Vitality", i)])).collect();
        let cfg = || config(vec![cond("vitality", 0, 1)], &["hat", "cape"]);
        let mut a = Forge::new(cfg(), items.clone(), vec![], base(1), 1);
        a.temper(5000.0, &ticking());
        let mut b = Forge::new(cfg(), items, vec![], base(1), 2);
        b.inject(&a.emigrants());
        assert_eq!(b.best_score(), a.best_score());
    }

    #[test]
    fn same_seed_same_search() {
        let items: Vec<CatalogItem> = (0..40).map(|i| item(i, if i % 2 == 0 { "hat" } else { "cape" }, None, vec![effect("Vitality", i * 7 % 23), effect("Wisdom", i * 5 % 17)])).collect();
        let cfg = || config(vec![cond("vitality", 0, 1), cond("wisdom", 0, 3)], &["hat", "cape"]);
        let mut a = Forge::new(cfg(), items.clone(), vec![], base(1), 42);
        let mut b = Forge::new(cfg(), items, vec![], base(1), 42);
        assert_eq!(run(&mut a, 20)[0].equipped, run(&mut b, 20)[0].equipped);
    }
}
