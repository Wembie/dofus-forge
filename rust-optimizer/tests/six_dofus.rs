use dofus_forge_optimizer::forge::Forge;
use dofus_forge_optimizer::optimizer_types::{
    CatalogItem, CatalogSet, ExoConfig, OptimizerBuildBase, OptimizerConfig, StatConfig,
};
use dofus_forge_optimizer::types::ItemEffect;
use std::collections::{HashMap, HashSet};

const DOFUS_SLOTS: [&str; 6] = ["dofus1", "dofus2", "dofus3", "dofus4", "dofus5", "dofus6"];

fn item(id: i64, slot: &str, item_type: &str, vitality: i64) -> CatalogItem {
    CatalogItem {
        ankama_id: id,
        name: format!("Item {id}"),
        level: 1,
        item_type: item_type.to_string(),
        slot: slot.to_string(),
        effects: vec![ItemEffect {
            stat: "Vitality".to_string(),
            min: vitality,
            max: 0,
            effect_id: None,
        }],
        conditions: None,
        set_id: None,
    }
}

fn catalog() -> Vec<CatalogItem> {
    let mut items = vec![
        item(1, "hat", "Hat", 10),
        item(2, "hat", "Hat", 300),
        item(10, "dofus", "Prysmaradite", 10),
    ];
    for id in 11..16 {
        items.push(item(id, "dofus", "Dofus", id));
    }
    items
}

fn config(open_slots: &[&str], required_items: Vec<i64>) -> OptimizerConfig {
    let all_slots = [
        "hat", "cape", "amulet", "ring1", "ring2", "belt", "boots", "weapon", "shield",
        "companion", "sidekick", "dofus1", "dofus2", "dofus3", "dofus4", "dofus5", "dofus6",
    ];
    OptimizerConfig {
        stats: vec![StatConfig {
            stat: "vitality".to_string(),
            goal: 0,
            weight: 1,
            max: None,
            absolute: false,
        }],
        exo: ExoConfig {
            ap: false,
            mp: false,
            range: false,
            only_on_ring: true,
            max_count: 0,
        },
        max_level: 200,
        locked_slots: all_slots
            .iter()
            .filter(|slot| !open_slots.contains(slot))
            .map(|slot| slot.to_string())
            .collect(),
        assume_fully_scrolled: false,
        banned_items: vec![],
        banned_types: vec![],
        required_items,
        transcendence: false,
        islands: 4,
        prune: true,
    }
}

fn base(equipped: HashMap<String, i64>) -> OptimizerBuildBase {
    OptimizerBuildBase {
        level: 1,
        allocated: Default::default(),
        scrolled: Default::default(),
        equipped,
        runes: HashMap::new(),
    }
}

fn run_forge(config: OptimizerConfig, base: OptimizerBuildBase, seed: u64) {
    let mut forge = Forge::new(config, catalog(), Vec::<CatalogSet>::new(), base, seed);
    for _ in 0..5 {
        forge.run_generation();
    }

    let results = forge.results();
    assert!(!results.is_empty());
    for result in results {
        forge.verify(&result).unwrap();
        let dofus: HashSet<i64> = DOFUS_SLOTS
            .iter()
            .filter_map(|slot| result.equipped.get(*slot).copied())
            .collect();
        assert_eq!(dofus, HashSet::from([10, 11, 12, 13, 14, 15]));
        assert_eq!(result.equipped.get("hat"), Some(&2));
    }
}

#[test]
fn six_required_dofus_leave_other_slots_searchable() {
    let open = ["hat", "dofus1", "dofus2", "dofus3", "dofus4", "dofus5", "dofus6"];
    run_forge(config(&open, (10..16).collect()), base(HashMap::new()), 11);
}

#[test]
fn six_locked_dofus_leave_other_slots_searchable() {
    let open = ["hat"];
    let equipped = DOFUS_SLOTS
        .iter()
        .enumerate()
        .map(|(index, slot)| (slot.to_string(), 10 + index as i64))
        .collect();
    run_forge(config(&open, vec![]), base(equipped), 12);
}
