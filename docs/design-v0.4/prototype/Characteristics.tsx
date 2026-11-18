import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useBuildStore } from "../../../src/store/buildStore";
import { useCombatStats } from "../../../src/store/useCombatStats";
import {
  useCombatView,
  useHasPassives,
} from "../../../src/store/useCombatView";
import {
  maxPointsForBudget,
  pointCost,
  statBudget,
  SCROLL_BONUS,
} from "../../../src/engine/characteristics";
import {
  CHARACTERISTICS,
  type Characteristic,
} from "../../../src/engine/types";
import { statIconUrl } from "../../../src/features/equipment/statDisplay";
import "./tools.css";

const NAME_KEYS: Record<Characteristic, string> = {
  vitality: "char_vitality",
  wisdom: "char_wisdom",
  strength: "char_strength",
  intelligence: "char_intelligence",
  chance: "char_chance",
  agility: "char_agility",
};
const ELEMENTAL = new Set<Characteristic>([
  "strength",
  "intelligence",
  "chance",
  "agility",
]);
/** Thousands are always grouped, as in the workshop sheet (the "es" locale skips four-digit numbers by default). */
const formatNumber = (n: number, lang: string) =>
  new Intl.NumberFormat(lang, {
    useGrouping: "always" as unknown as boolean,
    maximumFractionDigits: 0,
  }).format(Math.round(n));

/** Step size as in production: Shift = 5, Ctrl/⌘ = 20, otherwise 1. */
const step = (e: { shiftKey: boolean; ctrlKey: boolean; metaKey: boolean }) =>
  e.shiftKey ? 5 : e.ctrlKey || e.metaKey ? 20 : 1;

/**
 * Press-and-hold as in production: one step on press, then after 350 ms a
 * repeat every 80 ms that speeds up to 5 per tick after 15 ticks. Pointer
 * events cover mouse and touch; a keyboard click still does a single step.
 */
function useHold(apply: (n: number) => void) {
  const fn = useRef(apply),
    timer = useRef<ReturnType<typeof setTimeout>>(undefined),
    tick = useRef<ReturnType<typeof setInterval>>(undefined),
    pressed = useRef(false);
  fn.current = apply;
  const stop = useCallback(() => {
    clearTimeout(timer.current);
    clearInterval(tick.current);
  }, []);
  useEffect(() => stop, [stop]);
  return {
    onPointerDown: (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      pressed.current = true;
      fn.current(step(e));
      if (e.shiftKey || e.ctrlKey || e.metaKey) return;
      let count = 0;
      timer.current = setTimeout(() => {
        tick.current = setInterval(() => {
          count++;
          fn.current(count >= 15 ? 5 : 1);
        }, 80);
      }, 350);
    },
    onPointerUp: stop,
    onPointerLeave: stop,
    onPointerCancel: stop,
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
    onClick: (e: React.MouseEvent) => {
      if (pressed.current) {
        pressed.current = false;
        return;
      }
      fn.current(step(e));
    },
  };
}

function Points({
  char,
  value,
  onCommit,
}: {
  char: Characteristic;
  value: number;
  onCommit: (target: number) => void;
}) {
  const { t } = useTranslation(),
    [text, setText] = useState(String(value)),
    editing = useRef(false);
  useEffect(() => {
    if (!editing.current) setText(String(value));
  }, [value]);
  return (
    <input
      inputMode="numeric"
      aria-label={t("tool_v4_chars_points_in", { name: t(NAME_KEYS[char]) })}
      value={text}
      onFocus={(e) => {
        editing.current = true;
        e.currentTarget.select();
      }}
      onChange={(e) => setText(e.target.value.replace(/\D/g, "").slice(0, 4))}
      onBlur={() => {
        editing.current = false;
        onCommit(Number(text) || 0);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
      }}
    />
  );
}

const signedDelta = (n: number, lang: string) =>
  (n > 0 ? "+" : "−") + formatNumber(Math.abs(n), lang);

function Step({
  label,
  disabled,
  apply,
  children,
}: {
  label: string;
  disabled: boolean;
  apply: (n: number) => void;
  children: React.ReactNode;
}) {
  const { t } = useTranslation(),
    hold = useHold(apply);
  return (
    <button
      aria-label={label}
      title={t("tool_v4_chars_step_title", { label })}
      disabled={disabled}
      {...hold}
    >
      {children}
    </button>
  );
}

/** One row per characteristic: scroll, points and the resulting total, read left to right. */
export function Characteristics() {
  const { t, i18n } = useTranslation(),
    lang = i18n.language,
    number = { format: (n: number) => formatNumber(n, lang) },
    name = (char: Characteristic) => t(NAME_KEYS[char]),
    b = useBuildStore(),
    gear = b.stats,
    combatStats = useCombatStats(),
    combatView = useCombatView(),
    hasPassives = useHasPassives(),
    combat = combatView && hasPassives && combatStats != null,
    stats = combat ? combatStats : b.stats;
  const budget = statBudget(b.level),
    spent = CHARACTERISTICS.reduce(
      (sum, c) => sum + pointCost(c, b.allocated[c]),
      0,
    ),
    left = budget - spent,
    everyScroll = CHARACTERISTICS.every((c) => b.scrolled[c]),
    power = stats?.power ?? 0,
    powerFromPassives = combat && gear ? power - gear.power : 0;
  function commit(char: Characteristic, target: number) {
    const now = b.allocated[char];
    if (target > now) b.addPoints(char, target - now);
    else if (target < now) b.removePoints(char, now - target);
  }
  return (
    <div className="chars">
      <div className="chars-budget">
        <p>
          <strong>{number.format(left)}</strong>
          {" " + t("tool_v4_chars_left", { count: left })}
          <span>
            {t("tool_v4_chars_used", {
              spent: number.format(spent),
              budget: number.format(budget),
              level: b.level,
            })}
          </span>
        </p>
        <div
          className="chars-meter"
          role="img"
          aria-label={t("tool_v4_chars_meter", { spent, budget })}
        >
          <i style={{ width: (budget ? (spent / budget) * 100 : 0) + "%" }} />
        </div>
      </div>
      {combat && (
        <p className="chars-note">
          {t("tool_v4_chars_combat_note")}
        </p>
      )}
      <div className="chars-head" aria-hidden="true">
        <span>{t("tool_v4_chars_col_characteristic")}</span>
        <span>{t("tool_v4_chars_col_scroll")}</span>
        <span>{t("tool_v4_chars_col_points")}</span>
        <span>{t("weapon_total")}</span>
      </div>
      {CHARACTERISTICS.map((char) => {
        const points = b.allocated[char],
          next = pointCost(char, points + 1) - pointCost(char, points),
          most = maxPointsForBudget(char, left + pointCost(char, points)),
          total = stats
            ? char === "vitality"
              ? stats.maxHp
              : stats[char]
            : points;
        return (
          <div
            className={"chars-row" + (char === "strength" ? " starts-group" : "")}
            role="group"
            aria-label={name(char)}
            key={char}
          >
            <div className="chars-name">
              <img src={statIconUrl(char)} alt="" />
              <span>
                <b>{name(char)}</b>
                <small>{t("tool_v4_chars_per_unit", { count: next })}</small>
              </span>
            </div>
            <button
              className="chars-scroll"
              aria-pressed={b.scrolled[char]}
              aria-label={t("tool_v4_chars_scroll_label", {
                name: name(char),
                bonus: SCROLL_BONUS,
              })}
              onClick={() => b.toggleScroll(char)}
            >
              +{SCROLL_BONUS}
            </button>
            <div className="chars-points">
              <Step
                label={t("tool_v4_chars_remove", { name: name(char) })}
                disabled={points <= 0}
                apply={(n) => b.removePoints(char, n)}
              >
                −
              </Step>
              <Points
                char={char}
                value={points}
                onCommit={(target) => commit(char, target)}
              />
              <Step
                label={t("tool_v4_chars_add", { name: name(char) })}
                disabled={left < next}
                apply={(n) => b.addPoints(char, n)}
              >
                +
              </Step>
              <button
                className="chars-max"
                aria-label={t("tool_v4_chars_max_label", { name: name(char) })}
                disabled={most <= points}
                onClick={() => commit(char, most)}
              >
                {t("tool_v4_chars_max")}
              </button>
            </div>
            <div className="chars-total">
              <strong>
                {number.format(total)}
                {combat && gear && total !== (char === "vitality" ? gear.maxHp : gear[char]) && (
                  <em title={t("tool_v4_chars_passive_delta")}>
                    {signedDelta(total - (char === "vitality" ? gear.maxHp : gear[char]), lang)}
                  </em>
                )}
              </strong>
              <small>
                {char === "vitality"
                  ? t("tool_v4_chars_hp")
                  : ELEMENTAL.has(char) && power > 0
                    ? t("tool_v4_chars_with_power", { value: number.format(total + power) })
                    : " "}
              </small>
            </div>
          </div>
        );
      })}
      <div className="chars-foot">
        <p>
          {t("tool_v4_chars_hint")}{" "}
          {power > 0
            ? t("tool_v4_chars_power", {
                power: number.format(power),
                passives: powerFromPassives
                  ? t("tool_v4_chars_power_passives", {
                      delta: signedDelta(powerFromPassives, lang),
                    })
                  : "",
              })
            : t("tool_v4_chars_power_gear")}
        </p>
        <button onClick={() => b.setAllScrolls(!everyScroll)}>
          {everyScroll ? t("tool_v4_chars_scrolls_off") : t("tool_v4_chars_scrolls_on")}
        </button>
      </div>
    </div>
  );
}
