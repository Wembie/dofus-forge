import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { ArrowRight, Crosshair, EyeOff, Repeat2, Sparkles, Timer } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useBuildStore } from "../../../src/store/buildStore";
import { IGNORED_EFFECT_IDS } from "../../../src/engine/statMap";
import { SPELL_ITEM_EFFECT_IDS } from "../../../src/data/effectIds";
import { isAttackEffect } from "../../../src/features/equipment/catalogFilters";
import {
  STAT_META,
  fmtValue,
  isIgnored,
  statIconUrl,
} from "../../../src/features/equipment/statDisplay";
import { useStatLabel } from "./stat-labels";
import type { AppEffect, AppItem } from "../../../src/data/loaders";

/** Effects production shows on an item card: no display-only junk, attacks apart for weapons. */
export function itemFacts(item: AppItem) {
  const all = item.effects.filter(
      (e) =>
        !isIgnored(e.stat) &&
        (e.effect_id == null || !IGNORED_EFFECT_IDS.has(e.effect_id)),
    ),
    weapon = item.slot === "weapon" || item.ap_cost != null;
  return {
    attack: weapon ? all.filter(isAttackEffect) : [],
    stats: weapon ? all.filter((e) => !isAttackEffect(e)) : all,
    spells: item.effects.filter(
      (e) => e.formatted && SPELL_ITEM_EFFECT_IDS.has(e.effect_id ?? -1),
    ),
  };
}

const SPELL_STAT_ICONS: Record<number, string> = {
  204: "Range",
  207: "AP",
  208: "Range",
  226: "% Critical",
  243: "Damage",
  245: "Damage",
  274: "Range",
};
const SPELL_SPECIAL_ICONS: Record<number, LucideIcon> = {
  205: EyeOff,
  209: EyeOff,
  227: Timer,
  240: Crosshair,
  276: Repeat2,
  279: Repeat2,
};

function EffectRow({ effect, attack }: { effect: AppEffect; attack?: boolean }) {
  const { t } = useTranslation(),
    meta = STAT_META[effect.stat],
    negative = !attack && effect.min < 0,
    value = attack
      ? effect.min === effect.max || effect.max === 0
        ? String(effect.min)
        : `${effect.min} – ${effect.max}`
      : fmtValue(effect.min, effect.max, t("range_sep_neg"));
  return (
    <li className={negative ? "is-negative" : undefined}>
      {meta?.icon ? (
        <img src={statIconUrl(meta.icon)} alt="" loading="lazy" />
      ) : (
        <i />
      )}
      <b>{value}</b>
      <span>{meta ? t(meta.tKey) : effect.stat}</span>
    </li>
  );
}

/** Everything the old card showed, so an item reads without opening it. */
export function ItemFactsList({ item }: { item: AppItem }) {
  const { t } = useTranslation(),
    { attack, stats, spells } = itemFacts(item);
  return (
    <>
      {item.ability && (
        <div className="facts-ability">
          {item.ability
            .split("\n")
            .filter(Boolean)
            .map((line, i) => (
              <p key={i}>{line}</p>
            ))}
        </div>
      )}
      {attack.length > 0 && (
        <section className="facts-group" aria-label={t("cat_v4_weapon_attack")}>
          <h5>{t("cat_v4_attack")}</h5>
          <ul className="facts-effects is-attack">
            {attack.map((e, i) => (
              <EffectRow key={i} effect={e} attack />
            ))}
          </ul>
        </section>
      )}
      {stats.length > 0 && (
        <section className="facts-group" aria-label={t("effects")}>
          {attack.length > 0 && <h5>{t("effects")}</h5>}
          <ul className="facts-effects">
            {stats.map((e, i) => (
              <EffectRow key={i} effect={e} />
            ))}
          </ul>
        </section>
      )}
      {spells.length > 0 && (
        <section className="facts-group" aria-label={t("cat_v4_spell_effects")}>
          <h5>
            <Sparkles size={11} aria-hidden="true" /> {t("cat_v4_spell_effects")}
          </h5>
          <ul className="facts-spells">
            {spells.map((e, i) => {
              const text = e.formatted!,
                cut = text.indexOf(":"),
                Icon = SPELL_SPECIAL_ICONS[e.effect_id ?? -1],
                meta = STAT_META[SPELL_STAT_ICONS[e.effect_id ?? -1] ?? "Damage"];
              return (
                <li key={i}>
                  <span className="facts-spell-icon">
                    {Icon ? (
                      <Icon size={13} strokeWidth={1.8} />
                    ) : (
                      <img src={statIconUrl(meta.icon)} alt="" />
                    )}
                  </span>
                  <span>
                    <b>{cut >= 0 ? text.slice(0, cut).trim() : text}</b>
                    {cut >= 0 && <small>{text.slice(cut + 1).trim()}</small>}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}
      {item.description && <p className="facts-lore">{item.description}</p>}
    </>
  );
}

/**
 * Shows a card in the side panel when the pointer rests on it, so the impact
 * reads without a click (the click equips, as in production). The short delay
 * keeps cards crossed on the way to the panel from replacing it.
 */
export function useHoverIntent<T>(show: (value: T) => void, delay = 160) {
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  return {
    enter(value: T) {
      // Only while the panel sits beside the grid; on one column it would swap the view.
      if (!matchMedia("(hover: hover) and (min-width: 701px)").matches) return;
      clearTimeout(timer.current);
      timer.current = window.setTimeout(() => show(value), delay);
    },
    leave() {
      clearTimeout(timer.current);
    },
  };
}

/** Hover or focus peek of a piece, in place of production's item tooltip. */
export function ItemPeek({
  item,
  children,
}: {
  item: AppItem;
  children: ReactNode;
}) {
  const { t } = useTranslation(),
    [open, setOpen] = useState(false),
    anchor = useRef<HTMLSpanElement>(null),
    card = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (!open || !anchor.current || !card.current) return;
    const a = anchor.current.getBoundingClientRect(),
      c = card.current.getBoundingClientRect(),
      left = Math.min(Math.max(8, a.left + a.width / 2 - c.width / 2), innerWidth - c.width - 8),
      below = a.bottom + 8 + c.height < innerHeight;
    Object.assign(card.current.style, {
      left: left + "px",
      top: (below ? a.bottom + 8 : Math.max(8, a.top - c.height - 8)) + "px",
      visibility: "visible",
    });
  }, [open]);
  return (
    <span
      ref={anchor}
      className="peek-anchor"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {children}
      {open &&
        createPortal(
        <div ref={card} className="item-peek" role="tooltip">
          <header>
            <img src={item.image_url || "/design-assets/forge-mark.svg"} alt="" />
            <span>
              <b>{item.name}</b>
              <small>{t("cat_v4_level_short", { level: item.level })}</small>
            </span>
          </header>
          <ItemFactsList item={{ ...item, description: undefined }} />
        </div>,
          // Inside the open dialog: it sits in the top layer, and the cards' containment would clip it.
          anchor.current?.closest("dialog") ?? document.body,
        )}
    </span>
  );
}

const DELTA_KEYS = [
  "maxHp",
  "ap",
  "mp",
  "range",
  "strength",
  "intelligence",
  "chance",
  "agility",
  "power",
  "critChance",
] as const;

/** Current build → build with the change, the same ten totals in both pickers. */
export function ImpactDeltas({
  preview,
}: {
  preview: Partial<Record<(typeof DELTA_KEYS)[number], number>>;
}) {
  const stats = useBuildStore((s) => s.stats),
    label = useStatLabel();
  return (
    <dl className="catalog-deltas">
      {DELTA_KEYS.map((key) => {
        const before = stats?.[key] ?? 0,
          after = preview[key] || 0,
          diff = after - before;
        return (
          <div key={key} className={diff ? "has-change" : undefined}>
            <dt>{label(key)}</dt>
            <dd>
              {before} <ArrowRight size={12} aria-hidden="true" /> <b>{after}</b>
              <em className={diff < 0 ? "negative" : diff > 0 ? "positive" : ""}>
                {diff > 0 ? "+" : ""}
                {diff}
              </em>
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
