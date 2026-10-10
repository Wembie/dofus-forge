// Mirrors src/engine/characteristics.ts exactly.

const ELEMENTAL_BRACKETS: [(i64, i64); 4] = [(100, 1), (100, 2), (100, 3), (i64::MAX, 4)];

pub const SCROLL_BONUS: i64 = 100;

/// Points spent to allocate `points` into characteristic `char`.
pub fn point_cost(characteristic: &str, points: i64) -> i64 {
    if characteristic == "vitality" {
        return points;
    }
    if characteristic == "wisdom" {
        return points * 3;
    }

    let mut remaining = points;
    let mut total = 0;
    for (bracket, cost) in ELEMENTAL_BRACKETS {
        let in_bracket = remaining.min(bracket);
        total += in_bracket * cost;
        remaining -= in_bracket;
        if remaining <= 0 {
            break;
        }
    }
    total
}

/// Total stat point budget at a given level.
pub fn stat_budget(level: i64) -> i64 {
    0.max(level - 1) * 5
}
