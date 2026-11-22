import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Trans, useTranslation } from "react-i18next";
import {
  AlertTriangle,
  Anvil,
  ArrowLeft,
  Ban,
  BookOpen,
  Check,
  ChevronDown,
  Flame,
  Infinity as InfinityIcon,
  Lock,
  Pin,
  Plus,
  RotateCcw,
  Search,
  Settings2,
  Unlock,
  Wind,
  X,
} from "lucide-react";
import { ALL_SLOTS, type SlotId } from "@/store/buildStore.ts";
import type { AppItem } from "@/data/loaders.ts";
import { CHARACTERISTICS } from "@/engine/types.ts";
import { ClassPicker } from "@/features/class-picker/ClassPicker.tsx";
import { ForgeScene } from "@/features/optimizer/ForgeParts.tsx";
import type { BuildResult, ForgeIntensity, ForgeRequirement } from "@/features/optimizer/types.ts";
import {
  LEY_PRESETS,
  OPTIMIZER_STATS,
  POWER_BOOSTED,
  STAT_GROUPS,
  leyPreset,
  matchingPreset,
  runeStatLabelKey,
  suggestedCap,
  type OptimizerStatMeta,
} from "@/features/optimizer/statList.ts";
import { DOFUS_KINDS, PRO_RES_MAX, clampLevel, emptyReq, isActive, normalizeCap, proDamage } from "@/features/optimizer/forgeConfig.ts";
import { searchItems, slotNameKey, slotsFor, useForgePicks, type RequiredPlacement } from "@/features/optimizer/forgePicks.ts";
import {
  PASSIVE_MODES,
  PASSIVE_SECTIONS,
  forgePassiveState,
  orderPassiveBonus,
  orderPassiveItems,
  passiveSection,
  type ForgePassiveMode,
  type PassiveSection,
} from "@/features/optimizer/forgePassives.ts";
import {
  INTENSITY,
  META_MAP,
  SLOT_LABEL_KEY,
  fingerprint,
  formatCount,
  requirementChecks,
  surplusRows,
  useForge,
  type Forge as ForgeState,
} from "@/features/optimizer/useForge.ts";
import { bonusParts } from "@/features/passives/passiveLabels.ts";
import { runeIconUrl, signatureRuneUrl, statIconUrl } from "@/features/equipment/statDisplay.ts";
import { useFocusTrap } from "@/ui/useFocusTrap.ts";
import { langPathPrefix } from "@/i18n/langPath.ts";
import "./forge.css";

const group = (n: number, lang: string) => Math.round(n).toLocaleString(lang);

/** Number typed freely and committed on blur or Enter, like the production order fields. */
function NumberInput({
  value,
  label,
  placeholder,
  max = 100000,
  onCommit,
}: {
  value: number | null;
  label: string;
  placeholder: string;
  max?: number;
  onCommit: (value: number | null) => void;
}) {
  const shown = value == null || value === 0 ? "" : String(value);
  const [raw, setRaw] = useState(shown);
  useEffect(() => setRaw(shown), [shown]);
  return (
    <input
      inputMode="numeric"
      aria-label={label}
      title={label}
      placeholder={placeholder}
      value={raw}
      onChange={(e) => setRaw(e.target.value.replace(/\D/g, ""))}
      onBlur={() => {
        const n = parseInt(raw, 10);
        onCommit(Number.isNaN(n) ? null : Math.min(max, n));
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
      }}
    />
  );
}

function GoalRow({
  meta,
  req,
  onChange,
}: {
  meta: OptimizerStatMeta;
  req: ForgeRequirement;
  onChange: (next: ForgeRequirement) => void;
}) {
  const { t } = useTranslation();
  const name = t(meta.tKey);
  if (!isActive(req))
    return (
      <li className="fg-goal is-off">
        <img src={statIconUrl(meta.icon)} alt="" />
        <span>{name}</span>
        <button
          aria-label={t("fg_add", { name })}
          title={t("optimizer_activate_hint")}
          onClick={() => onChange({ ...req, weight: leyPreset(meta.key, 2), cap: suggestedCap(meta.key) })}
        >
          <Plus size={15} />
        </button>
      </li>
    );
  const preset = matchingPreset(meta.key, req.weight);
  return (
    <li className="fg-goal">
      <img src={statIconUrl(meta.icon)} alt="" />
      <span className="fg-goal-name">
        {name}
        {req.minimum > 0 && req.weight === 0 && (
          <AlertTriangle size={13} aria-label={t("optimizer_unpursued_hint")}>
            <title>{t("optimizer_unpursued_hint")}</title>
          </AlertTriangle>
        )}
      </span>
      <label className="fg-num">
        <span>{t("optimizer_min_val_label")}</span>
        <NumberInput
          value={req.minimum}
          label={t("fg_min_of", { name })}
          placeholder="—"
          onCommit={(v) => onChange({ ...req, minimum: v ?? 0 })}
        />
      </label>
      <label className="fg-num">
        <span>{t("fg_cap")}</span>
        <NumberInput
          value={req.cap}
          label={t("fg_cap_of", { name })}
          placeholder="∞"
          onCommit={(v) => onChange({ ...req, cap: normalizeCap(v) })}
        />
      </label>
      <button
        className={"fg-lock" + (req.strictCap ? " is-strict" : "")}
        aria-pressed={req.strictCap}
        aria-label={t("fg_strict_of", { name })}
        title={req.strictCap ? t("optimizer_cap_strict_hint") : t("optimizer_cap_soft_hint")}
        onClick={() => onChange({ ...req, strictCap: !req.strictCap })}
      >
        {req.strictCap ? <Lock size={14} /> : <Unlock size={14} />}
      </button>
      <label className="fg-num">
        <span>{t("optimizer_ley")}</span>
        <NumberInput
          value={req.weight}
          label={t("fg_ley_of", { name })}
          placeholder="0"
          max={10000}
          onCommit={(v) => onChange({ ...req, weight: v ?? 0 })}
        />
      </label>
      <div className="fg-presets" role="group" aria-label={t("fg_ley_levels_of", { name })}>
        {LEY_PRESETS.map((_, level) => (
          <button
            key={level}
            aria-pressed={preset >= level && preset !== -1}
            aria-label={t("optimizer_ley_preset", { n: level + 1, value: leyPreset(meta.key, level) })}
            title={t("optimizer_ley_preset", { n: level + 1, value: leyPreset(meta.key, level) })}
            onClick={() => onChange({ ...req, weight: leyPreset(meta.key, level) })}
          />
        ))}
      </div>
      <button
        className="fg-remove"
        aria-label={t("fg_remove", { name })}
        onClick={() => onChange(emptyReq(meta.key))}
      >
        <X size={15} />
      </button>
    </li>
  );
}

/** How much each active stat is worth next to the lightest one, from their leys. */
function LeyScale({ reqs }: { reqs: ForgeRequirement[] }) {
  const { t } = useTranslation();
  const weighted = reqs.filter((r) => r.weight > 0).sort((a, b) => b.weight - a.weight);
  if (weighted.length < 2) return null;
  const lightest = weighted[weighted.length - 1],
    light = META_MAP.get(lightest.stat),
    maxLog = Math.log10(weighted[0].weight + 1);
  const ratio = (n: number) => (n >= 10 ? String(Math.round(n)) : String(Math.round(n * 10) / 10));
  return (
    <section className="fg-scale" aria-label={t("optimizer_scale_title")}>
      <h4>{t("optimizer_scale_title")}</h4>
      <p>{t("optimizer_scale_hint")}</p>
      <ul>
        {weighted.slice(0, 10).map((r) => {
          const meta = META_MAP.get(r.stat);
          if (!meta) return null;
          return (
            <li key={r.stat}>
              <img src={statIconUrl(meta.icon)} alt="" />
              <span>{t(meta.tKey)}</span>
              <i>
                <b style={{ width: `${Math.max(4, (Math.log10(r.weight + 1) / maxLog) * 100)}%` }} />
              </i>
              <small>
                ≈ {ratio(r.weight / lightest.weight)} {light ? t(light.tKey) : ""}
              </small>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Goals({ forge }: { forge: ForgeState }) {
  const { t } = useTranslation();
  return (
    <section className="fg-goals" aria-labelledby="fg-goals-title">
      <header className="fg-step">
        <h3 id="fg-goals-title">{t("fg_goals_title")}</h3>
        <button
          className="fg-link is-danger"
          onClick={() =>
            forge.setConfig((c) => ({ ...c, stats: OPTIMIZER_STATS.map((s) => emptyReq(s.key)) }))
          }
        >
          {t("optimizer_clear_stats")}
        </button>
      </header>
      <p className="fg-lead">
        <Trans i18nKey="fg_lead" components={{ b: <b /> }} />
      </p>
      {STAT_GROUPS.map((g) => {
        const active = g.statKeys.filter((k) => {
            const r = forge.config.stats.find((s) => s.stat === k);
            return r && isActive(r);
          }).length,
          open = forge.expandedGroups.has(g.key);
        return (
          <div className="fg-group" key={g.key}>
            <button className="fg-group-head" aria-expanded={open} onClick={() => forge.toggleGroup(g.key)}>
              <span>{t(g.tKey)}</span>
              {active > 0 && <b>{active}</b>}
              <ChevronDown size={16} />
            </button>
            {open &&
              g.sections.map((section, i) => (
                <div key={section.tKey ?? i}>
                  {section.tKey && <h5>{t(section.tKey)}</h5>}
                  <ul>
                    {/* Vitality is not a goal: HP already covers it. */}
                    {section.statKeys.filter((key) => key !== "vitality").map((key) => {
                      const meta = META_MAP.get(key),
                        req = forge.config.stats.find((s) => s.stat === key);
                      return meta && req ? (
                        <GoalRow key={key} meta={meta} req={req} onChange={forge.updateReq} />
                      ) : null;
                    })}
                  </ul>
                </div>
              ))}
          </div>
        );
      })}
      <LeyScale reqs={forge.activeReqs} />
    </section>
  );
}

function ItemArt({ item, size = 32 }: { item?: AppItem; size?: number }) {
  return item?.image_url ? (
    <img className="fg-item-art" src={item.image_url} alt="" width={size} height={size} loading="lazy" />
  ) : (
    <span className="fg-item-art" style={{ width: size, height: size }} />
  );
}

/** Items every piece must wear, and items no piece may wear. */
function Picks({ forge }: { forge: ForgeState }) {
  const { t } = useTranslation(),
    listId = useId();
  const required = useForgePicks((s) => s.required),
    banned = useForgePicks((s) => s.banned),
    { require, ban, release, toggleRequired, clearRequired, clearBanned } = useForgePicks.getState();
  const [query, setQuery] = useState(""),
    [active, setActive] = useState(0);
  const setNames = useMemo(() => new Map((forge.sets ?? []).map((s) => [s.ankama_id, s.name])), [forge.sets]);
  const results = useMemo(() => searchItems(forge.equipment ?? [], setNames, query), [forge.equipment, setNames, query]);
  const worn = ALL_SLOTS.map((slot) => forge.itemsById.get(forge.equipped[slot] ?? -1)).filter(
    (it, i, all): it is AppItem => it != null && all.indexOf(it) === i,
  );
  const issue = (p: RequiredPlacement) =>
    p.status === "no_slot"
      ? t("optimizer_items_no_slot")
      : p.status === "prysmaradite"
        ? t("optimizer_items_prysmaradite")
        : p.status === "unknown"
          ? t("optimizer_items_unknown")
          : null;
  function pin(item: AppItem) {
    require(item.ankama_id);
    setQuery("");
  }
  return (
    <section className="fg-rule" aria-label={t("optimizer_items_title")}>
      <h4>{t("fg_picks_title")}</h4>
      <p>{t("fg_picks_hint")}</p>
      <label className="fg-check" title={t("fg_use_legendary_hint")}>
        <input
          type="checkbox"
          checked={forge.config.legendary}
          onChange={(e) => forge.setConfig((c) => ({ ...c, legendary: e.target.checked }))}
        />
        {t("fg_use_legendary")}
      </label>
      <label className="fg-search">
        <Search size={15} aria-hidden="true" />
        <input
          type="search"
          role="combobox"
          aria-expanded={query.trim().length >= 2}
          aria-controls={listId}
          aria-label={t("optimizer_items_search")}
          placeholder={t("fg_search_placeholder")}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((a) => Math.min(results.length - 1, a + 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => Math.max(0, a - 1));
            } else if (e.key === "Enter" && results[active]) {
              e.preventDefault();
              pin(results[active]);
            } else if (e.key === "Escape" && query) {
              e.stopPropagation();
              setQuery("");
            }
          }}
        />
      </label>
      {query.trim().length >= 2 && (
        <ul id={listId} className="fg-results-list" role="listbox" aria-label={t("fg_found")}>
          {!results.length && <li className="fg-muted">{t("optimizer_items_no_match")}</li>}
          {results.map((item, i) => {
            const isPinned = required.includes(item.ankama_id),
              isBanned = banned.includes(item.ankama_id),
              set = item.set_id != null ? setNames.get(item.set_id) : undefined;
            return (
              <li key={item.ankama_id} role="option" aria-selected={i === active} onMouseMove={() => setActive(i)}>
                <ItemArt item={item} />
                <span>
                  <b>{item.name}</b>
                  <small>
                    {t("sets_bracket_single", { level: item.level })} · {t(slotNameKey(slotsFor(item)[0]))}
                    {set && ` · ${set}`}
                  </small>
                </span>
                <button
                  aria-pressed={isPinned}
                  aria-label={isPinned ? t("fg_unpin_item", { name: item.name }) : t("fg_pin_item", { name: item.name })}
                  onClick={() => (isPinned ? release(item.ankama_id) : pin(item))}
                >
                  <Pin size={14} /> {t("optimizer_items_pin")}
                </button>
                <button
                  className="is-danger"
                  aria-pressed={isBanned}
                  aria-label={isBanned ? t("fg_allow_item", { name: item.name }) : t("fg_ban_item", { name: item.name })}
                  onClick={() => (isBanned ? release(item.ankama_id) : ban(item.ankama_id))}
                >
                  <Ban size={14} /> {t("fg_ban")}
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {worn.length > 0 && (
        <div className="fg-worn" role="group" aria-label={t("fg_worn_aria")}>
          <span>{t("fg_worn")}</span>
          {worn.map((item) => {
            const on = required.includes(item.ankama_id);
            return (
              <button
                key={item.ankama_id}
                aria-pressed={on}
                aria-label={on ? t("fg_unpin_item", { name: item.name }) : t("fg_pin_item", { name: item.name })}
                title={item.name}
                onClick={() => toggleRequired(item.ankama_id)}
              >
                <ItemArt item={item} size={30} />
                {on && <Pin size={11} className="fg-pin-mark" />}
              </button>
            );
          })}
        </div>
      )}
      {forge.placements.length > 0 && (
        <div className="fg-picked">
          <h5>
            {t("fg_pinned_count", { n: forge.placements.length })}
            <button className="fg-link" onClick={clearRequired}>
              {t("optimizer_items_clear")}
            </button>
          </h5>
          <ul>
            {forge.placements.map((p) => {
              const problem = issue(p),
                name = p.item?.name ?? `#${p.id}`;
              return (
                <li key={p.id} className={problem ? "is-problem" : ""}>
                  <ItemArt item={p.item} size={28} />
                  <span>
                    <b>{name}</b>
                    <small>
                      {problem ? (
                        <>
                          <AlertTriangle size={12} /> {problem}
                        </>
                      ) : p.status === "kept" ? (
                        t("optimizer_items_kept")
                      ) : (
                        p.slot && t("optimizer_items_goes_to", { slot: t(slotNameKey(p.slot)) })
                      )}
                      {!problem && p.overLevel && p.item && (
                        <em> · {t("optimizer_items_over_level", { level: p.item.level })}</em>
                      )}
                    </small>
                  </span>
                  <button aria-label={t("fg_unpin_item", { name })} onClick={() => release(p.id)}>
                    <X size={14} />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      {banned.length > 0 && (
        <div className="fg-picked is-banned">
          <h5>
            {t("fg_banned_count", { n: banned.length })}
            <button className="fg-link" onClick={clearBanned}>
              {t("optimizer_items_clear")}
            </button>
          </h5>
          <ul>
            {banned.map((id) => {
              const item = forge.itemsById.get(id),
                name = item?.name ?? `#${id}`;
              return (
                <li key={id}>
                  <ItemArt item={item} size={28} />
                  <span>
                    <b>{name}</b>
                  </span>
                  <button aria-label={t("fg_allow_item", { name })} onClick={() => release(id)}>
                    <X size={14} />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}

function PassivesRule({ forge }: { forge: ForgeState }) {
  const { t } = useTranslation();
  const mode = forge.config.passives,
    on = mode !== "off",
    excluded = useMemo(() => new Set(forge.config.passiveExcluded), [forge.config.passiveExcluded]);
  const sections = useMemo(() => {
    const out = new Map<PassiveSection, AppItem[]>(PASSIVE_SECTIONS.map((s) => [s, []]));
    for (const id of orderPassiveItems()) {
      const item = forge.itemsById.get(id);
      if (item) out.get(passiveSection(item))!.push(item);
    }
    for (const list of out.values()) list.sort((a, b) => b.level - a.level || a.name.localeCompare(b.name));
    return out;
  }, [forge.itemsById]);
  const state = useMemo(() => forgePassiveState(on ? mode : "max", forge.plannerPassives), [on, mode, forge.plannerPassives]);
  const [openSection, setOpenSection] = useState<PassiveSection | null>(null);
  function include(ids: number[], yes: boolean) {
    const next = new Set(excluded);
    for (const id of ids) {
      if (yes) next.delete(id);
      else next.add(id);
    }
    forge.setConfig((c) => ({ ...c, passiveExcluded: [...next] }));
  }
  const setMode = (passives: ForgePassiveMode) => forge.setConfig((c) => ({ ...c, passives }));
  return (
    <section className="fg-rule" aria-label={t("optimizer_passives")}>
      <h4>{t("tool_passives")}</h4>
      <label className="fg-check">
        <input type="checkbox" checked={on} onChange={(e) => setMode(e.target.checked ? "max" : "off")} />
        {t("optimizer_passives_count")}
      </label>
      {on && (
        <div className="fg-segment" role="radiogroup" aria-label={t("fg_passive_mode")}>
          {PASSIVE_MODES.filter((m): m is Exclude<ForgePassiveMode, "off"> => m !== "off").map((m) => (
            <button key={m} role="radio" aria-checked={mode === m} onClick={() => setMode(m)}>
              {t(`optimizer_passives_${m}`)}
            </button>
          ))}
        </div>
      )}
      <p>{t(`optimizer_passives_${mode}_hint`)}</p>
      {on && (
        <ul className="fg-passive-sections">
          {PASSIVE_SECTIONS.map((section) => {
            const items = sections.get(section)!;
            if (!items.length) return null;
            const ids = items.map((it) => it.ankama_id),
              count = ids.filter((id) => !excluded.has(id)).length,
              label = t(`optimizer_passive_section_${section}`),
              open = openSection === section;
            return (
              <li key={section}>
                <div className="fg-passive-head">
                  <label className="fg-check">
                    <input
                      type="checkbox"
                      checked={count > 0}
                      ref={(el) => {
                        if (el) el.indeterminate = count > 0 && count < ids.length;
                      }}
                      onChange={() => include(ids, count < ids.length)}
                    />
                    {label}
                  </label>
                  <small>{t("fg_of", { n: count, total: ids.length })}</small>
                  <button
                    aria-expanded={open}
                    aria-label={t("optimizer_passive_section_configure", { section: label })}
                    onClick={() => setOpenSection(open ? null : section)}
                  >
                    <Settings2 size={15} />
                  </button>
                </div>
                {open && (
                  <ul>
                    {items.map((item) => {
                      const counted = !excluded.has(item.ankama_id),
                        parts = bonusParts(orderPassiveBonus(item.ankama_id, state));
                      return (
                        <li key={item.ankama_id} className={counted ? "" : "is-off"}>
                          <label className="fg-check">
                            <input type="checkbox" checked={counted} onChange={() => include([item.ankama_id], !counted)} />
                            <ItemArt item={item} size={24} />
                            <span>{item.name}</span>
                          </label>
                          <span className="fg-bonus">
                            {parts.length === 0 ? (
                              <em>{t("optimizer_passive_not_set")}</em>
                            ) : (
                              parts.map((p) => (
                                <span key={p.key} className={p.negative ? "is-negative" : ""}>
                                  <img src={statIconUrl(p.icon)} alt="" />
                                  {p.value}
                                  <span className="sr-only"> {t(p.tKey)}</span>
                                </span>
                              ))
                            )}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function Rules({ forge }: { forge: ForgeState }) {
  const { t } = useTranslation();
  const { config, setConfig } = forge;
  return (
    <section className="fg-rules" aria-labelledby="fg-rules-title">
      <header className="fg-step">
        <h3 id="fg-rules-title">{t("fg_rules_title")}</h3>
      </header>
      <section className="fg-rule" aria-label={t("optimizer_intensity")}>
        <h4>{t("forgeguide_intensity_title")}</h4>
        <div className="fg-segment" role="radiogroup" aria-label={t("optimizer_intensity")}>
          {(Object.keys(INTENSITY) as ForgeIntensity[]).map((k) => (
            <button
              key={k}
              role="radio"
              aria-checked={config.intensity === k}
              className={k === "eternal" ? "is-eternal" : ""}
              onClick={() => setConfig((c) => ({ ...c, intensity: k }))}
            >
              {k === "eternal" && <InfinityIcon size={14} />}
              {t(`optimizer_intensity_${k}`)}
            </button>
          ))}
        </div>
        <p>{t(`optimizer_intensity_${config.intensity}_hint`)}</p>
      </section>
      <section className="fg-rule" aria-label={t("fg_level_chars")}>
        <h4>{t("fg_level_chars")}</h4>
        <div className="fg-inline">
          <label className="fg-num">
            <span>{t("optimizer_max_level")}</span>
            <NumberInput
              value={config.maxLevel}
              label={t("optimizer_max_level_hint")}
              placeholder="200"
              max={200}
              onCommit={(v) => setConfig((c) => ({ ...c, maxLevel: clampLevel(v) }))}
            />
          </label>
          <label className="fg-check" title={t("optimizer_assume_scrolled_hint")}>
            <input
              type="checkbox"
              checked={config.assumeFullyScrolled}
              onChange={(e) => setConfig((c) => ({ ...c, assumeFullyScrolled: e.target.checked }))}
            />
            {t("optimizer_assume_scrolled")}
          </label>
        </div>
      </section>
      <section className="fg-rule" aria-label={t("optimizer_slots")}>
        <h4>
          {t("fg_slots_title")}
          <button className="fg-link" aria-expanded={forge.showSlots} onClick={() => forge.setShowSlots((s) => !s)}>
            {t("fg_of", { n: forge.activeSlots, total: ALL_SLOTS.length })}
            <ChevronDown size={14} />
          </button>
        </h4>
        <p>{t("optimizer_slots_hint")}</p>
        {forge.showSlots && (
          <>
            <div className="fg-inline">
              <button className="fg-link" onClick={() => setConfig((c) => ({ ...c, lockedSlots: new Set<SlotId>() }))}>
                {t("optimizer_slot_mark_all")}
              </button>
              <button className="fg-link" onClick={() => setConfig((c) => ({ ...c, lockedSlots: new Set(ALL_SLOTS) }))}>
                {t("optimizer_slot_clear_all")}
              </button>
            </div>
            <div className="fg-slots">
              {ALL_SLOTS.map((slot) => (
                <label key={slot} className="fg-check">
                  <input type="checkbox" checked={!config.lockedSlots.has(slot)} onChange={() => forge.toggleSlot(slot)} />
                  {t(SLOT_LABEL_KEY[slot])}
                  {forge.pinnedSlots.has(slot) && (
                    <Pin size={12} aria-label={t("optimizer_slot_pinned", { name: forge.pinnedSlots.get(slot) })} />
                  )}
                </label>
              ))}
            </div>
          </>
        )}
      </section>
      <section className="fg-rule" aria-label={t("fg_dofus_kinds_title")}>
        <h4>{t("fg_dofus_kinds_title")}</h4>
        <p>{t("fg_dofus_kinds_hint")}</p>
        <div className="fg-inline">
          <button className="fg-link" onClick={() => setConfig((c) => ({ ...c, excludedKinds: [] }))}>
            {t("optimizer_slot_mark_all")}
          </button>
          <button className="fg-link" onClick={() => setConfig((c) => ({ ...c, excludedKinds: [...DOFUS_KINDS] }))}>
            {t("optimizer_slot_clear_all")}
          </button>
        </div>
        <div className="fg-inline">
          {DOFUS_KINDS.map((kind) => (
            <label key={kind} className="fg-check">
              <input
                type="checkbox"
                checked={!config.excludedKinds.includes(kind)}
                onChange={(e) =>
                  setConfig((c) => ({
                    ...c,
                    excludedKinds: e.target.checked
                      ? c.excludedKinds.filter((k) => k !== kind)
                      : DOFUS_KINDS.filter((k) => k === kind || c.excludedKinds.includes(k)),
                  }))
                }
              />
              {t(`item_type_${kind}`)}
            </label>
          ))}
        </div>
      </section>
      <section className="fg-rule" aria-label={t("optimizer_forgemagie")}>
        <h4>{t("magesmithy")}</h4>
        <label className="fg-check" title={t("optimizer_transcendence_hint")}>
          <input
            type="checkbox"
            checked={config.transcendence}
            onChange={(e) => setConfig((c) => ({ ...c, transcendence: e.target.checked }))}
          />
          {t("optimizer_transcendence")}
        </label>
        <label className="fg-check" title={t("fg_pro_exo_hint")}>
          <input
            type="checkbox"
            checked={config.proExo}
            onChange={(e) => setConfig((c) => ({ ...c, proExo: e.target.checked }))}
          />
          {t("fg_pro_exo")}
        </label>
        {config.proExo && (
          <>
            <div className="fg-inline">
              <label className="fg-num">
                <span>{t("fg_pro_res")}</span>
                <select
                  value={config.proExoRes}
                  onChange={(e) => setConfig((c) => ({ ...c, proExoRes: Number(e.target.value) }))}
                >
                  {Array.from({ length: PRO_RES_MAX }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>
                      {n}%
                    </option>
                  ))}
                </select>
              </label>
              <label className="fg-num">
                <span>{t("fg_pro_max")}</span>
                <select
                  value={config.proExoMax}
                  onChange={(e) => setConfig((c) => ({ ...c, proExoMax: Number(e.target.value) }))}
                >
                  {Array.from({ length: 9 }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <p>
              {proDamage(config.proExoRes) > 0
                ? t("fg_pro_budget", { res: config.proExoRes, dmg: proDamage(config.proExoRes) })
                : t("fg_pro_budget_res_only", { res: config.proExoRes })}
            </p>
          </>
        )}
        <div className="fg-inline">
          {(["ap", "mp", "range"] as const).map((k) => (
            <label key={k} className="fg-check">
              <input
                type="checkbox"
                checked={config.exo[k]}
                onChange={(e) => setConfig((c) => ({ ...c, exo: { ...c.exo, [k]: e.target.checked } }))}
              />
              {t(`optimizer_exo_${k}`)}
            </label>
          ))}
        </div>
        <div className="fg-inline">
          <label className="fg-check">
            <input
              type="checkbox"
              checked={config.exo.onlyOnRing}
              onChange={(e) => setConfig((c) => ({ ...c, exo: { ...c.exo, onlyOnRing: e.target.checked } }))}
            />
            {t("optimizer_exo_only_ring")}
          </label>
          <label className="fg-num">
            <span>{t("optimizer_exo_max")}</span>
            <select
              value={config.exo.maxCount}
              onChange={(e) => setConfig((c) => ({ ...c, exo: { ...c.exo, maxCount: Number(e.target.value) } }))}
            >
              {[0, 1, 2, 3].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p>{t("optimizer_forgemagie_hint")}</p>
      </section>
      <PassivesRule forge={forge} />
      <Picks forge={forge} />
    </section>
  );
}

const EXO_ICON = { ap: "ap", mp: "mp", range: "range" } as const;

/** A forged piece: what it wears, how it scores against the order, and what to do with it. */
function ResultCard({
  forge,
  result,
  rank,
  ribbon,
  actions = true,
}: {
  forge: ForgeState;
  result: BuildResult;
  rank: number;
  ribbon?: string;
  actions?: boolean;
}) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const runeLabel = (stat: string) => {
    const k = runeStatLabelKey(stat);
    return k ? t(k) : stat;
  };
  const pieces = ALL_SLOTS.map((slot) => ({ slot, item: forge.itemsById.get(result.equipped[slot] ?? -1) })).filter(
    (e): e is { slot: SlotId; item: AppItem } => e.item != null,
  );
  // Only a locked slot keeps the player's own forged runes in the result.
  const forged = (slot: SlotId) =>
    forge.config.lockedSlots.has(slot) && Object.values(forge.runes[slot] ?? {}).some((v) => v > 0);
  // Minimums always show; ley-only stats fill the rest up to six.
  const goals = forge.config.stats.filter((r) => r.minimum > 0).sort((a, b) => b.weight - a.weight),
    leyOnly = forge.config.stats.filter((r) => r.minimum <= 0 && r.weight > 0).sort((a, b) => b.weight - a.weight),
    shown = [...goals, ...leyOnly].slice(0, Math.max(6, goals.length)),
    numbers = result.stats as unknown as Record<string, number>,
    pointsLeft = result.stats.pointsBudget - result.stats.pointsSpent,
    passives = pieces.some((p) => forge.countedPassivesRef.current.has(p.item.ankama_id));
  return (
    <article
      className={"fg-result" + (goals.length && !result.meetsRequired ? " is-unmet" : "")}
      aria-label={`${t("optimizer_rank", { n: rank })}${ribbon ? ` · ${ribbon}` : ""}`}
    >
      <div className="fg-result-head">
        <b className="fg-rank">{rank}</b>
        <span>
          <strong>{ribbon ?? t("optimizer_rank", { n: rank })}</strong>
          <small>
            {goals.length > 0 &&
              (result.meetsRequired
                ? t("fg_meets_all")
                : t("fg_meets_some", { met: result.requirementsMet, count: result.requirementsTotal }))}
            {passives && ` · ${t("optimizer_with_passives")}`}
          </small>
        </span>
        <span className="fg-quality" title={t("optimizer_quality_hint")}>
          {t("optimizer_quality")} <b className={result.score < 0 ? "is-negative" : ""}>{group(result.score, i18n.language)}</b>
        </span>
      </div>
      <div className="fg-pieces" aria-hidden="true">
        {pieces.map(({ slot, item }) => {
          const exo = result.exo[slot],
            rune = result.runes[slot],
            pinned = forge.required.includes(item.ankama_id);
          return (
            <span
              key={slot}
              className={"fg-piece" + (pinned ? " is-pinned" : "") + (exo || rune || forged(slot) ? " is-forged" : "")}
              title={item.name}
            >
              <ItemArt item={item} size={34} />
              {exo && <img className="fg-badge" src={statIconUrl(EXO_ICON[exo])} alt="" />}
              {rune && <img className="fg-badge" src={runeIconUrl(rune.stat) ?? signatureRuneUrl()} alt="" />}
              {!exo && !rune && forged(slot) && <img className="fg-badge" src={signatureRuneUrl()} alt="" />}
              {pinned && <Pin size={11} className="fg-pin-mark" />}
            </span>
          );
        })}
      </div>
      {shown.length > 0 && (
        <dl className="fg-result-stats">
          {shown.map((cfg) => {
            const meta = OPTIMIZER_STATS.find((s) => s.key === cfg.stat);
            if (!meta) return null;
            const own = numbers[cfg.stat] ?? 0,
              value = POWER_BOOSTED.has(cfg.stat) ? own + result.stats.power : own,
              ok = cfg.minimum <= 0 || value >= cfg.minimum;
            return (
              <div
                key={cfg.stat}
                className={ok ? "" : "is-unmet"}
                title={POWER_BOOSTED.has(cfg.stat) ? t("optimizer_power_included", { own, power: result.stats.power }) : undefined}
              >
                <dt>
                  <img src={statIconUrl(meta.icon)} alt="" />
                  {t(meta.tKey)}
                </dt>
                <dd>
                  <b>{value}</b>
                  {cfg.minimum > 0 && <small>/ {cfg.minimum}</small>}
                  {cfg.minimum > 0 && value > cfg.minimum && <em>+{value - cfg.minimum}</em>}
                </dd>
              </div>
            );
          })}
        </dl>
      )}
      <button className="fg-disclosure" aria-expanded={open} onClick={() => setOpen(!open)}>
        <ChevronDown size={15} />
        {open ? t("fg_hide_pieces") : t("fg_show_pieces", { count: pieces.length })}
      </button>
      {open && (
        <ul className="fg-piece-list">
          {pieces.map(({ slot, item }) => {
            const exo = result.exo[slot],
              rune = result.runes[slot],
              pinned = forge.required.includes(item.ankama_id),
              passive = forge.countedPassivesRef.current.has(item.ankama_id),
              locked = forge.config.lockedSlots.has(slot),
              banned = forge.banned.includes(item.ankama_id);
            return (
              <li key={slot}>
                <ItemArt item={item} size={30} />
                <span>
                  <b>{item.name}</b>
                  <small>
                    {t("cmp_name_level", { name: t(SLOT_LABEL_KEY[slot]), level: item.level })}
                    {pinned && ` · ${t("fg_tag_pinned")}`}
                    {locked && ` · ${t("fg_tag_kept")}`}
                    {forged(slot) && ` · ${t("fg_tag_runes")}`}
                    {exo && ` · ${t(`optimizer_exo_${exo}`)}`}
                    {rune &&
                      ` · ${t(rune.exotic ? "fg_pro_badge" : "optimizer_rune_badge", { value: rune.value, stat: runeLabel(rune.stat) })}`}
                    {passive && ` · ${t("optimizer_passive_badge")}`}
                  </small>
                </span>
                {actions && !pinned && !locked && (
                  <button aria-label={t("fg_pin_next", { name: item.name })} onClick={() => forge.pinItem(item.ankama_id)}>
                    <Pin size={14} /> {t("optimizer_items_pin")}
                  </button>
                )}
                {actions && !pinned && !locked && !banned && (
                  <button className="is-danger" aria-label={t("fg_ban_item", { name: item.name })} onClick={() => forge.banItem(item.ankama_id)}>
                    <Ban size={14} /> {t("fg_ban")}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <div className="fg-card-foot">
        {pointsLeft > 0 && <small>{t("optimizer_points_left", { n: pointsLeft })}</small>}
        <button className="primary site-primary" onClick={() => forge.loadBuild(result)}>
          {t("optimizer_load_build")} →
        </button>
      </div>
    </article>
  );
}

function Checklist({ forge, result }: { forge: ForgeState; result: BuildResult }) {
  const { t } = useTranslation();
  const checks = requirementChecks(forge.activeReqs, result);
  if (!checks.length) return null;
  return (
    <ul className="fg-checklist" aria-label={t("fg_checklist")}>
      {checks.map(({ requirement: r, meta, value, ok }) => (
        <li key={r.stat} className={ok ? "is-ok" : "is-missing"}>
          {ok ? <Check size={14} aria-label={t("fg_met")} /> : <X size={14} aria-label={t("fg_missing")} />}
          <img src={statIconUrl(meta.icon)} alt="" />
          <span>{t(meta.tKey)}</span>
          <b>
            {value}
            <small> / {r.minimum}</small>
          </b>
        </li>
      ))}
    </ul>
  );
}

function Surplus({ forge, result }: { forge: ForgeState; result: BuildResult }) {
  const { t, i18n } = useTranslation();
  const { rows, total } = surplusRows(forge.activeReqs, result);
  if (!rows.length) return null;
  return (
    <section className="fg-surplus" aria-label={t("optimizer_surplus_title")}>
      <h4>
        {t("fg_surplus_title")}
        <span>{t("fg_surplus_total", { n: group(total, i18n.language) })}</span>
      </h4>
      <p>{t("optimizer_surplus_hint")}</p>
      <ul>
        {rows.map(({ r, raw, extra, worth, capped }) => {
          const meta = META_MAP.get(r.stat);
          if (!meta) return null;
          return (
            <li key={r.stat} title={t("optimizer_surplus_row", { value: raw, min: r.minimum })}>
              <img src={statIconUrl(meta.icon)} alt="" />
              <span>{t(meta.tKey)}</span>
              <b>
                +{extra}
                {capped && <small> ({t("optimizer_surplus_capped")})</small>}
              </b>
              <em>{group(worth, i18n.language)}</em>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Forging({ forge }: { forge: ForgeState }) {
  const { t, i18n } = useTranslation();
  const best = forge.results[0],
    eternal = forge.config.intensity === "eternal";
  const stage = forge.tempering
    ? "optimizer_stage_tempering"
    : !best
      ? "optimizer_stage_lighting"
      : !best.meetsRequired
        ? "optimizer_stage_melting"
        : forge.heat > 0.5
          ? "optimizer_stage_shaping"
          : "optimizer_stage_cooling";
  const pct = Math.round(Math.max(0.04, Math.min(1, forge.tempering ? 0 : forge.heat)) * 100);
  return (
    <div className="fg-forging">
      <section className="fg-furnace" aria-label={t("fg_furnace")}>
        <ForgeScene heat={forge.tempering ? 0.2 : Math.max(0.1, forge.heat)} burst={forge.burst} tempering={forge.tempering} />
        <div className="fg-heat">
          <p aria-live="polite">
            <Flame size={16} />
            <b>{t(stage)}</b>
            {eternal && <span>∞ {t("optimizer_intensity_eternal")}</span>}
          </p>
          <div role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={t("optimizer_heat")}>
            <i style={{ width: `${pct}%` }} />
          </div>
          <small>{eternal ? t("optimizer_heat_eternal_hint") : t("optimizer_heat_hint")}</small>
        </div>
        <dl className="fg-counters">
          <div>
            <dt>{t("fg_time")}</dt>
            <dd>{forge.elapsed} s</dd>
          </div>
          <div title={t("optimizer_strikes_hint")}>
            <dt>{t("fg_tried")}</dt>
            <dd>{formatCount(forge.strikes)}</dd>
          </div>
          <div title={t("optimizer_quality_hint")}>
            <dt>{t("optimizer_quality")}</dt>
            <dd className={best && best.score < 0 ? "is-negative" : ""}>{best ? group(best.score, i18n.language) : "—"}</dd>
          </div>
        </dl>
        {forge.settled && !forge.tempering && <p className="fg-note">{t("optimizer_plateau_hint")}</p>}
        <div className="fg-actions">
          <button
            onClick={forge.stoke}
            disabled={!forge.bellowsReady || forge.tempering || !best}
            title={t("optimizer_bellows_hint")}
          >
            <Wind size={15} /> {t("optimizer_bellows")}
          </button>
          <button className="primary site-primary" onClick={forge.finishForging} disabled={!best || forge.tempering}>
            <Anvil size={15} /> {t("optimizer_temper_now")}
          </button>
          <button onClick={forge.extinguish}>{t("optimizer_extinguish")}</button>
        </div>
      </section>
      <section className="fg-progress" aria-label={t("fg_progress")}>
        {best && <Checklist forge={forge} result={best} />}
        <section className="fg-log" aria-label={t("optimizer_log_title")}>
          <h4>{t("optimizer_log_title")}</h4>
          <ul aria-live="polite">
            {!forge.log.length && <li className="fg-muted">{t("optimizer_log_empty")}</li>}
            {forge.log.map((e) => (
              <li key={e.id} className={"tone-" + e.tone}>
                {e.text}
              </li>
            ))}
          </ul>
        </section>
        {best && (
          <>
            <h4 className="fg-subtitle">{t("optimizer_on_the_anvil")}</h4>
            <ResultCard forge={forge} result={best} rank={1} actions={false} />
          </>
        )}
      </section>
    </div>
  );
}

function Forged({ forge }: { forge: ForgeState }) {
  const { t } = useTranslation();
  const [masterpiece, ...others] = forge.results;
  return (
    <div className="fg-forged">
      <div className="fg-forged-head">
        <h3>{t("optimizer_forged_title")}</h3>
        <div className="fg-actions">
          <button title={t("optimizer_reforge_hint")} onClick={() => forge.lightForge(forge.results.map((r) => r.equipped))}>
            <Flame size={15} /> {t("optimizer_reforge")}
          </button>
          <button onClick={() => forge.lightForge()}>
            <RotateCcw size={15} /> {t("optimizer_forge_again")}
          </button>
          <button onClick={() => forge.setPhase("order")}>
            <Settings2 size={15} /> {t("optimizer_adjust_order")}
          </button>
        </div>
      </div>
      {!masterpiece ? (
        <p className="fg-empty">{t("optimizer_nothing_forged")}</p>
      ) : (
        <>
          {!masterpiece.meetsRequired && (
            <p className="fg-note" role="status">
              {t("optimizer_unmet_advice", { met: masterpiece.requirementsMet, total: masterpiece.requirementsTotal })}
            </p>
          )}
          <div className="fg-forged-grid">
            <div>
              <ResultCard
                forge={forge}
                result={masterpiece}
                rank={1}
                ribbon={masterpiece.meetsRequired ? t("optimizer_masterpiece") : t("optimizer_best_piece")}
              />
              <Surplus forge={forge} result={masterpiece} />
            </div>
            {others.length > 0 && (
              <section aria-label={t("optimizer_other_pieces")}>
                <h4 className="fg-subtitle">{t("optimizer_other_pieces")}</h4>
                {others.slice(0, 4).map((r, i) => (
                  <ResultCard key={fingerprint(r)} forge={forge} result={r} rank={i + 2} />
                ))}
              </section>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function Order({ forge }: { forge: ForgeState }) {
  const { t, i18n } = useTranslation();
  return (
    <div className="fg-order">
      {forge.error && (
        <p className="fg-error" role="alert">
          <AlertTriangle size={16} /> {forge.error}
        </p>
      )}
      <div className="fg-context">
        <span>
          {t("fg_base", { level: forge.level })}
          {CHARACTERISTICS.filter((c) => forge.scrolled[c]).length > 0 && ` · ${t("fg_scrolled_in")} `}
          {CHARACTERISTICS.filter((c) => forge.scrolled[c]).map((c) => {
            const meta = META_MAP.get(c);
            return meta ? <img key={c} src={statIconUrl(meta.icon)} alt={t(meta.tKey)} title={t(meta.tKey)} /> : null;
          })}
        </span>
        <span>{t("optimizer_points_auto")}</span>
        <a href={`/${langPathPrefix(i18n.language)}forge-guide`} target="_blank" rel="noopener">
          <BookOpen size={14} /> {t("optimizer_guide_link")}
        </a>
      </div>
      <div className="fg-columns">
        <Goals forge={forge} />
        <Rules forge={forge} />
      </div>
      <div className="fg-footer">
        <span>
          {forge.activeReqs.length
            ? `${t("fg_goals", { count: forge.activeReqs.length })} · ${t("fg_slots", { count: forge.activeSlots })} · ${t(`optimizer_intensity_${forge.config.intensity}`)}`
            : t("fg_empty_order")}
        </span>
        <button onClick={forge.handleClose}>{t("optimizer_cancel")}</button>
        <button
          className={"primary site-primary" + (forge.config.intensity === "eternal" ? " is-eternal" : "")}
          onClick={() => forge.lightForge()}
        >
          <Flame size={16} /> {t("optimizer_light_forge")}
        </button>
      </div>
    </div>
  );
}

/** La Forjadora with its own presentation; every rule and the search come from useForge. */
/** La Forjadora: a full-window dialog over the workshop, in three steps
 * (order, search, results), driven by useForge. */
export function OptimizerModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return <ForgeDialog onClose={onClose} />;
}

function ForgeDialog({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const forge = useForge({ open: true, onClose });
  const ref = useRef<HTMLDivElement>(null);
  // Production's trap: only the topmost window answers Tab and Escape.
  useFocusTrap(ref, true, forge.handleClose);
  useEffect(() => {
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
    };
  }, []);
  let body: ReactNode;
  if (forge.phase === "locked")
    body = (
      <div className="fg-locked">
        <Lock size={20} />
        <h3>{t("optimizer_locked_title")}</h3>
        <p>{t("optimizer_locked_hint")}</p>
        <div className="fg-locked-picker">
          <ClassPicker heading={false} />
        </div>
      </div>
    );
  else if (forge.phase === "forging") body = <Forging forge={forge} />;
  else if (forge.phase === "forged") body = <Forged forge={forge} />;
  else body = <Order forge={forge} />;
  return createPortal(
    <div className="fg-overlay" onClick={(e) => { if (e.target === e.currentTarget && forge.phase !== "forging") forge.handleClose(); }}>
      <div ref={ref} className="fg-dialog" role="dialog" aria-modal="true" aria-label={t("optimizer_title")} tabIndex={-1}>
        <div className="fg-header">
          <button type="button" onClick={forge.handleClose} aria-label={t("fg_back")}>
            <ArrowLeft size={18} aria-hidden="true" />
            <span>{t("fg_back")}</span>
          </button>
          <div>
            <h2>{t("optimizer_title")}</h2>
          </div>
          <ol className="fg-phases" aria-label={t("fg_steps")}>
            <li aria-current={forge.phase === "order" || forge.phase === "locked" ? "step" : undefined}>{t("fg_step_order")}</li>
            <li aria-current={forge.phase === "forging" ? "step" : undefined}>{t("fg_step_search")}</li>
            <li aria-current={forge.phase === "forged" ? "step" : undefined}>{t("fg_step_results")}</li>
          </ol>
        </div>
        <div className="fg-body">{body}</div>
      </div>
    </div>,
    document.body,
  );
}
