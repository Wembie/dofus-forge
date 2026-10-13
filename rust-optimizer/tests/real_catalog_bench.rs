// Not run by default `cargo test` (see #[ignore]) — this hits the real,
// full game catalog (~thousands of items, ~hundreds of sets) rather than a
// small synthetic fixture, specifically to confirm (a) the phase 2.75
// (quads) addition doesn't blow the deadline-gated time budget on real data,
// and (b) the search never returns an equip-condition-violating build as
// its best result — caught for real on this exact catalog: a demanding
// multi-stat request kept returning a build equipping both "Miracle Man"
// Trophies (each conditioned on "no other set bonus active") alongside a
// real multi-piece set, which the game disallows. Fixed by
// repair_trophy_set_conflict (see its doc comment in src/optimizer.rs).
// Run explicitly: `cargo test --release --test real_catalog_bench -- --ignored --nocapture`
use dofus_forge_optimizer::optimizer::{run_optimizer, ALL_SLOTS};
use dofus_forge_optimizer::optimizer_types::{CatalogItem, CatalogSet, ExoConfig, OptimizerBuildBase, OptimizerConfig, StatConfig};
use dofus_forge_optimizer::types::{AllocatedCharacteristics, ScrolledCharacteristics};
use std::collections::HashMap;
use std::time::Instant;

#[test]
#[ignore]
fn real_catalog_stays_within_time_budget_with_quads_phase() {
    let items_json = std::fs::read_to_string("../public/data/en/equipment.json").expect("read equipment.json");
    let sets_json = std::fs::read_to_string("../public/data/en/sets.json").expect("read sets.json");
    let items: Vec<CatalogItem> = serde_json::from_str(&items_json).expect("parse equipment.json");
    let sets: Vec<CatalogSet> = serde_json::from_str(&sets_json).expect("parse sets.json");
    println!("catalog: {} items, {} sets", items.len(), sets.len());

    // A demanding, multi-stat config — several weighted stats plus full exo,
    // the kind of request that forces the search to actually work for its
    // answer instead of trivially satisfying a single easy target.
    let config = OptimizerConfig {
        stats: vec![
            StatConfig { stat: "vitality".into(), weight: 8, min_val: 0 },
            StatConfig { stat: "strength".into(), weight: 10, min_val: 0 },
            StatConfig { stat: "damage".into(), weight: 6, min_val: 0 },
            StatConfig { stat: "criticalHit".into(), weight: 4, min_val: 0 },
        ],
        exo: ExoConfig { ap: true, mp: true, range: true },
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

    let start = Instant::now();
    let results = run_optimizer(config, items, sets, base);
    let elapsed = start.elapsed();

    println!("elapsed: {:.2}s", elapsed.as_secs_f64());
    println!("results: {}", results.len());
    for (i, r) in results.iter().enumerate() {
        let equipped_count = ALL_SLOTS.iter().filter(|s| r.equipped.contains_key(**s)).count();
        println!("  #{i}: score={:.1} meets_required={} conditions_ok={} slots_equipped={equipped_count}", r.score, r.meets_required, r.conditions_ok);
    }

    // Diagnostic: which equipped item(s) fail their own condition, and why.
    if let Some(best) = results.first() {
        if !best.conditions_ok {
            let item_map: HashMap<i64, &CatalogItem> = {
                // re-read items since `items` was moved into run_optimizer
                let items_json2 = std::fs::read_to_string("../public/data/en/equipment.json").unwrap();
                let items2: Vec<CatalogItem> = serde_json::from_str(&items_json2).unwrap();
                Box::leak(Box::new(items2)).iter().map(|it| (it.ankama_id, it)).collect()
            };
            for slot in ALL_SLOTS {
                if let Some(&id) = best.equipped.get(slot) {
                    if let Some(it) = item_map.get(&id) {
                        if let Some(conds) = &it.conditions {
                            for c in conds {
                                println!("  slot={slot} item={} ({id}) condition: {} {} {}", it.name, c.stat, c.operator, c.value);
                            }
                        }
                    }
                }
            }
            println!("  final stats: {:?}", best.stats);
        }
    }

    assert!(!results.is_empty(), "expected at least one result");
    assert!(results[0].conditions_ok, "best result equips an item whose own equip conditions aren't met — see the diagnostic above");
    // The worker's own 60s TIME_BUDGET_MS is the hard ceiling hill-climbing
    // respects; allow generous slack above it for test-machine variance
    // before calling this a real regression.
    assert!(elapsed.as_secs_f64() < 90.0, "optimizer took {:.1}s, over budget", elapsed.as_secs_f64());
}
