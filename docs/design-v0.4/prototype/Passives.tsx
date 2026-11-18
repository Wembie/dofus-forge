import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, RotateCcw } from "lucide-react";
import { useBuildStore } from "../../../src/store/buildStore";
import {
  setCombatView,
  useCombatView,
} from "../../../src/store/useCombatView";
import {
  ITEM_PASSIVES,
  TEXT_ONLY_PASSIVES,
  controlRoom,
  passiveBonus,
  type PassiveBonus,
  type PassiveControl,
} from "../../../src/engine/passives";
import { bonusParts } from "../../../src/features/passives/passiveLabels";
import { plainText } from "../../../src/features/passives/PassivesPanel";
import { statIconUrl } from "../../../src/features/equipment/statDisplay";
import { visibleSlots, equipment } from "./model";
import type { AppItem } from "../../../src/data/loaders";
import "./tools.css";

/** Which numbers the workshop shows: the gear alone, or the gear with the passives you switch on. */
export function CombatSwitch() {
  const { t } = useTranslation(),
    combat = useCombatView(),
    active = useBuildStore(
      (s) =>
        Object.values(s.equipped).filter(
          (id) =>
            id != null &&
            (ITEM_PASSIVES.get(id) ?? []).some(
              (c) => (s.passives[c.id] ?? 0) > 0,
            ),
        ).length,
    );
  return (
    <div className="view-switch">
      <div role="radiogroup" aria-label={t("tool_v4_passives_switch")}>
        <button
          role="radio"
          aria-checked={!combat}
          onClick={() => setCombatView(false)}
        >
          {t("combat_view_gear")}
        </button>
        <button
          role="radio"
          aria-checked={combat}
          onClick={() => setCombatView(true)}
        >
          {t("combat_view_combat")}
          <span
            className="view-count"
            aria-label={t("tool_v4_passives_active_count", { count: active })}
          >
            {active}
          </span>
        </button>
      </div>
      <p>
        {combat
          ? t("tool_v4_passives_combat_hint")
          : t("tool_v4_passives_gear_hint")}
      </p>
    </div>
  );
}

function Bonus({ bonus }: { bonus: PassiveBonus }) {
  const { t } = useTranslation();
  return (
    <span className="passive-bonus">
      {bonusParts(bonus).map((p) => (
        <span key={p.key} className={p.negative ? "negative" : ""}>
          <img src={statIconUrl(p.icon)} alt="" />
          <b>{p.value}</b> {t(p.tKey)}
        </span>
      ))}
    </span>
  );
}

function Control({
  control,
  item,
}: {
  control: PassiveControl;
  item: AppItem;
}) {
  const { t } = useTranslation(),
    state = useBuildStore((s) => s.passives),
    setPassive = useBuildStore((s) => s.setPassive),
    value = state[control.id] ?? 0,
    set = (next: number) => setPassive(control.id, next);
  if (control.kind === "stacks") {
    const room = controlRoom(control, state);
    return (
      <div className="passive-stacks">
        <p>
          <Bonus bonus={control.perStack} />
          <span>{t("passives_per_stack")}</span>
        </p>
        <div>
          <button
            aria-label={t("tool_v4_passives_stack_less", { name: item.name })}
            disabled={value <= 0}
            onClick={() => set(value - 1)}
          >
            −
          </button>
          <input
            type="range"
            min={0}
            max={control.max}
            value={value}
            aria-label={t("tool_v4_passives_stacks_of", { name: item.name })}
            aria-valuetext={t("tool_v4_passives_stacks_value", { value, max: control.max })}
            onChange={(e) => set(Math.min(Number(e.target.value), room))}
          />
          <button
            aria-label={t("tool_v4_passives_stack_more", { name: item.name })}
            disabled={value >= room}
            onClick={() => set(value + 1)}
          >
            +
          </button>
          <output>
            <b>{value}</b> / {control.max}
          </output>
        </div>
      </div>
    );
  }
  if (control.options.length === 1) {
    const on = value === 1;
    return (
      <button
        className="passive-toggle"
        role="switch"
        aria-checked={on}
        onClick={() => set(on ? 0 : 1)}
      >
        <i />
        <span>
          {control.options[0].turn != null && (
            <em>{t("passives_turn", { n: control.options[0].turn })}</em>
          )}
          <Bonus bonus={control.options[0].bonus} />
        </span>
      </button>
    );
  }
  return (
    <div
      className="passive-options"
      role="radiogroup"
      aria-label={t("tool_v4_passives_case", { name: item.name })}
    >
      <button role="radio" aria-checked={value === 0} onClick={() => set(0)}>
        {t("tool_v4_passives_off")}
      </button>
      {control.options.map((option, i) => (
        <button
          key={i}
          role="radio"
          aria-checked={value === i + 1}
          onClick={() => set(i + 1)}
        >
          {option.turn != null && <em>{t("passives_turn", { n: option.turn })}</em>}
          <Bonus bonus={option.bonus} />
        </button>
      ))}
    </div>
  );
}

function Passive({ item }: { item: AppItem }) {
  const { t } = useTranslation(),
    state = useBuildStore((s) => s.passives),
    [open, setOpen] = useState(false);
  const controls = ITEM_PASSIVES.get(item.ankama_id) ?? [],
    active = controls.some((c) => (state[c.id] ?? 0) > 0),
    shared = controls.filter((c) => c.kind === "stacks" && c.shared),
    cap =
      shared.length > 1 && shared[0].kind === "stacks" ? shared[0].shared : null,
    used = shared.reduce((sum, c) => sum + (state[c.id] ?? 0), 0);
  const [, ...bullets] = (item.ability ?? "").split("•").map((s) => s.trim()),
    ability = (item.ability ?? "").split(":")[0]?.trim();
  return (
    <li className={"passive" + (active ? " is-active" : "")}>
      <div className="passive-source">
        <img src={item.image_url || "/design-assets/forge-mark.svg"} alt="" />
        <span>
          <b>{item.name}</b>
          <small>
            {ability && ability !== item.name ? ability + " · " : ""}
            {!controls.length
              ? t("tool_v4_passives_no_stats")
              : active
                ? t("tool_v4_passives_on_state")
                : t("tool_v4_passives_off_state")}
          </small>
        </span>
      </div>
      <div className="passive-controls">
        {controls.map((control) => (
          <Control key={control.id} control={control} item={item} />
        ))}
        {!controls.length && (
          <p className="passive-plain">{t("tool_v4_passives_text_only")}</p>
        )}
        {cap != null && (
          <p className="passive-plain">
            {t("tool_v4_passives_shared", { used, cap })}
          </p>
        )}
        {bullets.some(Boolean) && (
          <>
            <button
              className="passive-text"
              aria-expanded={open}
              onClick={() => setOpen(!open)}
            >
              <ChevronDown size={14} />
              {open ? t("tool_v4_passives_hide_text") : t("tool_v4_passives_show_text")}
            </button>
            {open && (
              <ul>
                {bullets.filter(Boolean).map((line, i) => (
                  <li key={i}>{plainText(line)}</li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </li>
  );
}

/** One row per equipped item with a passive: what it gives, set to the state you want to read. */
export function Passives() {
  const { t } = useTranslation(),
    equipped = useBuildStore((s) => s.equipped),
    state = useBuildStore((s) => s.passives),
    setPassive = useBuildStore((s) => s.setPassive);
  const items = visibleSlots
    .flatMap((slot) => equipment.get(equipped[slot] || 0) ?? [])
    .filter(
      (it) =>
        ITEM_PASSIVES.has(it.ankama_id) || TEXT_ONLY_PASSIVES.has(it.ankama_id),
    );
  const total = passiveBonus(
      items.map((it) => it.ankama_id),
      state,
    ),
    any = Object.keys(total).length > 0,
    activeIds = Object.keys(state).filter((id) => state[id] > 0);
  return (
    <div className="passives">
      <CombatSwitch />
      {!items.length ? (
        <div className="tool-empty">
          <h3>{t("tool_v4_passives_empty_title")}</h3>
          <p>{t("tool_v4_passives_empty_body")}</p>
        </div>
      ) : (
        <>
          <div className="passive-total" aria-live="polite">
            <span>{t("tool_v4_passives_total")}</span>
            {any ? (
              <Bonus bonus={total} />
            ) : (
              <em>{t("tool_v4_passives_none_active")}</em>
            )}
            {activeIds.length > 0 && (
              <button onClick={() => activeIds.forEach((id) => setPassive(id, 0))}>
                <RotateCcw size={14} />
                {t("tool_v4_passives_reset")}
              </button>
            )}
          </div>
          <ul className="passive-list">
            {items.map((it) => (
              <Passive key={it.ankama_id} item={it} />
            ))}
          </ul>
          <p className="passive-plain">{t("tool_v4_passives_note")}</p>
        </>
      )}
    </div>
  );
}
