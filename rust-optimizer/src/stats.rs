// Mirrors src/engine/stats.ts exactly — same formulas, same order of
// operations, same hard caps. Re-sync by hand if stats.ts changes.

use crate::characteristics::{point_cost, stat_budget, SCROLL_BONUS};
use crate::stat_map::{ignored_stats, stat_key, weapon_attack_ids};
use crate::types::{floor_div, BuildInput, EquippedItem, ItemEffect, SetData, StatBlock};
use std::collections::HashMap;

const WEAPON_ATTACK_STAT_NAMES: [&str; 5] = [
    "Earth damage",
    "Fire damage",
    "Water damage",
    "Air damage",
    "Neutral damage",
];

const BASE_AP: i64 = 6;
const BASE_MP: i64 = 3;
const BASE_PODS: i64 = 1000;

fn base_hp(level: i64) -> i64 {
    55 + (level - 1) * 5
}

fn empty_stat_block() -> StatBlock {
    let mut b = StatBlock::default();
    b.prospecting = 100;
    b.summons = 1;
    b
}

fn add_to_stat(block: &mut StatBlock, key: &str, value: i64) {
    match key {
        "ap" => block.ap += value,
        "mp" => block.mp += value,
        "range" => block.range += value,
        "vitality" => block.vitality += value,
        "wisdom" => block.wisdom += value,
        "strength" => block.strength += value,
        "intelligence" => block.intelligence += value,
        "chance" => block.chance += value,
        "agility" => block.agility += value,
        "power" => block.power += value,
        "trap_power" => block.trap_power += value,
        "damage" => block.damage += value,
        "earth_damage" => block.earth_damage += value,
        "fire_damage" => block.fire_damage += value,
        "water_damage" => block.water_damage += value,
        "air_damage" => block.air_damage += value,
        "neutral_damage" => block.neutral_damage += value,
        "earth_steal" => block.earth_steal += value,
        "fire_steal" => block.fire_steal += value,
        "water_steal" => block.water_steal += value,
        "air_steal" => block.air_steal += value,
        "neutral_steal" => block.neutral_steal += value,
        "best_elem_damage" => block.best_elem_damage += value,
        "best_elem_steal" => block.best_elem_steal += value,
        "earth_res_fixed" => block.earth_res_fixed += value,
        "fire_res_fixed" => block.fire_res_fixed += value,
        "water_res_fixed" => block.water_res_fixed += value,
        "air_res_fixed" => block.air_res_fixed += value,
        "neutral_res_fixed" => block.neutral_res_fixed += value,
        "earth_res_percent" => block.earth_res_percent += value,
        "fire_res_percent" => block.fire_res_percent += value,
        "water_res_percent" => block.water_res_percent += value,
        "air_res_percent" => block.air_res_percent += value,
        "neutral_res_percent" => block.neutral_res_percent += value,
        "crit_chance" => block.crit_chance += value,
        "crit_damage" => block.crit_damage += value,
        "crit_resistance" => block.crit_resistance += value,
        "melee_damage_percent" => block.melee_damage_percent += value,
        "ranged_damage_percent" => block.ranged_damage_percent += value,
        "spell_damage_percent" => block.spell_damage_percent += value,
        "weapon_damage_percent" => block.weapon_damage_percent += value,
        "melee_resist_percent" => block.melee_resist_percent += value,
        "ranged_resist_percent" => block.ranged_resist_percent += value,
        "trap_damage" => block.trap_damage += value,
        "pushback_damage" => block.pushback_damage += value,
        "pushback_resist" => block.pushback_resist += value,
        "reflected_damage" => block.reflected_damage += value,
        "heals" => block.heals += value,
        "initiative" => block.initiative += value,
        "lock" => block.lock += value,
        "dodge" => block.dodge += value,
        "prospecting" => block.prospecting += value,
        "summons" => block.summons += value,
        "pods" => block.pods += value,
        "ap_reduction" => block.ap_reduction += value,
        "mp_reduction" => block.mp_reduction += value,
        "ap_parry" => block.ap_parry += value,
        "mp_parry" => block.mp_parry += value,
        "mp_steal" => block.mp_steal += value,
        _ => {}
    }
}

fn apply_effect(block: &mut StatBlock, effect: &ItemEffect) {
    if ignored_stats().contains(effect.stat.as_str()) {
        return;
    }
    let value = effect.value();
    match stat_key(&effect.stat) {
        Some(key) => add_to_stat(block, key, value),
        None => {
            *block.unknown_stats.entry(effect.stat.clone()).or_insert(0) += value;
        }
    }
}

fn apply_effects(block: &mut StatBlock, effects: &[ItemEffect]) {
    for e in effects {
        apply_effect(block, e);
    }
}

/// Active set bonuses for the given equipped items — only the highest
/// reached tier applies (tiers are not cumulative in Dofus 3).
fn compute_set_bonuses(items: &[EquippedItem], sets: &[SetData]) -> Vec<ItemEffect> {
    let mut equipped_by_set: HashMap<i64, i64> = HashMap::new();
    for item in items {
        if let Some(set_id) = item.set_id {
            *equipped_by_set.entry(set_id).or_insert(0) += 1;
        }
    }

    let mut bonus_effects = Vec::new();
    for (set_id, count) in equipped_by_set {
        let Some(set_data) = sets.iter().find(|s| s.ankama_id == set_id) else { continue };

        let mut tiers: Vec<(i64, &Vec<ItemEffect>)> = set_data
            .bonuses
            .iter()
            .filter_map(|(k, v)| k.parse::<i64>().ok().map(|pieces| (pieces, v)))
            .filter(|(pieces, _)| *pieces <= count)
            .collect();
        tiers.sort_by(|a, b| b.0.cmp(&a.0));

        if let Some((_, effects)) = tiers.first() {
            bonus_effects.extend((*effects).iter().cloned());
        }
    }
    bonus_effects
}

/// Compute the full aggregated StatBlock for a build. Pure function.
pub fn compute_stats(input: &BuildInput) -> StatBlock {
    let mut block = empty_stat_block();

    // 1. Base AP/MP/Pods (+ level-100 AP bonus)
    block.ap = BASE_AP + if input.level >= 100 { 1 } else { 0 };
    block.mp = BASE_MP;
    block.pods = BASE_PODS;

    // 2. Aggregate item effects (filter weapon attack ranges from weapon-slot items)
    let attack_ids = weapon_attack_ids();
    for item in &input.items {
        if item.slot == "weapon" {
            let filtered: Vec<ItemEffect> = item
                .effects
                .iter()
                .filter(|e| match e.effect_id {
                    Some(id) => !attack_ids.contains(&id),
                    None => !WEAPON_ATTACK_STAT_NAMES.contains(&e.stat.as_str()),
                })
                .cloned()
                .collect();
            apply_effects(&mut block, &filtered);
        } else {
            apply_effects(&mut block, &item.effects);
        }
    }

    // 3. Aggregate set bonuses
    let set_bonuses = compute_set_bonuses(&input.items, &input.sets);
    apply_effects(&mut block, &set_bonuses);

    // 3.5. Rune ("forgemagie") effects
    apply_effects(&mut block, &input.rune_effects);

    // 3.6. Generic "Damage" (all elements) adds to every elemental damage total.
    block.neutral_damage += block.damage;
    block.earth_damage += block.damage;
    block.fire_damage += block.damage;
    block.water_damage += block.damage;
    block.air_damage += block.damage;

    // 4. Characteristic points (allocated + scrolls)
    let a = &input.allocated;
    let s = &input.scrolled;
    block.vitality += a.vitality + if s.vitality { SCROLL_BONUS } else { 0 };
    block.wisdom += a.wisdom + if s.wisdom { SCROLL_BONUS } else { 0 };
    block.strength += a.strength + if s.strength { SCROLL_BONUS } else { 0 };
    block.intelligence += a.intelligence + if s.intelligence { SCROLL_BONUS } else { 0 };
    block.chance += a.chance + if s.chance { SCROLL_BONUS } else { 0 };
    block.agility += a.agility + if s.agility { SCROLL_BONUS } else { 0 };

    // 5. Derived stats from characteristics (official Dofus 3 formulas)
    block.initiative += block.strength + block.intelligence + block.chance + block.agility;
    block.dodge += floor_div(block.agility, 10);
    block.lock += floor_div(block.agility, 10);
    block.ap_parry += floor_div(block.wisdom, 10);
    block.mp_parry += floor_div(block.wisdom, 10);
    block.ap_reduction += floor_div(block.wisdom, 10);
    block.mp_reduction += floor_div(block.wisdom, 10);
    block.pods += block.strength * 5;
    block.prospecting += floor_div(block.chance, 10);

    // 6. Point budget accounting
    block.points_budget = stat_budget(input.level);
    block.points_spent = point_cost("vitality", a.vitality)
        + point_cost("wisdom", a.wisdom)
        + point_cost("strength", a.strength)
        + point_cost("intelligence", a.intelligence)
        + point_cost("chance", a.chance)
        + point_cost("agility", a.agility);

    // 7. HP (base + all vitality sources already summed in block.vitality)
    block.max_hp = base_hp(input.level) + block.vitality;

    // 8. Save raw values before caps (used for overcap display)
    block.ap_raw = block.ap;
    block.mp_raw = block.mp;
    block.range_raw = block.range;
    block.neutral_res_percent_raw = block.neutral_res_percent;
    block.earth_res_percent_raw = block.earth_res_percent;
    block.fire_res_percent_raw = block.fire_res_percent;
    block.water_res_percent_raw = block.water_res_percent;
    block.air_res_percent_raw = block.air_res_percent;

    // 8b. Official game caps (Dofus 3 hard limits)
    block.ap = block.ap.min(12);
    block.mp = block.mp.min(6);
    block.range = block.range.min(6);
    block.summons = block.summons.min(6);
    block.neutral_res_percent = block.neutral_res_percent.min(50);
    block.earth_res_percent = block.earth_res_percent.min(50);
    block.fire_res_percent = block.fire_res_percent.min(50);
    block.water_res_percent = block.water_res_percent.min(50);
    block.air_res_percent = block.air_res_percent.min(50);

    block
}

// Direct ports of src/engine/__tests__/engine.test.ts's computeStats cases —
// these pin numeric parity with the TypeScript engine, which this Rust port
// must match exactly since both compute the same real game stats.
#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::{AllocatedCharacteristics, ScrolledCharacteristics};

    fn zero_alloc() -> AllocatedCharacteristics {
        AllocatedCharacteristics::default()
    }
    fn no_scrolls() -> ScrolledCharacteristics {
        ScrolledCharacteristics::default()
    }
    fn all_scrolls() -> ScrolledCharacteristics {
        ScrolledCharacteristics {
            vitality: true,
            wisdom: true,
            strength: true,
            intelligence: true,
            chance: true,
            agility: true,
        }
    }
    fn empty_build(level: i64, allocated: AllocatedCharacteristics, scrolled: ScrolledCharacteristics) -> BuildInput {
        BuildInput {
            level,
            allocated,
            scrolled,
            items: vec![],
            sets: vec![],
            rune_effects: vec![],
        }
    }
    fn effect(stat: &str, min: i64, max: i64) -> ItemEffect {
        ItemEffect { stat: stat.to_string(), min, max, effect_id: None }
    }
    fn item(ankama_id: i64, set_id: Option<i64>, slot: &str, effects: Vec<ItemEffect>) -> EquippedItem {
        EquippedItem { ankama_id, effects, set_id, slot: slot.to_string() }
    }

    #[test]
    fn empty_build_base_ap_mp() {
        let s = compute_stats(&empty_build(1, zero_alloc(), no_scrolls()));
        assert_eq!(s.ap, 6);
        assert_eq!(s.mp, 3);
    }

    #[test]
    fn hp_at_level_1_and_200() {
        let s1 = compute_stats(&empty_build(1, zero_alloc(), no_scrolls()));
        assert_eq!(s1.max_hp, 55);
        let s200 = compute_stats(&empty_build(200, zero_alloc(), no_scrolls()));
        assert_eq!(s200.max_hp, 1050); // 55 + 199*5
    }

    #[test]
    fn points_budget_and_spent_at_level_1() {
        let s = compute_stats(&empty_build(1, zero_alloc(), no_scrolls()));
        assert_eq!(s.points_budget, 0);
        assert_eq!(s.points_spent, 0);
    }

    #[test]
    fn allocated_strength_reflects_in_block() {
        let alloc = AllocatedCharacteristics { strength: 100, ..zero_alloc() };
        let s = compute_stats(&empty_build(1, alloc, no_scrolls()));
        assert_eq!(s.strength, 100);
        assert_eq!(s.points_spent, 100); // first bracket: 100pts
    }

    #[test]
    fn scroll_adds_bonus_to_each_stat() {
        let s = compute_stats(&empty_build(1, zero_alloc(), all_scrolls()));
        assert_eq!(s.vitality, SCROLL_BONUS);
        assert_eq!(s.wisdom, SCROLL_BONUS);
        assert_eq!(s.strength, SCROLL_BONUS);
        assert_eq!(s.intelligence, SCROLL_BONUS);
        assert_eq!(s.chance, SCROLL_BONUS);
        assert_eq!(s.agility, SCROLL_BONUS);
    }

    #[test]
    fn hp_includes_allocated_vitality() {
        let alloc = AllocatedCharacteristics { vitality: 50, ..zero_alloc() };
        let s = compute_stats(&empty_build(1, alloc, no_scrolls()));
        assert_eq!(s.max_hp, 55 + 50);
    }

    fn gobball_set() -> SetData {
        let mut bonuses = HashMap::new();
        bonuses.insert("2".to_string(), vec![effect("Strength", 5, 0), effect("Intelligence", 5, 0), effect("Vitality", 5, 0)]);
        bonuses.insert("3".to_string(), vec![effect("Strength", 10, 0), effect("Intelligence", 10, 0), effect("Vitality", 10, 0)]);
        bonuses.insert("8".to_string(), vec![effect("Strength", 50, 0), effect("Intelligence", 50, 0), effect("Vitality", 50, 0), effect("AP", 1, 0)]);
        SetData { ankama_id: 1, items: vec![2411, 2414, 2416, 2419, 2422, 2425, 2428, 18666], bonuses }
    }
    fn gobball_hat() -> EquippedItem {
        item(2411, Some(1), "helmet", vec![effect("Strength", 16, 20), effect("Intelligence", 16, 20)])
    }
    fn gobball_amulet() -> EquippedItem {
        item(2414, Some(1), "amulet", vec![effect("Strength", 5, 8), effect("Vitality", 11, 15)])
    }
    fn gobball_belt() -> EquippedItem {
        item(2416, Some(1), "belt", vec![effect("Chance", 6, 9)])
    }

    #[test]
    fn two_piece_gobball_applies_2pc_bonus_once() {
        let mut b = empty_build(1, zero_alloc(), no_scrolls());
        b.items = vec![gobball_hat(), gobball_amulet()];
        b.sets = vec![gobball_set()];
        let s = compute_stats(&b);
        assert_eq!(s.strength, 20 + 8 + 5); // 33
        assert_eq!(s.intelligence, 20 + 5); // 25
        assert_eq!(s.vitality, 15 + 5); // 20
    }

    #[test]
    fn three_piece_gobball_only_3pc_tier_applies() {
        let mut b = empty_build(1, zero_alloc(), no_scrolls());
        b.items = vec![gobball_hat(), gobball_amulet(), gobball_belt()];
        b.sets = vec![gobball_set()];
        let s = compute_stats(&b);
        assert_eq!(s.strength, 20 + 8 + 10); // 38, not +5+10
        assert_eq!(s.intelligence, 20 + 10); // 30
        assert_eq!(s.chance, 9); // belt only, no chance in set bonus
    }

    #[test]
    fn one_item_from_set_no_bonus() {
        let mut b = empty_build(1, zero_alloc(), no_scrolls());
        b.items = vec![gobball_hat()];
        b.sets = vec![gobball_set()];
        let s = compute_stats(&b);
        assert_eq!(s.strength, 20);
        assert_eq!(s.vitality, 0);
    }

    #[test]
    fn eight_piece_gobball_only_8pc_tier_applies() {
        let full_set: Vec<EquippedItem> = gobball_set()
            .items
            .iter()
            .map(|id| item(*id, Some(1), "ring", vec![]))
            .collect();
        let mut b = empty_build(1, zero_alloc(), no_scrolls());
        b.items = full_set;
        b.sets = vec![gobball_set()];
        let s = compute_stats(&b);
        assert_eq!(s.ap, 6 + 1); // base + set bonus
        assert_eq!(s.strength, 50); // 8pc tier only, not 2pc+3pc+8pc stacked
    }
}
