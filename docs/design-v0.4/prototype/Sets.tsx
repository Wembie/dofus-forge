import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ChartNoAxesColumn,
  Check,
  ExternalLink,
  Search,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useBuildStore } from "../../../src/store/buildStore";
import { useDataStore } from "../../../src/store/dataStore";
import {
  levelCap,
  changeLevelRange,
} from "../../../src/features/equipment/catalogFilters";
import {
  STAT_META,
  fmtValue,
  isIgnored,
  statIconUrl,
} from "../../../src/features/equipment/statDisplay";
import { assignSetSlots } from "../../../src/features/equipment/setSlots";
import { SLOT_CONFIGS } from "../../../src/features/equipment/slotConfig";
import { setPath } from "../../../src/features/set-guide/setGuideLinks";
import type { SlotId } from "../../../src/store/buildStore";
import { normalizeSearch } from "../../../src/ui/normalize";
import { equipment, previewItems, visibleSlots } from "./model";
import { Modal } from "./SurfaceModal";
import { ImpactDeltas, ItemPeek, useHoverIntent } from "./ItemFacts";
import { useInfiniteList } from "./useInfiniteList";
import type { AppEffect, AppItem, AppSet } from "../../../src/data/loaders";
import "./catalog.css";

interface Entry {
  set: AppSet;
  items: AppItem[];
  minLevel: number;
  maxLevel: number;
  top: number;
  topBonus: AppEffect[];
}
const LEVELS = [0, 20, 40, 60, 80, 100, 120, 140, 160, 180, 200];
const level = (e: Entry) =>
  e.minLevel === e.maxLevel ? e.minLevel : `${e.minLevel}–${e.maxLevel}`;

function Bonus({ effects }: { effects: AppEffect[] }) {
  const { t } = useTranslation();
  if (!effects.length) return <span>{t("cat_v4_no_effects")}</span>;
  return (
    <>
      {effects.map((e, i) => {
        const meta = STAT_META[e.stat];
        return (
          <span key={i} className={e.min < 0 ? "is-negative" : undefined}>
            {meta?.icon && <img src={statIconUrl(meta.icon)} alt="" />}
            <b>{fmtValue(e.min, e.max)}</b> {meta ? t(meta.tKey) : e.stat}
          </span>
        );
      })}
    </>
  );
}

/**
 * Set cards that show every piece and the full-set bonus without a click,
 * equip in one press, and open a panel with where each piece goes, the tier
 * reached and what the build gains. `open` starts on that set, for links from
 * an item or a set page.
 */
export function Sets({
  onClose,
  open,
  onEquipped = onClose,
}: {
  onClose: () => void;
  open?: number;
  onEquipped?: () => void;
}) {
  const { t, i18n } = useTranslation(),
    build = useBuildStore(),
    sets = useDataStore((s) => s.sets) || [],
    slugs = useDataStore((s) => s.setSlugs);
  const [query, setQuery] = useState(""),
    [range, setRange] = useState({ min: 0, max: 200 }),
    [pieces, setPieces] = useState(0),
    [sort, setSort] = useState("desc"),
    [picked, setSelected] = useState<Entry | null | undefined>(undefined);
  const detailRef = useRef<HTMLHeadingElement>(null),
    lastRow = useRef<HTMLButtonElement | null>(null);
  const entries = useMemo(
    () =>
      sets.flatMap((set): Entry[] => {
        const items = set.items.flatMap((id) => equipment.get(id) ?? []);
        if (set.items.length < 2 || !items.length) return [];
        const levels = items.map((it) => it.level),
          top = Math.max(...Object.keys(set.bonuses).map(Number));
        return [
          {
            set,
            items,
            minLevel: Math.min(...levels),
            maxLevel: Math.max(...levels),
            top,
            topBonus: (set.bonuses[top] ?? []).filter((e) => !isIgnored(e.stat)),
          },
        ];
      }),
    [sets],
  );
  const selected =
    picked === undefined
      ? entries.find((e) => e.set.ankama_id === open) || null
      : picked;
  const sizes = useMemo(
    () => [...new Set(entries.map((e) => e.items.length))].sort((a, b) => a - b),
    [entries],
  );
  const list = useMemo(
    () =>
      entries
        .filter(
          (e) =>
            e.maxLevel >= range.min &&
            e.minLevel <= levelCap(range.max) &&
            (!pieces || e.items.length === pieces) &&
            (!query ||
              normalizeSearch(e.set.name).includes(normalizeSearch(query))),
        )
        .sort((a, b) =>
          sort === "name"
            ? a.set.name.localeCompare(b.set.name)
            : sort === "asc"
              ? a.minLevel - b.minLevel
              : sort === "pieces"
                ? b.items.length - a.items.length
                : b.maxLevel - a.maxLevel,
        ),
    [entries, query, range, pieces, sort],
  );
  const scroller = useRef<HTMLDivElement>(null),
    { visible, sentinel, more } = useInfiniteList(list, scroller, 24);
  const worn = useMemo(
    () => new Set(Object.values(build.equipped)),
    [build.equipped],
  );
  const count = (e: Entry) => e.items.filter((it) => worn.has(it.ankama_id)).length;
  const wornSets = useMemo(
    () =>
      entries
        .map((e) => ({ e, n: count(e) }))
        .filter((x) => x.n > 0)
        .sort((a, b) => b.n - a.n),
    [entries, worn],
  );
  const plan = useMemo(
    () => (selected ? assignSetSlots(selected.items, build.equipped) : []),
    [selected, build.equipped],
  );
  const preview = useMemo(
    () =>
      plan.length
        ? previewItems(
            visibleSlots.map(
              (slot) =>
                plan.find((p) => p.slot === slot)?.item.ankama_id ||
                build.equipped[slot] ||
                0,
            ),
          )
        : null,
    [plan, build.equipped, build.runes, build.allocated, build.scrolled],
  );
  useEffect(() => {
    if (selected && innerWidth <= 700) detailRef.current?.focus();
  }, [selected]);
  const hover = useHoverIntent<Entry>(setSelected);
  function clear() {
    setQuery("");
    setRange({ min: 0, max: 200 });
    setPieces(0);
  }
  function back() {
    setSelected(null);
    requestAnimationFrame(() => lastRow.current?.focus());
  }
  /** One piece on its own, as production does: the first empty slot that takes it, else the first one. */
  function equipPiece(item: AppItem) {
    const slots = SLOT_CONFIGS.filter((c) =>
        (Array.isArray(c.apiSlot) ? c.apiSlot : [c.apiSlot]).includes(item.slot),
      ).map((c) => c.id),
      target = slots.find((slot) => build.equipped[slot] == null) ?? slots[0];
    if (target) build.equipItem(target, item.ankama_id);
  }
  function removePiece(item: AppItem) {
    const slot = (Object.entries(build.equipped) as [SlotId, number][]).find(
      ([, id]) => id === item.ankama_id,
    )?.[0];
    if (slot) build.unequipItem(slot);
  }
  function equipSet(entry: Entry) {
    const placed = assignSetSlots(entry.items, build.equipped);
    if (!placed.length) return;
    build.equipMultiple(
      placed.map(({ slot, item }) => ({ slot, ankama_id: item.ankama_id })),
    );
    onEquipped();
  }
  const have = selected ? count(selected) : 0,
    after = have + plan.length,
    replaced = plan.filter((p) => build.equipped[p.slot]).length,
    tiers = selected
      ? Object.keys(selected.set.bonuses)
          .map(Number)
          .sort((a, b) => a - b)
      : [];
  return (
    <Modal
      open
      onClose={onClose}
      title={t("cat_v4_sets")}
      size="4xl"
      className="catalog-study"
    >
      <div
        className={"catalog-composition " + (selected ? "has-selection" : "")}
      >
        <header className="catalog-toolbar">
          <div className="catalog-toolbar-main">
            <label className="catalog-search">
              <Search size={18} aria-hidden="true" />
              <span className="sr-only">{t("cat_v4_search_sets")}</span>
              <input
                autoFocus
                placeholder={t("cat_v4_set_name")}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
          </div>
          <div className="catalog-filters">
            <label>
              {t("a11y_level_min")}
              <select
                value={range.min}
                onChange={(e) =>
                  setRange(
                    changeLevelRange(range, "min", Number(e.target.value)),
                  )
                }
              >
                {LEVELS.map((n) => (
                  <option key={n}>{n}</option>
                ))}
              </select>
            </label>
            <label>
              {t("a11y_level_max")}
              <select
                value={range.max}
                onChange={(e) =>
                  setRange(
                    changeLevelRange(range, "max", Number(e.target.value)),
                  )
                }
              >
                {LEVELS.map((n) => (
                  <option key={n} value={n}>
                    {n || t("cat_v4_level_any")}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t("cat_v4_sort")}
              <select value={sort} onChange={(e) => setSort(e.target.value)}>
                <option value="desc">{t("cat_v4_sort_desc")}</option>
                <option value="asc">{t("cat_v4_sort_asc")}</option>
                <option value="pieces">{t("cat_v4_sort_pieces")}</option>
                <option value="name">{t("cat_v4_sort_name")}</option>
              </select>
            </label>
          </div>
          <div className="catalog-types" role="group" aria-label={t("cat_v4_piece_count_label")}>
            <button aria-pressed={!pieces} onClick={() => setPieces(0)}>
              {t("explore_tag_all")}
            </button>
            {sizes.map((n) => (
              <button
                key={n}
                aria-pressed={pieces === n}
                onClick={() => setPieces(pieces === n ? 0 : n)}
              >
                {t("cat_v4_pieces", { count: n })}
              </button>
            ))}
          </div>
        </header>
        <section
          className="catalog-browse"
          aria-label={t("cat_v4_sets_results")}
          ref={scroller}
        >
          <div className="catalog-results-heading">
            <span>{t("cat_v4_sets_count", { count: list.length })}</span>
            <span>{t("cat_v4_sets_hint")}</span>
          </div>
          <div className="catalog-grid is-sets">
            {visible.map((e) => {
              const mine = count(e),
                active = selected?.set.ankama_id === e.set.ankama_id,
                placeable = assignSetSlots(e.items, build.equipped).length,
                complete = mine === e.items.length;
              return (
                <article
                  key={e.set.ankama_id}
                  className={
                    "catalog-card set-card" +
                    (active ? " is-selected" : "") +
                    (complete ? " is-equipped" : "")
                  }
                  onMouseEnter={() => hover.enter(e)}
                  onMouseLeave={hover.leave}
                >
                  <header className="set-card-head">
                    <div>
                      <button
                        className="catalog-result-open"
                        aria-label={
                          placeable
                            ? t("cat_v4_set_card_equip", {
                                name: e.set.name,
                                count: placeable,
                              })
                            : complete
                              ? t("cat_v4_set_card_equipped", { name: e.set.name })
                              : t("cat_v4_set_card_no_room", { name: e.set.name })
                        }
                        aria-disabled={!placeable}
                        onClick={() => equipSet(e)}
                        onFocus={(event) =>
                          event.currentTarget.matches(":focus-visible") &&
                          setSelected(e)
                        }
                      >
                        {e.set.name}
                      </button>
                      <small>
                        {t("cat_v4_level_pieces", {
                          level: level(e),
                          count: e.items.length,
                        })}
                      </small>
                    </div>
                    <span className="catalog-card-tools">
                      <span
                        className="set-card-count"
                        aria-label={t("cat_v4_worn_of", {
                          worn: mine,
                          total: e.items.length,
                        })}
                      >
                        {complete && <Check size={12} aria-hidden="true" />}
                        {mine}/{e.items.length}
                      </span>
                      <button
                        className="catalog-card-inspect"
                        aria-label={t("cat_v4_see_detail", { name: e.set.name })}
                        title={t("cat_v4_see_detail_title")}
                        onClick={(event) => {
                          lastRow.current = event.currentTarget;
                          setSelected(e);
                        }}
                      >
                        <ChartNoAxesColumn size={16} />
                      </button>
                    </span>
                  </header>
                  <ul className="set-card-pieces" aria-label={t("sets_sort_pieces")}>
                    {e.items.map((it) => (
                      <li
                        key={it.ankama_id}
                        className={worn.has(it.ankama_id) ? "is-worn" : undefined}
                      >
                        <ItemPeek item={it}>
                          <span className="set-card-piece" tabIndex={0}>
                            <img
                              src={it.image_url || "/design-assets/forge-mark.svg"}
                              alt={it.name}
                              loading="lazy"
                            />
                          </span>
                        </ItemPeek>
                      </li>
                    ))}
                  </ul>
                  {e.topBonus.length > 0 && (
                    <div className="set-card-bonus">
                      <h5>{t("cat_v4_with_pieces", { count: e.top })}</h5>
                      <p className="set-tier-effects">
                        <Bonus effects={e.topBonus} />
                      </p>
                    </div>
                  )}
                  <footer className="catalog-card-cta" aria-hidden="true">
                    {placeable ? (
                      <>
                        {t("cat_v4_equip_pieces", { count: placeable })}
                        <ArrowRight size={13} />
                      </>
                    ) : complete ? (
                      t("cat_v4_set_equipped")
                    ) : (
                      t("cat_v4_no_room")
                    )}
                  </footer>
                </article>
              );
            })}
          </div>
          {!list.length && (
            <div className="catalog-empty">
              <h3>{t("cat_v4_no_matches")}</h3>
              <p>{t("cat_v4_sets_empty_hint")}</p>
              <button onClick={clear}>{t("cat_v4_reset_filters")}</button>
            </div>
          )}
          {more && (
            <div ref={sentinel} className="catalog-sentinel" aria-hidden="true" />
          )}
        </section>
        <aside
          className="catalog-inspection"
          aria-label={t("cat_v4_sets_panel")}
        >
          {!selected ? (
            <div className="catalog-now">
              <span className="catalog-kicker">{t("cat_v4_sets_in_build")}</span>
              {wornSets.length ? (
                <ul className="set-worn">
                  {wornSets.map(({ e, n }) => (
                    <li key={e.set.ankama_id}>
                      <button
                        onClick={(event) => {
                          lastRow.current = event.currentTarget;
                          setSelected(e);
                        }}
                      >
                        <b>{e.set.name}</b>
                        <span>
                          {n}/{e.items.length}
                        </span>
                        <ArrowRight size={14} aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="catalog-now-empty">{t("cat_v4_no_set_piece")}</p>
              )}
              <p>{t("cat_v4_sets_intro")}</p>
            </div>
          ) : (
            <>
              <button className="catalog-back" onClick={back}>
                <ArrowLeft size={17} />
                {t("cat_v4_back_sets")}
              </button>
              <div className="catalog-item-heading set-heading">
                <div>
                  <span>{t("cat_v4_level_upper", { level: level(selected) })}</span>
                  <h3 tabIndex={-1} ref={detailRef}>
                    {selected.set.name}
                  </h3>
                  <p>
                    {t("cat_v4_pieces_worn", {
                      count: selected.items.length,
                      have,
                    })}
                  </p>
                  {slugs.get(selected.set.ankama_id) && (
                    <a
                      className="set-page-link"
                      href={setPath(
                        i18n.language,
                        slugs.get(selected.set.ankama_id)!,
                      )}
                      target="_blank"
                      rel="noopener"
                    >
                      {t("cat_v4_open_set_page")}
                      <ExternalLink size={13} aria-hidden="true" />
                    </a>
                  )}
                </div>
              </div>
              <h4>
                {t("sets_sort_pieces")} <span>{t("cat_v4_where_each")}</span>
              </h4>
              <ul className="set-pieces-plan">
                {selected.items.map((it) => {
                  const target = plan.find(
                      (p) => p.item.ankama_id === it.ankama_id,
                    ),
                    out = target && equipment.get(build.equipped[target.slot] || 0);
                  return (
                    <li key={it.ankama_id}>
                      <ItemPeek item={it}>
                        <img
                          src={it.image_url || "/design-assets/forge-mark.svg"}
                          alt=""
                          tabIndex={0}
                        />
                      </ItemPeek>
                      <span>
                        <b>{it.name}</b>
                        <small>
                          {worn.has(it.ankama_id) ? (
                            <>
                              <Check size={12} /> {t("cat_v4_already_worn")}
                            </>
                          ) : !target ? (
                            t("cat_v4_no_room_piece")
                          ) : out ? (
                            t("cat_v4_slot_replaces", {
                              slot: t("slot_" + target.slot),
                              name: out.name,
                            })
                          ) : (
                            t("cat_v4_slot_empty", { slot: t("slot_" + target.slot) })
                          )}
                        </small>
                        <em>{t("cat_v4_level_short", { level: it.level })}</em>
                      </span>
                      {worn.has(it.ankama_id) ? (
                        <button
                          className="set-piece-action"
                          aria-label={t("cat_v4_remove_named", { name: it.name })}
                          onClick={() => removePiece(it)}
                        >
                          {t("unequip_btn")}
                        </button>
                      ) : (
                        <button
                          className="set-piece-action"
                          aria-label={t("cat_v4_equip_only", { name: it.name })}
                          onClick={() => equipPiece(it)}
                        >
                          {t("equip_item")}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
              <h4>
                {t("cat_v4_bonuses")} <span>{t("cat_v4_by_worn")}</span>
              </h4>
              <ol className="set-tiers">
                {tiers.map((n) => (
                  <li
                    key={n}
                    className={
                      n === after ? "is-reached" : n === have ? "is-current" : ""
                    }
                  >
                    <span className="set-tier-count">
                      {n} <small>{t("cat_v4_tier_pieces", { count: n })}</small>
                    </span>
                    <span className="set-tier-effects">
                      <Bonus
                        effects={selected.set.bonuses[n].filter(
                          (e) => !isIgnored(e.stat),
                        )}
                      />
                    </span>
                    {n === after && plan.length > 0 && (
                      <span className="set-tier-note">{t("cat_v4_with_change")}</span>
                    )}
                    {n === have && !(n === after && plan.length > 0) && (
                      <span className="set-tier-note">{t("cat_v4_now")}</span>
                    )}
                  </li>
                ))}
              </ol>
              {preview && (
                <>
                  <h4>
                    {t("cat_v4_in_build")} <span>{t("cat_v4_now_with_set")}</span>
                  </h4>
                  <ImpactDeltas preview={preview} />
                  <p className="catalog-footnote">{t("cat_v4_set_footnote")}</p>
                </>
              )}
              <div className="catalog-equip">
                <p>
                  {!plan.length
                    ? have
                      ? t("cat_v4_all_worn")
                      : t("cat_v4_no_room_any")
                    : replaced
                      ? t("cat_v4_equip_replace", { count: plan.length, replaced })
                      : t("cat_v4_equip_empty", { count: plan.length })}
                </p>
                <button
                  className="primary"
                  disabled={!plan.length}
                  onClick={() => equipSet(selected)}
                >
                  {plan.length
                    ? t("cat_v4_equip_pieces_btn", { count: plan.length })
                    : t("cat_v4_set_equipped")}
                  <ArrowRight size={17} />
                </button>
              </div>
            </>
          )}
        </aside>
      </div>
    </Modal>
  );
}
