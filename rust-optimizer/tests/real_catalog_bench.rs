// Not run by default: forges realistic requests against the real game
// catalog and validates every result against the exact compute_stats path.
// Run: cargo test --release --test real_catalog_bench -- --ignored --nocapture --test-threads 1
use dofus_forge_optimizer::forge::Forge;
use dofus_forge_optimizer::optimizer_types::{CatalogItem, CatalogSet, ExoConfig, OptimizerBuildBase, OptimizerConfig, StatConfig};
use dofus_forge_optimizer::stats::get_stat;
use std::collections::HashMap;
use std::time::Instant;

fn c(stat: &str, goal: i64, weight: i64, max: Option<i64>) -> StatConfig {
    StatConfig { stat: stat.to_string(), goal, weight, max, absolute: false }
}

struct Outcome {
    met: usize,
    total: usize,
    score: f64,
    secs: f64,
    gens: u64,
}

fn forge(label: &str, stats: Vec<StatConfig>, seed: u64, transcendence: bool, islands: usize, stall_limit: u64, cap_secs: f64) -> Outcome {
    forge_seeded(label, stats, seed, transcendence, islands, stall_limit, cap_secs, &[]).0
}

#[allow(clippy::too_many_arguments)]
fn forge_seeded(label: &str, stats: Vec<StatConfig>, seed: u64, transcendence: bool, islands: usize, stall_limit: u64, cap_secs: f64, seeds: &[HashMap<String, i64>]) -> (Outcome, Vec<HashMap<String, i64>>) {
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
        transcendence,
        islands,
    };
    let base = OptimizerBuildBase { level: 200, allocated: Default::default(), scrolled: Default::default(), equipped: HashMap::new(), runes: HashMap::new() };
    let start = Instant::now();
    let mut f = Forge::new(config, items, sets, base, seed);
    if !seeds.is_empty() {
        f.inject(seeds);
    }
    let clock = Instant::now();
    let now = || clock.elapsed().as_secs_f64() * 1000.0;
    let mut best = f.best_score();
    let mut stall = 0u64;
    while stall < stall_limit && start.elapsed().as_secs_f64() < cap_secs {
        f.run_generation();
        // Same periodic hammer pass the Worker runs.
        if f.generation() % 30 == 0 {
            f.temper(250.0, &now);
        }
        if f.best_score() > best + 1e-9 {
            best = f.best_score();
            stall = 0;
        } else {
            stall += 1;
        }
    }
    f.temper(3000.0, &now);
    let results = f.results();
    for r in &results {
        if let Err(e) = f.verify(r) {
            panic!("[{label}] verification failed: {e}");
        }
    }
    let r = &results[0];
    let values: Vec<String> = watched
        .iter()
        .map(|k| {
            let power = if ["strength", "intelligence", "chance", "agility"].contains(&k.as_str()) { r.stats.power } else { 0 };
            format!("{k}={}", get_stat(&r.stats, k) + power)
        })
        .collect();
    let secs = start.elapsed().as_secs_f64();
    println!(
        "[{label}] seed {seed} runes={transcendence} gens={} t={secs:.1}s met {}/{} score={:.0}\n    {}\n    runes {:?}\n    exo {:?}",
        f.generation(),
        r.requirements_met,
        r.requirements_total,
        r.score,
        values.join(" "),
        r.runes.iter().map(|(s, x)| format!("{s}:{}+{}", x.stat, x.value)).collect::<Vec<_>>(),
        r.exo
    );
    let carry: Vec<HashMap<String, i64>> = results.iter().map(|x| x.equipped.clone()).collect();
    (Outcome { met: r.requirements_met, total: r.requirements_total, score: r.score, secs, gens: f.generation() }, carry)
}

fn cases() -> Vec<(&'static str, Vec<StatConfig>)> {
    vec![
        ("earth", vec![
            c("ap", 12, 500, Some(12)), c("mp", 6, 500, Some(6)), c("range", 6, 250, Some(6)),
            c("vitality", 4000, 1, None), c("strength", 1000, 5, None), c("earthDamage", 150, 25, None),
            c("critChance", 40, 50, Some(100)),
        ]),
        ("eleven", vec![
            c("ap", 12, 500, Some(12)), c("mp", 6, 500, Some(6)), c("range", 6, 250, Some(6)),
            c("maxHp", 4500, 1, None), c("strength", 1500, 5, None), c("earthDamage", 100, 25, None),
            c("fireResPercent", 40, 30, Some(50)), c("earthResPercent", 40, 30, Some(50)), c("waterResPercent", 40, 30, Some(50)),
            c("airResPercent", 40, 30, Some(50)), c("neutralResPercent", 40, 30, Some(50)),
        ]),
        ("tank", vec![
            c("ap", 11, 500, Some(12)), c("mp", 6, 500, Some(6)), c("vitality", 5000, 1, None),
            c("fireResPercent", 45, 30, Some(50)), c("earthResPercent", 45, 30, Some(50)), c("waterResPercent", 45, 30, Some(50)),
            c("airResPercent", 45, 30, Some(50)), c("neutralResPercent", 45, 30, Some(50)),
        ]),
        ("agi-crit", vec![
            c("ap", 12, 500, Some(12)), c("mp", 6, 500, Some(6)), c("range", 5, 250, Some(6)),
            c("agility", 1100, 5, None), c("airDamage", 120, 25, None), c("critChance", 60, 50, Some(100)), c("critDamage", 60, 25, None),
        ]),
        ("wisdom", vec![
            c("ap", 11, 500, Some(12)), c("mp", 5, 500, Some(6)), c("wisdom", 600, 15, None),
            c("apReduction", 60, 35, None), c("vitality", 3500, 1, None),
        ]),
        ("multi", vec![
            c("ap", 12, 500, Some(12)), c("mp", 6, 500, Some(6)), c("intelligence", 800, 5, None),
            c("chance", 800, 5, None), c("fireDamage", 80, 25, None), c("waterDamage", 80, 25, None),
        ]),
    ]
}

#[test]
#[ignore]
fn validate_realistic_requests() {
    let mut summary = Vec::new();
    for (label, stats) in cases() {
        for seed in [1u64, 2] {
            let o = forge(label, stats.clone(), seed, true, 24, 150, 90.0);
            summary.push(format!("{label:<9} seed {seed}: {}/{} score {:>9.0} in {:>5.1}s ({} gens)", o.met, o.total, o.score, o.secs, o.gens));
        }
    }
    println!("\n==== summary ====\n{}", summary.join("\n"));
}

#[test]
#[ignore]
fn runes_change_the_outcome() {
    for (label, stats) in cases().into_iter().filter(|(l, _)| ["eleven", "tank"].contains(l)) {
        let without = forge(label, stats.clone(), 1, false, 24, 150, 90.0);
        let with = forge(label, stats, 1, true, 24, 150, 90.0);
        println!("{label}: without runes {}/{} ({:.0}) · with runes {}/{} ({:.0})", without.met, without.total, without.score, with.met, with.total, with.score);
    }
}


#[test]
#[ignore]
fn dispersion_across_seeds() {
    let stats = cases().into_iter().find(|(l, _)| *l == "eleven").unwrap().1;
    let mut scores: Vec<f64> = Vec::new();
    let mut met = Vec::new();
    for seed in 1..=6u64 {
        let o = forge("eleven", stats.clone(), seed, true, 24, 150, 60.0);
        scores.push(o.score);
        met.push(format!("{}/{}", o.met, o.total));
    }
    let mut sorted = scores.clone();
    sorted.sort_by(|a, b| a.partial_cmp(b).unwrap());
    println!("
==== dispersion (eleven, 6 seeds) ====
met {:?}
scores {:?}
min {:.0} median {:.0} max {:.0} spread {:.1}%", met, scores, sorted[0], sorted[3], sorted[5], (sorted[5] - sorted[0]) / sorted[5] * 100.0);
}

#[test]
#[ignore]
fn forging_again_never_gets_worse() {
    let stats = cases().into_iter().find(|(l, _)| *l == "eleven").unwrap().1;
    let (first, carry) = forge_seeded("eleven-1", stats.clone(), 7, true, 24, 100, 40.0, &[]);
    let (second, carry2) = forge_seeded("eleven-2", stats.clone(), 8, true, 24, 100, 40.0, &carry);
    let (third, _) = forge_seeded("eleven-3", stats, 9, true, 24, 100, 40.0, &carry2);
    println!("
==== chained forging ====
{:.0} -> {:.0} -> {:.0}", first.score, second.score, third.score);
    assert!(second.score >= first.score - 1e-6 && third.score >= second.score - 1e-6);
}
