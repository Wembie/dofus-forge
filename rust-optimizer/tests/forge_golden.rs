// Golden tests: pin the forge's exact behaviour on a frozen catalog
// (tests/fixtures/forge-catalog, see freeze-catalog.mjs there).
//
// - `evaluation_is_unchanged` scores thousands of random builds (random
//   items, whole sets, invalid combinations, rings and Dofus in any order)
//   under very different orders and compares every BuildResult — score,
//   stats, points, exos, runes, flags — with the recorded one.
// - `forging_is_unchanged` runs whole forges with a fixed seed and a
//   simulated clock (generations, migrations, restarts, bellows, injected
//   builds, tempering) and compares the evaluation count and every result.
//
// A pure speed-up must leave all of it identical. Regenerate the golden file
// only for a change that is meant to alter results, in its own commit:
//   FORGE_GOLDEN_UPDATE=1 cargo test --release --test forge_golden
use dofus_forge_optimizer::forge::{Forge, ALL_SLOTS};
use dofus_forge_optimizer::optimizer_types::{BuildResult, CatalogItem, CatalogSet, ExoConfig, OptimizerBuildBase, OptimizerConfig, PassiveEffects, StatConfig};
use dofus_forge_optimizer::types::{ItemEffect, ScrolledCharacteristics};
use std::cell::Cell;
use std::collections::{BTreeMap, HashMap};
use std::sync::{Mutex, OnceLock};

const GOLDEN: &str = "tests/fixtures/forge-golden.txt";
const BUILDS_PER_CASE: usize = 1500;

fn catalog() -> &'static (Vec<CatalogItem>, Vec<CatalogSet>) {
    static CATALOG: OnceLock<(Vec<CatalogItem>, Vec<CatalogSet>)> = OnceLock::new();
    CATALOG.get_or_init(|| {
        let items = serde_json::from_str(&std::fs::read_to_string("tests/fixtures/forge-catalog/equipment.json").unwrap()).unwrap();
        let sets = serde_json::from_str(&std::fs::read_to_string("tests/fixtures/forge-catalog/sets.json").unwrap()).unwrap();
        (items, sets)
    })
}

// ── Orders ───────────────────────────────────────────────────────────────

fn c(stat: &str, goal: i64, weight: i64, max: Option<i64>) -> StatConfig {
    StatConfig { stat: stat.to_string(), goal, weight, max, absolute: false }
}

fn strict(stat: &str, goal: i64, weight: i64, max: i64) -> StatConfig {
    StatConfig { stat: stat.to_string(), goal, weight, max: Some(max), absolute: true }
}

fn effect(stat: &str, v: i64) -> ItemEffect {
    ItemEffect { stat: stat.to_string(), min: v, max: v, effect_id: None }
}

struct Case {
    name: &'static str,
    config: OptimizerConfig,
    base: OptimizerBuildBase,
}

fn config(stats: Vec<StatConfig>, exo: ExoConfig, transcendence: bool, max_level: i64) -> OptimizerConfig {
    OptimizerConfig {
        stats,
        exo,
        max_level,
        locked_slots: vec![],
        assume_fully_scrolled: true,
        banned_items: vec![],
        banned_types: vec![],
        required_items: vec![],
        passive_effects: vec![],
        pro_exo_max: 0,
        pro_exo_weight: 30, pro_exo_lines: vec![], pro_exo_caps: HashMap::new(),
        transcendence,
        islands: 2,
        prune: true,
    }
}

fn base(level: i64) -> OptimizerBuildBase {
    OptimizerBuildBase { level, allocated: Default::default(), scrolled: Default::default(), equipped: HashMap::new(), runes: HashMap::new() }
}

fn rings_exo(max: i64) -> ExoConfig {
    ExoConfig { ap: true, mp: true, range: true, only_on_ring: true, max_count: max }
}

fn earth_order() -> Vec<StatConfig> {
    vec![
        c("ap", 12, 500, Some(12)), c("mp", 6, 500, Some(6)), c("range", 6, 250, Some(6)),
        c("maxHp", 5000, 1, None), c("strength", 1350, 5, None), c("earthDamage", 180, 25, None),
        c("fireResPercent", 40, 30, Some(50)), c("earthResPercent", 40, 30, Some(50)), c("waterResPercent", 40, 30, Some(50)),
        c("airResPercent", 40, 30, Some(50)), c("neutralResPercent", 20, 30, Some(50)),
    ]
}

fn cases() -> Vec<Case> {
    let mut locked = config(
        vec![c("ap", 12, 500, Some(12)), c("mp", 6, 500, Some(6)), c("vitality", 4000, 1, None), c("strength", 1000, 5, None), c("power", 200, 3, None), c("critChance", 40, 50, Some(100))],
        rings_exo(2),
        true,
        200,
    );
    locked.locked_slots = vec!["hat".into(), "ring1".into(), "dofus1".into()];
    locked.required_items = vec![34329, 21996];
    locked.banned_items = vec![14168, 32234];
    locked.banned_types = vec!["Prysmaradite".into()];
    locked.assume_fully_scrolled = false;
    locked.passive_effects = vec![
        PassiveEffects { id: 7115, effects: vec![effect("AP", 1)] },
        PassiveEffects { id: 29136, effects: vec![effect("Strength", 100), effect("Vitality", 300)] },
        PassiveEffects { id: 14078, effects: vec![effect("MP", 1), effect("Power", 50)] },
    ];
    let mut locked_base = base(200);
    locked_base.scrolled = ScrolledCharacteristics { vitality: true, wisdom: false, strength: true, intelligence: false, chance: true, agility: false };
    locked_base.equipped = HashMap::from([("hat".into(), 34327), ("ring1".into(), 14077), ("dofus1".into(), 7043), ("cape".into(), 14168)]);
    locked_base.runes = HashMap::from([("hat".into(), HashMap::from([("Strength".into(), 20)])), ("ring1".into(), HashMap::from([("Vitality".into(), 50)]))]);

    vec![
        Case { name: "earth-runes", config: config(earth_order(), rings_exo(2), true, 200), base: base(200) },
        Case { name: "earth-plain", config: config(earth_order(), ExoConfig { ap: true, mp: true, range: false, only_on_ring: false, max_count: 3 }, false, 200), base: base(200) },
        Case {
            name: "tank-strict",
            config: config(
                vec![
                    strict("ap", 10, 500, 11), c("mp", 6, 500, Some(6)), c("vitality", 5000, 1, None),
                    c("fireResPercent", 45, 30, Some(50)), c("earthResPercent", 45, 30, Some(50)), c("waterResPercent", 45, 30, Some(50)),
                    c("airResPercent", 45, 30, Some(50)), strict("neutralResPercent", 30, 30, 45), c("lock", 80, 10, None),
                ],
                rings_exo(1),
                true,
                200,
            ),
            base: base(200),
        },
        Case {
            name: "wisdom-derived",
            config: config(
                vec![
                    c("ap", 11, 500, Some(12)), c("mp", 5, 500, Some(6)), c("wisdom", 600, 15, None), c("apReduction", 60, 35, None),
                    c("mpParry", 40, 10, None), c("initiative", 3000, 1, None), c("prospecting", 150, 2, None), c("pods", 2000, 0, None),
                    c("dodge", 60, 5, Some(90)), c("summons", 4, 100, Some(6)),
                ],
                ExoConfig { ap: false, mp: true, range: true, only_on_ring: false, max_count: 2 },
                true,
                200,
            ),
            base: base(200),
        },
        Case { name: "locked-required-passives", config: locked, base: locked_base },
        Case {
            name: "low-level-agility",
            config: config(
                vec![c("ap", 10, 500, Some(12)), c("mp", 5, 500, Some(6)), c("agility", 500, 5, None), c("airDamage", 40, 25, None), c("critChance", 30, 50, Some(100)), c("critDamage", 20, 25, None)],
                rings_exo(2),
                true,
                120,
            ),
            base: base(120),
        },
        Case {
            name: "multi-element",
            config: config(
                vec![
                    c("ap", 12, 500, Some(12)), c("mp", 6, 500, Some(6)), c("intelligence", 800, 5, None), c("chance", 800, 5, None),
                    c("fireDamage", 80, 25, None), c("waterDamage", 80, 25, None), c("heals", 30, 5, None), c("critChance", 25, 40, Some(60)),
                ],
                rings_exo(2),
                true,
                200,
            ),
            base: base(200),
        },
        Case {
            name: "no-exo-fixed-res",
            config: config(
                vec![
                    c("ap", 11, 500, Some(12)), c("mp", 6, 500, Some(6)), c("earthResFixed", 40, 10, None), c("fireResFixed", 40, 10, None),
                    c("pushbackDamage", 50, 5, None), c("damage", 30, 20, None), c("meleeDamagePercent", 10, 40, None), c("mpReduction", 20, 10, None),
                ],
                rings_exo(0),
                true,
                200,
            ),
            base: base(200),
        },
    ]
}

// ── Random builds ────────────────────────────────────────────────────────

struct Rng(u64);

impl Rng {
    fn next(&mut self) -> u64 {
        self.0 = self.0.wrapping_add(0x9E37_79B9_7F4A_7C15);
        let mut z = self.0;
        z = (z ^ (z >> 30)).wrapping_mul(0xBF58_476D_1CE4_E5B9);
        z = (z ^ (z >> 27)).wrapping_mul(0x94D0_49BB_1331_11EB);
        z ^ (z >> 31)
    }
    fn below(&mut self, n: usize) -> usize {
        (self.next() % n as u64) as usize
    }
    fn chance(&mut self, percent: u64) -> bool {
        self.next() % 100 < percent
    }
}

fn fits(item: &CatalogItem, slot: &str) -> bool {
    match slot {
        "ring1" | "ring2" => item.slot == "ring",
        "companion" => item.slot == "pet" || (item.slot == "other" && ["Pet", "Petsmount", "Dragoturkey", "Seemyool", "Rhineetle"].contains(&item.item_type.as_str())),
        "sidekick" => item.slot == "other" && item.item_type == "Sidekick",
        s if s.starts_with("dofus") => item.slot == "dofus",
        s => item.slot == s,
    }
}

// Random items (mostly wearable at the order's level), whole sets, and now
// and then a deliberate duplicate ring or Dofus (an illegal build).
fn random_builds(case: &Case, seed: u64) -> Vec<HashMap<String, i64>> {
    let (items, sets) = catalog();
    let level = case.config.max_level.min(case.base.level);
    let candidates: Vec<(Vec<i64>, Vec<i64>)> = ALL_SLOTS
        .iter()
        .map(|s| {
            let all: Vec<&CatalogItem> = items.iter().filter(|it| fits(it, s)).collect();
            (all.iter().filter(|it| it.level <= level).map(|it| it.ankama_id).collect(), all.iter().map(|it| it.ankama_id).collect())
        })
        .collect();
    let by_id: HashMap<i64, &CatalogItem> = items.iter().map(|it| (it.ankama_id, it)).collect();
    let mut rng = Rng(seed);
    (0..BUILDS_PER_CASE)
        .map(|_| {
            let mut build: HashMap<String, i64> = HashMap::new();
            if rng.chance(35) {
                for _ in 0..1 + rng.below(2) {
                    let set = &sets[rng.below(sets.len())];
                    for id in &set.items {
                        let Some(&item) = by_id.get(id) else { continue };
                        let open = ALL_SLOTS.iter().find(|s| !build.contains_key(**s) && fits(item, s));
                        if let Some(s) = open {
                            build.insert(s.to_string(), *id);
                        } else if item.slot == "ring" && rng.chance(50) {
                            build.insert("ring2".into(), *id);
                        }
                    }
                }
            }
            for (k, s) in ALL_SLOTS.iter().enumerate() {
                if build.contains_key(*s) || !rng.chance(85) {
                    continue;
                }
                let (wearable, all) = &candidates[k];
                let pool = if rng.chance(95) && !wearable.is_empty() { wearable } else { all };
                if !pool.is_empty() {
                    build.insert(s.to_string(), pool[rng.below(pool.len())]);
                }
            }
            if rng.chance(3) {
                if let Some(&id) = build.get("ring1") {
                    build.insert("ring2".into(), id);
                }
            }
            if rng.chance(3) {
                if let Some(&id) = build.get("dofus2") {
                    build.insert("dofus5".into(), id);
                }
            }
            build
        })
        .collect()
}

// ── Recording ────────────────────────────────────────────────────────────

fn fnv(s: &str) -> u64 {
    s.bytes().fold(0xcbf2_9ce4_8422_2325u64, |h, b| (h ^ b as u64).wrapping_mul(0x0100_0000_01b3))
}

// Every field of the result (maps sorted), so any difference shows.
fn line(r: Option<&BuildResult>) -> String {
    match r {
        None => "invalid".into(),
        Some(r) => {
            let full = serde_json::to_value(r).unwrap().to_string();
            format!("{:016x} {}", fnv(&full), r.score)
        }
    }
}

fn summary(r: Option<&BuildResult>) -> String {
    match r {
        None => "invalid build".into(),
        Some(r) => {
            let sorted = |m: &HashMap<String, i64>| m.iter().map(|(k, v)| (k.clone(), *v)).collect::<BTreeMap<_, _>>();
            format!(
                "score {} meets {} conditions {} met {}/{} alloc {:?} exo {:?} runes {:?} equipped {:?}",
                r.score,
                r.meets_required,
                r.conditions_ok,
                r.requirements_met,
                r.requirements_total,
                r.allocated,
                r.exo.iter().collect::<BTreeMap<_, _>>(),
                r.runes.iter().map(|(k, v)| (k, format!("{}+{}", v.stat, v.value))).collect::<BTreeMap<_, _>>(),
                sorted(&r.equipped),
            )
        }
    }
}

fn forge(case: &Case, seed: u64) -> Forge {
    let (items, sets) = catalog();
    Forge::new(case.config.clone(), items.clone(), sets.clone(), case.base.clone(), seed)
}

// Each call to the clock advances one millisecond: tempering budgets become
// a fixed amount of work, the same on every machine.
fn simulated_clock() -> impl Fn() -> f64 {
    let t = Cell::new(0.0);
    move || {
        let now = t.get();
        t.set(now + 1.0);
        now
    }
}

fn record_evaluation(case: &Case) -> (Vec<String>, Vec<String>) {
    let f = forge(case, 1);
    let mut lines = Vec::new();
    let mut details = Vec::new();
    for build in random_builds(case, fnv(case.name)) {
        let (r, _) = f.assess(&build);
        if let Some(r) = &r {
            if let Err(e) = f.verify(r) {
                panic!("[{}] result disagrees with the stats engine: {e}\n{}", case.name, summary(Some(r)));
            }
        }
        lines.push(line(r.as_ref()));
        details.push(summary(r.as_ref()));
    }
    (lines, details)
}

struct RunPlan {
    case: usize,
    seed: u64,
    generations: u64,
    settle: bool,
    stagnation: Option<u32>,
    bias: Option<f64>,
    inject: bool,
    stoke_at: Option<u64>,
}

fn record_run(case: &Case, plan: &RunPlan) -> (Vec<String>, Vec<String>) {
    let mut f = forge(case, plan.seed);
    f.set_settle_tempered(plan.settle);
    if let Some(gens) = plan.stagnation {
        f.set_stagnation_reset(gens);
    }
    if let Some(p) = plan.bias {
        f.set_set_rank_bias(p);
    }
    if plan.inject {
        let seeds = random_builds(case, plan.seed ^ 0xABCD).into_iter().take(6).collect::<Vec<_>>();
        f.inject(&seeds);
    }
    let now = simulated_clock();
    let mut lines = Vec::new();
    for _ in 0..plan.generations {
        f.run_generation();
        if f.generation().is_multiple_of(30) {
            f.temper(120.0, &now);
            lines.push(format!("hammer at {} best {}", f.generation(), f.best_score()));
        }
        if Some(f.generation()) == plan.stoke_at {
            f.stoke();
        }
        if f.generation().is_multiple_of(41) {
            let emigrants: Vec<BTreeMap<String, i64>> = f.emigrants().into_iter().map(|m| m.into_iter().collect()).collect();
            lines.push(format!("emigrants at {} {:016x}", f.generation(), fnv(&format!("{emigrants:?}"))));
        }
    }
    f.temper(400.0, &now);
    let report = f.report();
    lines.push(format!("generation {} evaluations {} best {}", report.generation, report.evaluations, report.best_score));
    let mut details = Vec::new();
    for r in &report.results {
        if let Err(e) = f.verify(r) {
            panic!("[{}] result disagrees with the stats engine: {e}\n{}", case.name, summary(Some(r)));
        }
        lines.push(line(Some(r)));
        details.push(summary(Some(r)));
    }
    (lines, details)
}

fn run_plans() -> Vec<RunPlan> {
    vec![
        RunPlan { case: 0, seed: 7, generations: 90, settle: false, stagnation: None, bias: None, inject: false, stoke_at: None },
        RunPlan { case: 1, seed: 11, generations: 90, settle: true, stagnation: Some(8), bias: Some(0.4), inject: true, stoke_at: Some(45) },
        RunPlan { case: 2, seed: 3, generations: 60, settle: false, stagnation: Some(15), bias: None, inject: false, stoke_at: None },
        RunPlan { case: 4, seed: 5, generations: 60, settle: true, stagnation: None, bias: Some(0.9), inject: true, stoke_at: None },
        RunPlan { case: 5, seed: 9, generations: 60, settle: false, stagnation: Some(10), bias: None, inject: false, stoke_at: Some(31) },
    ]
}

// ── Golden file ──────────────────────────────────────────────────────────

fn read_golden() -> BTreeMap<String, Vec<String>> {
    let text = std::fs::read_to_string(GOLDEN).unwrap_or_else(|_| panic!("{GOLDEN} missing: generate it with FORGE_GOLDEN_UPDATE=1"));
    let mut sections = BTreeMap::new();
    let mut current: Option<(String, Vec<String>)> = None;
    for l in text.lines() {
        if let Some(name) = l.strip_prefix("== ") {
            if let Some((k, v)) = current.take() {
                sections.insert(k, v);
            }
            current = Some((name.to_string(), Vec::new()));
        } else if let Some((_, v)) = current.as_mut() {
            v.push(l.to_string());
        }
    }
    if let Some((k, v)) = current {
        sections.insert(k, v);
    }
    sections
}

fn updating() -> bool {
    std::env::var("FORGE_GOLDEN_UPDATE").is_ok_and(|v| v == "1")
}

fn write_section(name: &str, lines: &[String]) {
    static WRITING: Mutex<()> = Mutex::new(());
    let _guard = WRITING.lock().unwrap();
    let mut sections = if std::path::Path::new(GOLDEN).exists() { read_golden() } else { BTreeMap::new() };
    sections.insert(name.to_string(), lines.to_vec());
    let mut out = String::from("# Forge golden values: see tests/forge_golden.rs before touching this file.\n");
    for (k, v) in &sections {
        out.push_str(&format!("== {k}\n"));
        for l in v {
            out.push_str(l);
            out.push('\n');
        }
    }
    std::fs::write(GOLDEN, out).unwrap();
}

// The golden file holds one line per build: a hash of the whole result plus
// its score. On a mismatch, the current result of that build is printed.
fn check(name: &str, lines: &[String], details: &[String]) {
    let golden = read_golden();
    let expected = golden.get(name).unwrap_or_else(|| panic!("no golden section {name}"));
    let mut diffs = Vec::new();
    for (i, (got, want)) in lines.iter().zip(expected).enumerate() {
        if got != want {
            let detail = if name.starts_with("run:") {
                let first_result = lines.len() - details.len();
                i.checked_sub(first_result).and_then(|k| details.get(k)).cloned().unwrap_or_default()
            } else {
                details[i].clone()
            };
            diffs.push(format!("  #{i}: expected `{want}`, got `{got}`\n      now: {detail}"));
        }
    }
    if lines.len() != expected.len() {
        diffs.push(format!("  line count: expected {}, got {}", expected.len(), lines.len()));
    }
    if !diffs.is_empty() {
        let shown = diffs.iter().take(10).cloned().collect::<Vec<_>>().join("\n");
        panic!("[{name}] the forge's behaviour changed ({} differences):\n{shown}", diffs.len());
    }
}

fn record(name: &str, lines: Vec<String>, details: Vec<String>) {
    if updating() {
        write_section(name, &lines);
    } else {
        check(name, &lines, &details);
    }
}

#[test]
fn evaluation_is_unchanged() {
    for case in &cases() {
        let (lines, details) = record_evaluation(case);
        let valid = lines.iter().filter(|l| *l != "invalid").count();
        assert!(valid > BUILDS_PER_CASE / 2, "[{}] too few legal random builds ({valid})", case.name);
        record(&format!("eval:{}", case.name), lines, details);
    }
}

#[test]
fn forging_is_unchanged() {
    let cases = cases();
    for plan in &run_plans() {
        let case = &cases[plan.case];
        let (lines, details) = record_run(case, plan);
        record(&format!("run:{}:{}", case.name, plan.seed), lines, details);
    }
}
