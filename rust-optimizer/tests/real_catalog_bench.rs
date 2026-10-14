// Not run by default: searches the real game catalog to measure speed and
// result quality on demanding requests.
// Run: cargo test --release --test real_catalog_bench -- --ignored --nocapture
use dofus_forge_optimizer::optimizer_types::{CatalogItem, CatalogSet, ExoConfig, OptimizerBuildBase, OptimizerConfig, StatConfig};
use dofus_forge_optimizer::solver::Solver;
use dofus_forge_optimizer::stats::get_stat;
use std::collections::HashMap;
use std::time::Instant;

fn cond(stat: &str, goal: i64, weight: i64, max: Option<i64>) -> StatConfig {
    StatConfig { stat: stat.to_string(), goal, weight, max, absolute: false }
}

fn run(label: &str, stats: Vec<StatConfig>, generations: u64, seed: u64) {
    let items: Vec<CatalogItem> = serde_json::from_str(&std::fs::read_to_string("../public/data/en/equipment.json").unwrap()).unwrap();
    let sets: Vec<CatalogSet> = serde_json::from_str(&std::fs::read_to_string("../public/data/en/sets.json").unwrap()).unwrap();
    let watched: Vec<String> = stats.iter().map(|s| s.stat.clone()).collect();
    let config = OptimizerConfig {
        stats,
        exo: ExoConfig { ap: true, mp: true, range: true, only_on_ring: true, max_count: 2 },
        max_level: 200,
        locked_slots: vec![],
        assume_fully_scrolled: true,
        banned_items: vec![],
        banned_types: vec![],
    };
    let base = OptimizerBuildBase { level: 200, allocated: Default::default(), scrolled: Default::default(), equipped: HashMap::new(), runes: HashMap::new() };
    let start = Instant::now();
    let mut solver = Solver::new(config, items, sets, base, seed);
    println!("[{label}] init {:?}", start.elapsed());
    for g in 1..=generations {
        solver.run_generation();
        if g % 100 == 0 || g == generations {
            println!("[{label}] gen {g:>5} t={:>6.1}s best={:.0}", start.elapsed().as_secs_f64(), solver.best_score());
        }
    }
    let best = &solver.results()[0];
    let values: Vec<String> = watched.iter().map(|k| format!("{k}={}", get_stat(&best.stats, k))).collect();
    println!("[{label}] met {}/{} {}", best.requirements_met, best.requirements_total, values.join(" "));
    println!("[{label}] exo {:?} alloc {:?}", best.exo, best.allocated);
}

#[test]
#[ignore]
fn earth_damage_dealer() {
    run(
        "earth",
        vec![
            cond("ap", 12, 500, Some(12)),
            cond("mp", 6, 500, Some(6)),
            cond("range", 6, 250, Some(6)),
            cond("vitality", 4000, 1, None),
            cond("strength", 1000, 5, None),
            cond("earthDamage", 150, 25, None),
            cond("critChance", 40, 50, Some(100)),
        ],
        600,
        1,
    );
}

#[test]
#[ignore]
fn eleven_requirements() {
    run(
        "eleven",
        vec![
            cond("ap", 12, 500, Some(12)),
            cond("mp", 6, 500, Some(6)),
            cond("range", 6, 250, Some(6)),
            cond("maxHp", 4500, 1, None),
            cond("strength", 1500, 5, None),
            cond("earthDamage", 100, 25, None),
            cond("fireResPercent", 40, 30, Some(50)),
            cond("earthResPercent", 40, 30, Some(50)),
            cond("waterResPercent", 40, 30, Some(50)),
            cond("airResPercent", 40, 30, Some(50)),
            cond("neutralResPercent", 40, 30, Some(50)),
        ],
        600,
        1,
    );
}
