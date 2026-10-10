// Mirrors src/engine/statMap.ts exactly — same IDs, same stat-name strings,
// same StatBlock key targets. Re-sync by hand if statMap.ts changes.

use std::collections::HashSet;
use std::sync::OnceLock;

/// Effect type IDs for weapon attack effects (language-independent, from the
/// dofusdude API). These identify actual weapon damage/steal effects (the
/// attack range), NOT passive stat bonuses.
pub fn weapon_attack_ids() -> &'static HashSet<i64> {
    static SET: OnceLock<HashSet<i64>> = OnceLock::new();
    SET.get_or_init(|| {
        [
            189, 193, 194, 195, 198, 203, 214, 221, 223, 224, 225, 238, 248, 257, 261, 233, 179,
        ]
        .into_iter()
        .collect()
    })
}

/// Effect type IDs to hide from display/consideration entirely — UI/meta
/// markers from the API, not real stat effects.
pub fn ignored_effect_ids() -> &'static HashSet<i64> {
    static SET: OnceLock<HashSet<i64>> = OnceLock::new();
    SET.get_or_init(|| [163, 98].into_iter().collect())
}

/// Stats intentionally ignored (cosmetic, quest flags, spell-specific
/// notation) — never map to a StatBlock field.
pub fn ignored_stats() -> &'static HashSet<&'static str> {
    static SET: OnceLock<HashSet<&'static str>> = OnceLock::new();
    SET.get_or_init(|| {
        [
            "-special spell-", "/", "Emote", "Title:", "Exchangeable:",
            "Received on", "Size: %", "Someone's following you!",
            "Changes appearance", "Changes speech", "Cooperative crafting impossible",
            "Linked to the character", "Fertile", "Hunting weapon",
            "Number of victims:", "Add a temporary spell",
            "Advances by cell", "Attracts by cell", "Pushes back cell",
            ": + Damage", ": + Maximum Range", ": + base damage",
            ": + cast(s) per target", ": + cast(s) per turn", ": +% Critical",
            ": - AP", ": - Minimum Range", ": - cooldown",
            ": line of sight off", ": modifiable Range",
            ": occupied cell needed off", ": straight-line casting off",
            "Steals kamas",
        ]
        .into_iter()
        .collect()
    })
}

/// Maps an API stat name string (English) to the StatBlock field it targets —
/// the same target set `apply_effect` (stats.rs) matches on. Returns None for
/// a name with no known target (ignored or unrecognized).
pub fn stat_key(name: &str) -> Option<&'static str> {
    Some(match name {
        "AP" => "ap",
        "MP" => "mp",
        "Range" => "range",

        "Vitality" => "vitality",
        "Wisdom" => "wisdom",
        "Strength" => "strength",
        "Intelligence" => "intelligence",
        "Chance" => "chance",
        "Agility" => "agility",

        "Power" => "power",
        "Power (traps)" => "trap_power",

        "Damage" => "damage",

        "Earth Damage" | "Earth damage" => "earth_damage",
        "Fire Damage" | "Fire damage" => "fire_damage",
        "Water Damage" | "Water damage" => "water_damage",
        "Air Damage" | "Air damage" => "air_damage",
        "Neutral Damage" | "Neutral damage" => "neutral_damage",

        "Earth steal" => "earth_steal",
        "Fire steal" => "fire_steal",
        "Air steal" => "air_steal",
        "Neutral steal" => "neutral_steal",
        "Fire heals" => "fire_steal",
        "best-element damage" => "best_elem_damage",
        "best-element steal" => "best_elem_steal",

        "Earth Resistance" => "earth_res_fixed",
        "Fire Resistance" => "fire_res_fixed",
        "Water Resistance" => "water_res_fixed",
        "Air Resistance" => "air_res_fixed",
        "Neutral Resistance" => "neutral_res_fixed",

        "% Earth Resistance" => "earth_res_percent",
        "% Fire Resistance" => "fire_res_percent",
        "% Water Resistance" => "water_res_percent",
        "% Air Resistance" => "air_res_percent",
        "% Neutral Resistance" => "neutral_res_percent",

        "% Critical" => "crit_chance",
        "Critical Damage" => "crit_damage",
        "Critical Resistance" => "crit_resistance",

        "% Melee Damage" => "melee_damage_percent",
        "% Ranged Damage" => "ranged_damage_percent",
        "% Spell Damage" => "spell_damage_percent",
        "% Weapon Damage" => "weapon_damage_percent",
        "% Melee Resistance" => "melee_resist_percent",
        "% Ranged Resistance" => "ranged_resist_percent",

        "Trap Damage" => "trap_damage",
        "Pushback Damage" => "pushback_damage",
        "Pushback Resistance" => "pushback_resist",
        "reflected damage" => "reflected_damage",

        "Heal" => "heals",
        "Initiative" => "initiative",
        "Lock" => "lock",
        "Dodge" => "dodge",
        "Prospecting" => "prospecting",
        "Summons" => "summons",
        "Pod" => "pods",

        "AP Reduction" => "ap_reduction",
        "MP Reduction" => "mp_reduction",
        "AP Parry" => "ap_parry",
        "MP Parry" => "mp_parry",
        "Steals MP" => "mp_steal",

        _ => return None,
    })
}
