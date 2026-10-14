// Not run by default (#[ignore]) — reproduces the EXACT config a user
// reported as "the search doesn't work, none of my requirements are met",
// against the real game catalog, to determine whether the target combo is
// genuinely unreachable or whether the search is failing to find an
// existing valid combination.
// Run: cargo test --release --test user_reported_case -- --ignored --nocapture
use dofus_forge_optimizer::optimizer::{run_optimizer, ALL_SLOTS};
use dofus_forge_optimizer::optimizer_types::{CatalogItem, CatalogSet, ExoConfig, OptimizerBuildBase, OptimizerConfig, StatConfig};
use dofus_forge_optimizer::stats::get_stat;
use dofus_forge_optimizer::types::{AllocatedCharacteristics, ScrolledCharacteristics};
use std::collections::HashMap;

fn run_case(stats: Vec<StatConfig>) -> Vec<dofus_forge_optimizer::optimizer_types::BuildResult> {
    let items: Vec<CatalogItem> = serde_json::from_str(&std::fs::read_to_string("../public/data/en/equipment.json").unwrap()).unwrap();
    let sets: Vec<CatalogSet> = serde_json::from_str(&std::fs::read_to_string("../public/data/en/sets.json").unwrap()).unwrap();
    let config = OptimizerConfig {
        stats,
        exo: ExoConfig { ap: false, mp: false, range: false },
        max_level: 200,
        locked_slots: vec![],
        assume_fully_scrolled: true,
    };
    let base = OptimizerBuildBase {
        level: 200,
        allocated: AllocatedCharacteristics::default(),
        scrolled: ScrolledCharacteristics::default(),
        equipped: HashMap::new(),
        runes: HashMap::new(),
    };
    run_optimizer(config, items, sets, base)
}

fn print_result(label: &str, r: &dofus_forge_optimizer::optimizer_types::BuildResult) {
    println!(
        "{label}: meets_required={} ap={} mp={} range={} hp={} str={} earthDmg={} fireRes={} earthRes={} waterRes={} airRes={} neutralRes={}",
        r.meets_required,
        get_stat(&r.stats, "ap"), get_stat(&r.stats, "mp"), get_stat(&r.stats, "range"),
        get_stat(&r.stats, "maxHp"), get_stat(&r.stats, "strength"), get_stat(&r.stats, "earthDamage"),
        get_stat(&r.stats, "fireResPercent"), get_stat(&r.stats, "earthResPercent"),
        get_stat(&r.stats, "waterResPercent"), get_stat(&r.stats, "airResPercent"), get_stat(&r.stats, "neutralResPercent"),
    );
}

#[test]
#[ignore]
fn relaxation_a_mobility_and_strength_only() {
    let results = run_case(vec![
        StatConfig { stat: "ap".into(), weight: 6, min_val: 12 },
        StatConfig { stat: "mp".into(), weight: 6, min_val: 6 },
        StatConfig { stat: "range".into(), weight: 6, min_val: 6 },
        StatConfig { stat: "strength".into(), weight: 6, min_val: 1500 },
    ]);
    print_result("A (mobility+str only)", &results[0]);
}

#[test]
#[ignore]
fn relaxation_b_resists_only() {
    let results = run_case(vec![
        StatConfig { stat: "fireResPercent".into(), weight: 6, min_val: 40 },
        StatConfig { stat: "earthResPercent".into(), weight: 6, min_val: 40 },
        StatConfig { stat: "waterResPercent".into(), weight: 6, min_val: 40 },
        StatConfig { stat: "airResPercent".into(), weight: 6, min_val: 40 },
        StatConfig { stat: "neutralResPercent".into(), weight: 6, min_val: 20 },
    ]);
    print_result("B (resists only)", &results[0]);
}

#[test]
#[ignore]
fn relaxation_c_mobility_strength_resists() {
    let results = run_case(vec![
        StatConfig { stat: "ap".into(), weight: 6, min_val: 12 },
        StatConfig { stat: "mp".into(), weight: 6, min_val: 6 },
        StatConfig { stat: "range".into(), weight: 6, min_val: 6 },
        StatConfig { stat: "strength".into(), weight: 6, min_val: 1500 },
        StatConfig { stat: "fireResPercent".into(), weight: 6, min_val: 40 },
        StatConfig { stat: "earthResPercent".into(), weight: 6, min_val: 40 },
        StatConfig { stat: "waterResPercent".into(), weight: 6, min_val: 40 },
        StatConfig { stat: "airResPercent".into(), weight: 6, min_val: 40 },
        StatConfig { stat: "neutralResPercent".into(), weight: 6, min_val: 20 },
    ]);
    print_result("C (mobility+str+resists, no HP/earthDmg)", &results[0]);
}

#[test]
#[ignore]
fn relaxation_d_hp_and_strength_only() {
    let results = run_case(vec![
        StatConfig { stat: "maxHp".into(), weight: 6, min_val: 5000 },
        StatConfig { stat: "strength".into(), weight: 6, min_val: 1500 },
    ]);
    print_result("D (hp+str only)", &results[0]);
}

#[test]
#[ignore]
fn relaxation_e_roxxsolver_real_11_conditions() {
    // Exact case the user reproduced on a competitor (roxxsolver): PA=12,
    // PM=6, Vitality=5000 (direct, weight 1), 4 elemental resist%=40
    // (weight 30 each), neutral resist%=20 (weight 30), Range(AL)=6
    // (weight 250), Strength=1350 (weight 5), Earth Damage=180 (weight 25).
    // The competitor found a legal 3-set combination satisfying all 11 in
    // ~8 seconds; our own Forge, on the same request, landed short on
    // Strength (~940-1068 of 1350) across several returned builds.
    let results = run_case(vec![
        StatConfig { stat: "ap".into(), weight: 500, min_val: 12 },
        StatConfig { stat: "mp".into(), weight: 500, min_val: 6 },
        StatConfig { stat: "maxHp".into(), weight: 1, min_val: 5000 },
        StatConfig { stat: "fireResPercent".into(), weight: 30, min_val: 40 },
        StatConfig { stat: "earthResPercent".into(), weight: 30, min_val: 40 },
        StatConfig { stat: "waterResPercent".into(), weight: 30, min_val: 40 },
        StatConfig { stat: "airResPercent".into(), weight: 30, min_val: 40 },
        StatConfig { stat: "neutralResPercent".into(), weight: 30, min_val: 20 },
        StatConfig { stat: "range".into(), weight: 250, min_val: 6 },
        StatConfig { stat: "strength".into(), weight: 5, min_val: 1350 },
        StatConfig { stat: "earthDamage".into(), weight: 25, min_val: 180 },
    ]);
    let best = &results[0];
    println!(
        "E (roxxsolver 11-cond): meets_required={} ap={} mp={} hp={} vit={} fireRes={} earthRes={} waterRes={} airRes={} neutralRes={} range={} str={} earthDmg={}",
        best.meets_required,
        get_stat(&best.stats, "ap"), get_stat(&best.stats, "mp"), get_stat(&best.stats, "maxHp"), get_stat(&best.stats, "vitality"),
        get_stat(&best.stats, "fireResPercent"), get_stat(&best.stats, "earthResPercent"),
        get_stat(&best.stats, "waterResPercent"), get_stat(&best.stats, "airResPercent"), get_stat(&best.stats, "neutralResPercent"),
        get_stat(&best.stats, "range"), get_stat(&best.stats, "strength"), get_stat(&best.stats, "earthDamage"),
    );
}

#[test]
#[ignore]
fn user_case_ap12_mp6_range6_hp5000_str1500_earthdmg200_resists40() {
    let items: Vec<CatalogItem> = serde_json::from_str(&std::fs::read_to_string("../public/data/en/equipment.json").unwrap()).unwrap();
    let sets: Vec<CatalogSet> = serde_json::from_str(&std::fs::read_to_string("../public/data/en/sets.json").unwrap()).unwrap();

    let config = OptimizerConfig {
        stats: vec![
            StatConfig { stat: "ap".into(), weight: 6, min_val: 12 },
            StatConfig { stat: "mp".into(), weight: 6, min_val: 6 },
            StatConfig { stat: "range".into(), weight: 6, min_val: 6 },
            StatConfig { stat: "maxHp".into(), weight: 6, min_val: 5000 },
            StatConfig { stat: "strength".into(), weight: 6, min_val: 1500 },
            StatConfig { stat: "earthDamage".into(), weight: 6, min_val: 200 },
            StatConfig { stat: "fireResPercent".into(), weight: 6, min_val: 40 },
            StatConfig { stat: "earthResPercent".into(), weight: 6, min_val: 40 },
            StatConfig { stat: "waterResPercent".into(), weight: 6, min_val: 40 },
            StatConfig { stat: "airResPercent".into(), weight: 6, min_val: 40 },
            StatConfig { stat: "neutralResPercent".into(), weight: 6, min_val: 20 },
        ],
        exo: ExoConfig { ap: false, mp: false, range: false },
        max_level: 200,
        locked_slots: vec![],
        assume_fully_scrolled: true,
    };
    let base = OptimizerBuildBase {
        level: 200,
        allocated: AllocatedCharacteristics::default(),
        scrolled: ScrolledCharacteristics::default(),
        equipped: HashMap::new(),
        runes: HashMap::new(),
    };

    let results = run_optimizer(config, items, sets, base);
    for (i, r) in results.iter().enumerate() {
        println!(
            "#{i}: score={:.0} meets_required={} ap={} mp={} range={} hp={} str={} earthDmg={} fireRes={} earthRes={} waterRes={} airRes={} neutralRes={}",
            r.score, r.meets_required,
            get_stat(&r.stats, "ap"), get_stat(&r.stats, "mp"), get_stat(&r.stats, "range"),
            get_stat(&r.stats, "maxHp"), get_stat(&r.stats, "strength"), get_stat(&r.stats, "earthDamage"),
            get_stat(&r.stats, "fireResPercent"), get_stat(&r.stats, "earthResPercent"),
            get_stat(&r.stats, "waterResPercent"), get_stat(&r.stats, "airResPercent"), get_stat(&r.stats, "neutralResPercent"),
        );
        let equipped: Vec<i64> = ALL_SLOTS.iter().filter_map(|s| r.equipped.get(*s).copied()).collect();
        println!("    equipped: {:?}", equipped);
    }
}
