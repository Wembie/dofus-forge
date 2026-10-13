// Not run by default (#[ignore]) — validates, against the REAL catalog,
// that changing which stat is weighted actually changes which items get
// equipped and which stat ends up maximized. Written in response to a
// report that priority weights "aren't being taken into account" in the
// live app — this proves (or disproves) that with concrete real-catalog
// evidence instead of re-reading the scoring code and assuming it's fine.
// Run explicitly: `cargo test --release --test weight_respects_priority -- --ignored --nocapture`
use dofus_forge_optimizer::optimizer::run_optimizer;
use dofus_forge_optimizer::optimizer_types::{CatalogItem, CatalogSet, ExoConfig, OptimizerBuildBase, OptimizerConfig, StatConfig};
use dofus_forge_optimizer::types::{AllocatedCharacteristics, ScrolledCharacteristics};
use std::collections::HashMap;

fn run_single_stat(stat: &str, items: &[CatalogItem], sets: &[CatalogSet]) -> dofus_forge_optimizer::optimizer_types::BuildResult {
    let config = OptimizerConfig {
        stats: vec![StatConfig { stat: stat.to_string(), weight: 10, min_val: 0 }],
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
    run_optimizer(config, items.to_vec(), sets.to_vec(), base).into_iter().next().unwrap()
}

#[test]
#[ignore]
fn weighting_a_different_stat_changes_the_result() {
    let items: Vec<CatalogItem> = serde_json::from_str(&std::fs::read_to_string("../public/data/en/equipment.json").unwrap()).unwrap();
    let sets: Vec<CatalogSet> = serde_json::from_str(&std::fs::read_to_string("../public/data/en/sets.json").unwrap()).unwrap();

    let vit = run_single_stat("vitality", &items, &sets);
    let str_ = run_single_stat("strength", &items, &sets);
    let agi = run_single_stat("agility", &items, &sets);

    use dofus_forge_optimizer::stats::get_stat;
    println!("vitality-weighted build: vitality={} strength={} agility={}", get_stat(&vit.stats, "vitality"), get_stat(&vit.stats, "strength"), get_stat(&vit.stats, "agility"));
    println!("strength-weighted build: vitality={} strength={} agility={}", get_stat(&str_.stats, "vitality"), get_stat(&str_.stats, "strength"), get_stat(&str_.stats, "agility"));
    println!("agility-weighted  build: vitality={} strength={} agility={}", get_stat(&agi.stats, "vitality"), get_stat(&agi.stats, "strength"), get_stat(&agi.stats, "agility"));

    let equipped_diff = |a: &HashMap<String, i64>, b: &HashMap<String, i64>| -> usize {
        dofus_forge_optimizer::optimizer::ALL_SLOTS.iter().filter(|s| a.get(**s) != b.get(**s)).count()
    };
    println!("slots differing vit vs str: {}", equipped_diff(&vit.equipped, &str_.equipped));
    println!("slots differing str vs agi: {}", equipped_diff(&str_.equipped, &agi.equipped));
    println!("slots differing vit vs agi: {}", equipped_diff(&vit.equipped, &agi.equipped));

    // Each build should maximize the stat IT was weighted for, strictly more
    // than the builds weighted for a different stat — proving the weight
    // actually drove the item selection, not just "the search picked
    // something and happened to call it done".
    assert!(get_stat(&vit.stats, "vitality") > get_stat(&str_.stats, "vitality"), "vitality-weighted build should beat strength-weighted on vitality");
    assert!(get_stat(&vit.stats, "vitality") > get_stat(&agi.stats, "vitality"), "vitality-weighted build should beat agility-weighted on vitality");
    assert!(get_stat(&str_.stats, "strength") > get_stat(&vit.stats, "strength"), "strength-weighted build should beat vitality-weighted on strength");
    assert!(get_stat(&str_.stats, "strength") > get_stat(&agi.stats, "strength"), "strength-weighted build should beat agility-weighted on strength");
    assert!(get_stat(&agi.stats, "agility") > get_stat(&vit.stats, "agility"), "agility-weighted build should beat vitality-weighted on agility");
    assert!(get_stat(&agi.stats, "agility") > get_stat(&str_.stats, "agility"), "agility-weighted build should beat strength-weighted on agility");

    assert!(equipped_diff(&vit.equipped, &str_.equipped) > 0, "vitality- and strength-weighted builds equipped identical gear — weights had no effect");
    assert!(equipped_diff(&str_.equipped, &agi.equipped) > 0, "strength- and agility-weighted builds equipped identical gear — weights had no effect");
}
