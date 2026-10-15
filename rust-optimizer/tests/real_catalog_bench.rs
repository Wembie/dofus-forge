// Not run by default: forges realistic requests against the real game
// catalog and validates every result against the exact compute_stats path.
// Run: cargo test --release --test real_catalog_bench -- --ignored --nocapture --test-threads 1
use dofus_forge_optimizer::forge::Forge;
use dofus_forge_optimizer::optimizer_types::{BuildResult, CatalogItem, CatalogSet, ExoConfig, OptimizerBuildBase, OptimizerConfig, StatConfig};
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
        prune: std::env::var("FORGE_PRUNE").map(|v| v != "0").unwrap_or(true),
    };
    let base = OptimizerBuildBase { level: 200, allocated: Default::default(), scrolled: Default::default(), equipped: HashMap::new(), runes: HashMap::new() };
    let start = Instant::now();
    let mut f = Forge::new(config, items, sets, base, seed);
    if let Some(stall) = std::env::var("FORGE_STALL").ok().and_then(|v| v.parse().ok()) {
        f.set_stagnation_reset(stall);
    }
    f.set_settle_tempered(std::env::var("FORGE_SETTLE").map(|v| v == "1").unwrap_or(false));
    if let Some(bias) = std::env::var("FORGE_BIAS").ok().and_then(|v| v.parse().ok()) {
        f.set_set_rank_bias(bias);
    }
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

// The order from a user report: stuck at 10/11 with % Air Resistance 39/40.
fn screenshot_order() -> Vec<StatConfig> {
    vec![
        c("ap", 12, 500, Some(12)), c("mp", 6, 500, Some(6)), c("range", 6, 250, Some(6)),
        c("maxHp", 5000, 1, None), c("strength", 1350, 5, None), c("earthDamage", 180, 25, None),
        c("fireResPercent", 40, 30, Some(50)), c("earthResPercent", 40, 30, Some(50)), c("waterResPercent", 40, 30, Some(50)),
        c("airResPercent", 40, 30, Some(50)), c("neutralResPercent", 20, 30, Some(50)),
    ]
}

fn forge_variant(label: &str, transcendence: bool, scrolled: bool, seed: u64, secs: f64) {
    let items: Vec<CatalogItem> = serde_json::from_str(&std::fs::read_to_string("../public/data/en/equipment.json").unwrap()).unwrap();
    let sets: Vec<CatalogSet> = serde_json::from_str(&std::fs::read_to_string("../public/data/en/sets.json").unwrap()).unwrap();
    let config = OptimizerConfig {
        stats: screenshot_order(),
        exo: ExoConfig { ap: true, mp: true, range: true, only_on_ring: true, max_count: 2 },
        max_level: 200, locked_slots: vec![], assume_fully_scrolled: scrolled,
        banned_items: vec![], banned_types: vec![], transcendence, islands: 24, prune: true,
    };
    let base = OptimizerBuildBase { level: 200, allocated: Default::default(), scrolled: Default::default(), equipped: HashMap::new(), runes: HashMap::new() };
    let clock = Instant::now();
    let now = || clock.elapsed().as_secs_f64() * 1000.0;
    let mut f = Forge::new(config, items, sets, base, seed);
    let mut first_full: Option<f64> = None;
    while clock.elapsed().as_secs_f64() < secs {
        f.run_generation();
        if f.generation() % 30 == 0 {
            f.temper(250.0, &now);
        }
        if first_full.is_none() && f.best_score() >= 0.0 {
            first_full = Some(clock.elapsed().as_secs_f64());
        }
    }
    f.temper(3000.0, &now);
    let r = &f.results()[0];
    f.verify(r).unwrap();
    let res: Vec<String> = ["fireResPercent", "earthResPercent", "waterResPercent", "airResPercent", "neutralResPercent"].iter().map(|k| format!("{}", get_stat(&r.stats, k))).collect();
    println!(
        "[{label}] seed {seed}: met {}/{} score {:.0} | all met at {:?}s | res {} | hp {} str {} earth {} | runes {}",
        r.requirements_met, r.requirements_total, r.score, first_full.map(|x| (x * 10.0).round() / 10.0), res.join("/"),
        get_stat(&r.stats, "maxHp"), get_stat(&r.stats, "strength") + r.stats.power, get_stat(&r.stats, "earthDamage"), r.runes.len()
    );
}

#[test]
#[ignore]
fn user_screenshot_case() {
    for (label, runes, scrolled) in [("runes+scrolls", true, true), ("runes, no scrolls", true, false), ("no runes+scrolls", false, true), ("no runes, no scrolls", false, false)] {
        for seed in [1u64, 2] {
            forge_variant(label, runes, scrolled, seed, 60.0);
        }
    }
}

// The user's known optimum for screenshot_order (no transcendence runes,
// fully scrolled, exo AP + MP on the rings).
fn user_optimum() -> HashMap<String, i64> {
    let ids = [34327, 14168, 34329, 14077, 32234, 19983, 14078, 32235, 32236, 33035, 0, 7043, 7115, 7754, 21996, 694, 29136];
    let slots = ["hat", "cape", "amulet", "ring1", "ring2", "belt", "boots", "weapon", "shield", "companion", "sidekick", "dofus1", "dofus2", "dofus3", "dofus4", "dofus5", "dofus6"];
    slots.iter().zip(ids).filter(|(_, id)| *id != 0).map(|(s, id)| (s.to_string(), id)).collect()
}

fn screenshot_forge(seed: u64, transcendence: bool, islands: usize) -> Forge {
    let items: Vec<CatalogItem> = serde_json::from_str(&std::fs::read_to_string("../public/data/en/equipment.json").unwrap()).unwrap();
    let sets: Vec<CatalogSet> = serde_json::from_str(&std::fs::read_to_string("../public/data/en/sets.json").unwrap()).unwrap();
    let config = OptimizerConfig {
        stats: screenshot_order(),
        exo: ExoConfig { ap: true, mp: true, range: true, only_on_ring: true, max_count: 2 },
        max_level: 200, locked_slots: vec![], assume_fully_scrolled: true,
        banned_items: vec![], banned_types: vec![], transcendence, islands, prune: true,
    };
    let base = OptimizerBuildBase { level: 200, allocated: Default::default(), scrolled: Default::default(), equipped: HashMap::new(), runes: HashMap::new() };
    Forge::new(config, items, sets, base, seed)
}

#[test]
#[ignore]
fn assess_user_optimum() {
    let f = screenshot_forge(1, false, 1);
    let (r, unreachable) = f.assess(&user_optimum());
    println!("unreachable: {:?}", unreachable);
    let r = r.expect("valid build");
    println!("optimum: met {}/{} score {} exo {:?} alloc {:?}", r.requirements_met, r.requirements_total, r.score, r.exo, r.allocated);
}

#[test]
#[ignore]
fn hit_rate_on_user_optimum() {
    let target = {
        let f = screenshot_forge(1, false, 1);
        f.assess(&user_optimum()).0.unwrap().score
    };
    let mut hits = 0;
    let runs: u64 = std::env::var("FORGE_SEEDS").ok().and_then(|v| v.parse().ok()).unwrap_or(8);
    let secs: f64 = std::env::var("FORGE_SECS").ok().and_then(|v| v.parse().ok()).unwrap_or(60.0);
    let stall: Option<u32> = std::env::var("FORGE_STALL").ok().and_then(|v| v.parse().ok());
    let islands: usize = std::env::var("FORGE_ISLANDS").ok().and_then(|v| v.parse().ok()).unwrap_or(24);
    let settle = std::env::var("FORGE_SETTLE").map(|v| v == "1").unwrap_or(false);
    println!("islands {islands} settle {settle}");
    for seed in 1..=runs {
        let mut f = screenshot_forge(seed, false, islands);
        f.set_settle_tempered(settle);
        if let Some(stall) = stall {
            f.set_stagnation_reset(stall);
        }
        let clock = Instant::now();
        let now = || clock.elapsed().as_secs_f64() * 1000.0;
        let mut reached_at = None;
        while clock.elapsed().as_secs_f64() < secs {
            f.run_generation();
            if f.generation() % 30 == 0 {
                f.temper(250.0, &now);
            }
            if reached_at.is_none() && f.best_score() >= target - 1e-6 {
                reached_at = Some(clock.elapsed().as_secs_f64());
            }
        }
        f.temper(3000.0, &now);
        let best = f.best_score();
        if best >= target - 1e-6 {
            hits += 1;
        }
        println!("seed {seed}: best {best:.0} vs optimum {target:.0} reached at {:?}s gens {}", reached_at.map(|x| (x * 10.0).round() / 10.0), f.generation());
    }
    println!("==== hit rate {hits}/{runs} ====");
}

#[test]
#[ignore]
fn diff_stuck_vs_optimum() {
    let items: Vec<CatalogItem> = serde_json::from_str(&std::fs::read_to_string("../public/data/en/equipment.json").unwrap()).unwrap();
    let names: HashMap<i64, String> = items.iter().map(|i| (i.ankama_id, i.name.clone())).collect();
    let opt = user_optimum();
    for seed in [2u64, 1] {
        let mut f = screenshot_forge(seed, false, 24);
        let clock = Instant::now();
        let now = || clock.elapsed().as_secs_f64() * 1000.0;
        while clock.elapsed().as_secs_f64() < 20.0 {
            f.run_generation();
            if f.generation() % 30 == 0 {
                f.temper(250.0, &now);
            }
        }
        let r = &f.results()[0];
        let mut diff: Vec<String> = Vec::new();
        for slot in ["hat", "cape", "amulet", "ring1", "ring2", "belt", "boots", "weapon", "shield", "companion", "dofus1", "dofus2", "dofus3", "dofus4", "dofus5", "dofus6"] {
            let a = r.equipped.get(slot).map(|i| names[i].clone()).unwrap_or_default();
            let b = opt.get(slot).map(|i| names[i].clone()).unwrap_or_default();
            if a != b {
                diff.push(format!("{slot}: {a} | optimum: {b}"));
            }
        }
        println!("seed {seed}: score {} met {}/{} alloc {:?} exo {:?}", r.score, r.requirements_met, r.requirements_total, r.allocated, r.exo);
        for d in diff { println!("   {d}"); }
    }
}

// Same setup as the browser: several Workers running in parallel, each with
// its share of the islands, trading emigrants in a ring every 41 generations.
#[test]
#[ignore]
fn hit_rate_parallel_like_browser() {
    use std::sync::{Arc, Barrier, Mutex};
    let workers: usize = std::env::var("FORGE_WORKERS").ok().and_then(|v| v.parse().ok()).unwrap_or(4);
    let secs: f64 = std::env::var("FORGE_SECS").ok().and_then(|v| v.parse().ok()).unwrap_or(60.0);
    let runs: u64 = std::env::var("FORGE_SEEDS").ok().and_then(|v| v.parse().ok()).unwrap_or(8);
    let runes = std::env::var("FORGE_RUNES").map(|v| v == "1").unwrap_or(false);
    let target = screenshot_forge(1, runes, 1).assess(&user_optimum()).0.unwrap().score;
    let islands: usize = std::env::var("FORGE_ISLANDS_PER_WORKER").ok().and_then(|v| v.parse().ok()).unwrap_or(96usize.div_ceil(workers));
    println!("workers {workers} x {islands} islands, {secs}s, runes {runes}, target {target}");
    let mut hits = 0;
    for seed in 1..=runs {
        let barrier = Arc::new(Barrier::new(workers));
        let mailbox: Arc<Mutex<Vec<Vec<HashMap<String, i64>>>>> = Arc::new(Mutex::new(vec![Vec::new(); workers]));
        let found = Arc::new(Mutex::new((f64::NEG_INFINITY, None::<f64>)));
        let start = Instant::now();
        std::thread::scope(|scope| {
            for w in 0..workers {
                let (barrier, mailbox, found) = (barrier.clone(), mailbox.clone(), found.clone());
                scope.spawn(move || {
                    let mut f = screenshot_forge(seed * 100 + w as u64, runes, islands);
                    let now = || start.elapsed().as_secs_f64() * 1000.0;
                    let mut round = 0u64;
                    loop {
                        round += 1;
                        while f.generation() < round * 41 {
                            f.run_generation();
                            if f.generation() % 30 == 0 {
                                f.temper(250.0, &now);
                            }
                        }
                        {
                            let mut g = found.lock().unwrap();
                            if f.best_score() > g.0 {
                                g.0 = f.best_score();
                            }
                            if g.1.is_none() && f.best_score() >= target - 1e-6 {
                                g.1 = Some(start.elapsed().as_secs_f64());
                            }
                        }
                        mailbox.lock().unwrap()[(w + 1) % workers] = f.emigrants();
                        barrier.wait();
                        let incoming = std::mem::take(&mut mailbox.lock().unwrap()[w]);
                        f.inject(&incoming);
                        let done = start.elapsed().as_secs_f64() >= secs;
                        barrier.wait();
                        if done {
                            break;
                        }
                    }
                });
            }
        });
        let (best, at) = *found.lock().unwrap();
        if best >= target - 1e-6 {
            hits += 1;
        }
        println!("seed {seed}: best {best:.0} vs optimum {target:.0} reached at {:?}s", at.map(|x| (x * 10.0).round() / 10.0));
    }
    println!("==== parallel hit rate {hits}/{runs} ====");
}

// earth and multi with the browser's Standard stop rule (>= 60 s, 400 stall).

#[test]
#[ignore]
fn assess_user_optimum_with_runes_and_throughput() {
    for runes in [false, true] {
        let mut f = screenshot_forge(1, runes, 24);
        let (r, _) = f.assess(&user_optimum());
        let r = r.unwrap();
        println!("runes {runes}: optimum items score {} met {}/{} runes {:?}", r.score, r.requirements_met, r.requirements_total, r.runes.iter().map(|(s, x)| format!("{s}:{}+{}", x.stat, x.value)).collect::<Vec<_>>());
        let start = Instant::now();
        let before = f.report().evaluations;
        for _ in 0..20 { f.run_generation(); }
        let evals = f.report().evaluations - before;
        println!("runes {runes}: {:.0} evaluations/s single thread", evals as f64 / start.elapsed().as_secs_f64());
    }
}

#[test]
#[ignore]
fn diff_runes_basins() {
    let items: Vec<CatalogItem> = serde_json::from_str(&std::fs::read_to_string("../public/data/en/equipment.json").unwrap()).unwrap();
    let names: HashMap<i64, String> = items.iter().map(|i| (i.ankama_id, i.name.clone())).collect();
    let mut found: Vec<BuildResult> = Vec::new();
    for seed in 1..=12u64 {
        let mut f = screenshot_forge(seed, true, 24);
        let clock = Instant::now();
        let now = || clock.elapsed().as_secs_f64() * 1000.0;
        while clock.elapsed().as_secs_f64() < 15.0 {
            f.run_generation();
            if f.generation() % 30 == 0 { f.temper(250.0, &now); }
        }
        let r = f.results()[0].clone();
        println!("seed {seed}: {}", r.score);
        if found.iter().all(|x| (x.score - r.score).abs() > 1e-6) { found.push(r); }
        if found.iter().any(|x| x.score > 1600.0) && found.iter().any(|x| x.score < 1600.0) { break; }
    }
    found.sort_by(|a, b| b.score.partial_cmp(&a.score).unwrap());
    for r in &found {
        let mut slots: Vec<String> = r.equipped.iter().map(|(s, id)| format!("{s}={}{}", names[id], r.runes.get(s).map(|x| format!(" [{}+{}]", x.stat, x.value)).unwrap_or_default())).collect();
        slots.sort();
        println!("== {} alloc {:?} exo {:?}", r.score, r.allocated, r.exo);
        for x in slots { println!("   {x}"); }
    }
}

// Second user report: same 11 minimums plus neutral damage 180, all leys at
// the default (3/5); the user's order also weights wisdom, intelligence,
// water and fire damage. Compares the other solver's build with ours.
fn case2_order(extra_stats: bool) -> Vec<StatConfig> {
    let mut v = vec![
        c("ap", 12, 500, Some(12)), c("mp", 6, 500, Some(6)), c("range", 6, 250, Some(6)),
        c("maxHp", 5000, 1, None), c("strength", 1350, 5, None), c("earthDamage", 180, 25, None), c("neutralDamage", 180, 25, None),
        c("fireResPercent", 40, 30, Some(50)), c("earthResPercent", 40, 30, Some(50)), c("waterResPercent", 40, 30, Some(50)),
        c("airResPercent", 40, 30, Some(50)), c("neutralResPercent", 20, 30, Some(50)),
    ];
    if extra_stats {
        v.extend([c("wisdom", 0, 15, None), c("intelligence", 0, 5, None), c("waterDamage", 0, 25, None), c("fireDamage", 0, 25, None)]);
    }
    v
}

fn case2_forge(extra: bool, seed: u64, islands: usize) -> Forge {
    let items: Vec<CatalogItem> = serde_json::from_str(&std::fs::read_to_string("../public/data/en/equipment.json").unwrap()).unwrap();
    let sets: Vec<CatalogSet> = serde_json::from_str(&std::fs::read_to_string("../public/data/en/sets.json").unwrap()).unwrap();
    let config = OptimizerConfig {
        stats: case2_order(extra),
        exo: ExoConfig { ap: true, mp: true, range: true, only_on_ring: true, max_count: 2 },
        max_level: 200, locked_slots: vec![], assume_fully_scrolled: true,
        banned_items: vec![], banned_types: vec![], transcendence: true, islands, prune: true,
    };
    let base = OptimizerBuildBase { level: 200, allocated: Default::default(), scrolled: Default::default(), equipped: HashMap::new(), runes: HashMap::new() };
    Forge::new(config, items, sets, base, seed)
}

fn equip(slots: &[(&str, i64)]) -> HashMap<String, i64> {
    slots.iter().map(|(s, id)| (s.to_string(), *id)).collect()
}

#[test]
#[ignore]
fn compare_case2_builds() {
    let other = equip(&[("hat", 34327), ("cape", 14168), ("amulet", 34329), ("ring1", 14077), ("ring2", 32234), ("belt", 19983), ("boots", 14078),
        ("weapon", 32235), ("shield", 32236), ("companion", 33035), ("dofus1", 21996), ("dofus2", 7043), ("dofus3", 29136), ("dofus4", 7754), ("dofus5", 13777), ("dofus6", 13834)]);
    let ours = equip(&[("hat", 34327), ("cape", 14168), ("amulet", 34329), ("ring1", 15190), ("ring2", 32234), ("belt", 19983), ("boots", 15191),
        ("weapon", 32235), ("shield", 32236), ("companion", 33044), ("dofus1", 21998), ("dofus2", 7754), ("dofus3", 694), ("dofus4", 7043), ("dofus5", 13777), ("dofus6", 7115)]);
    // The user's later run of the same order (Harebourg family, like the
    // other solver's, with Shiny Pryssure).
    let latest = equip(&[("hat", 34327), ("cape", 14168), ("amulet", 34329), ("ring1", 32234), ("ring2", 14077), ("belt", 19983), ("boots", 14078),
        ("weapon", 32235), ("shield", 32236), ("companion", 33035), ("dofus1", 21997), ("dofus2", 7115), ("dofus3", 29136), ("dofus4", 13777), ("dofus5", 7043), ("dofus6", 7754)]);
    for extra in [true, false] {
        let f = case2_forge(extra, 1, 1);
        for (label, build) in [("other solver", &other), ("ours", &ours), ("latest", &latest)] {
            let (r, unreachable) = f.assess(build);
            let r = r.unwrap();
            println!("order extra={extra} {label}: score {:.0} met {}/{} alloc {:?} unreachable {:?}", r.score, r.requirements_met, r.requirements_total, r.allocated, unreachable);
        }
    }
}
