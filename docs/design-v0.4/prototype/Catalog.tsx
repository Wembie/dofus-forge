import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ChartNoAxesColumn,
  Check,
  Crown,
  Search,
  SlidersHorizontal,
  Star,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useBuildStore, type SlotId } from "../../../src/store/buildStore";
import { useDataStore } from "../../../src/store/dataStore";
import { useFavorites } from "../../../src/store/useFavorites";
import { SLOT_CONFIGS } from "../../../src/features/equipment/slotConfig";
import {
  matchesSlot,
  matchesStatFilter,
  levelCap,
  changeLevelRange,
  catalogBlock,
  isAttackEffect,
} from "../../../src/features/equipment/catalogFilters";
import { STAT_META } from "../../../src/features/equipment/statDisplay";
import { Sets } from "./Sets";
import { StatFilter } from "../../../src/ui/StatFilter";
import { normalizeSearch } from "../../../src/ui/normalize";
import { equipment, previewItems, visibleSlots } from "./model";
import { Modal } from "./SurfaceModal";
import { ImpactDeltas, ItemFactsList, useHoverIntent } from "./ItemFacts";
import { useInfiniteList } from "./useInfiniteList";
import type { AppItem, AppSet } from "../../../src/data/loaders";
import "./catalog.css";

const LEVELS = [0, 20, 40, 60, 80, 100, 120, 140, 160, 180, 200];

/**
 * Cards that read in full without a click (effects, attack, spell effects,
 * ability, lore, set, favourite, one-click equip) next to a panel that shows
 * what the selected piece changes in the build before equipping it.
 */
export function Catalog({
  slot: initialSlot,
  onClose,
}: {
  slot: SlotId;
  onClose: () => void;
}) {
  const { t } = useTranslation(),
    build = useBuildStore(),
    sets = useDataStore((s) => s.sets) || [],
    favorites = useFavorites();
  const [slot, setSlot] = useState(initialSlot),
    [query, setQuery] = useState(""),
    [range, setRange] = useState({ min: 0, max: 200 }),
    [sort, setSort] = useState("desc"),
    [setId, setSetId] = useState(""),
    [type, setType] = useState(""),
    [stats, setStats] = useState<string[]>([]),
    [onlyFav, setOnlyFav] = useState(false),
    [legendary, setLegendary] = useState(false),
    [selected, setSelected] = useState<AppItem | null>(null),
    [setDetail, setSetDetail] = useState<AppSet | null>(null),
    [continueDofus, setContinueDofus] = useState(true),
    [notice, setNotice] = useState(""),
    [showFilters, setShowFilters] = useState(false);
  const detailRef = useRef<HTMLHeadingElement>(null),
    lastItem = useRef<HTMLButtonElement | null>(null);
  const config = SLOT_CONFIGS.find((s) => s.id === slot)!,
    candidates = useMemo(
      () => [...equipment.values()].filter((it) => matchesSlot(it, config)),
      [slot],
    );
  const setById = useMemo(
    () => new Map(sets.map((s) => [s.ankama_id, s])),
    [sets],
  );
  const options = useMemo(
    () => ({
      types: [...new Set(candidates.map((it) => it.type))].sort(),
      stats: [
        ...new Set(
          candidates.flatMap((it) =>
            it.effects.filter((e) => !isAttackEffect(e)).map((e) => e.stat),
          ),
        ),
      ].sort(),
      sets: sets
        .filter((s) => candidates.some((it) => it.set_id === s.ankama_id))
        .sort((a, b) => a.name.localeCompare(b.name)),
      legendary: candidates.some((it) => it.legendary === true),
    }),
    [candidates, sets],
  );
  const list = useMemo(
    () =>
      candidates
        .filter(
          (it) =>
            it.level >= range.min &&
            it.level <= levelCap(range.max) &&
            (!setId || String(it.set_id) === setId) &&
            matchesStatFilter(it, stats) &&
            (!onlyFav || favorites.isFav(it.ankama_id)) &&
            (!legendary || it.legendary === true) &&
            (!query ||
              normalizeSearch(it.name).includes(normalizeSearch(query))) &&
            (query || !type || it.type === type),
        )
        .sort((a, b) =>
          sort === "name"
            ? a.name.localeCompare(b.name)
            : sort === "asc"
              ? a.level - b.level
              : b.level - a.level,
        ),
    [
      candidates,
      query,
      range,
      sort,
      setId,
      type,
      stats,
      onlyFav,
      legendary,
      favorites.isFav,
    ],
  );
  const scroller = useRef<HTMLDivElement>(null),
    { visible, sentinel, more } = useInfiniteList(list, scroller, 24);
  const worn = equipment.get(build.equipped[slot] || 0),
    block = selected
      ? catalogBlock(selected, slot, build.equipped, equipment)
      : null,
    current = build.equipped[slot] === selected?.ankama_id;
  const preview = useMemo(
    () =>
      selected
        ? previewItems(
            visibleSlots.map((s) =>
              s === slot ? selected.ankama_id : build.equipped[s] || 0,
            ),
          )
        : null,
    [
      selected,
      slot,
      build.equipped,
      build.runes,
      build.allocated,
      build.scrolled,
    ],
  );
  useEffect(() => {
    if (selected && innerWidth <= 700) detailRef.current?.focus();
  }, [selected]);
  const hover = useHoverIntent<AppItem>(setSelected);
  function inspect(item: AppItem, button: HTMLButtonElement) {
    lastItem.current = button;
    setSelected(item);
  }
  function back() {
    setSelected(null);
    requestAnimationFrame(() => lastItem.current?.focus());
  }
  function blockedIn(item: AppItem) {
    const b = catalogBlock(item, slot, build.equipped, equipment);
    return b ? t("slot_" + b.slot) : null;
  }
  function equip(item: AppItem) {
    if (catalogBlock(item, slot, build.equipped, equipment)) return;
    if (build.equipped[slot] === item.ankama_id) return;
    build.equipItem(slot, item.ankama_id);
    if (continueDofus && slot.startsWith("dofus")) {
      const next = visibleSlots.find(
        (s) =>
          s.startsWith("dofus") &&
          s !== slot &&
          !useBuildStore.getState().equipped[s],
      );
      if (next) {
        setSlot(next);
        setSelected(null);
        setNotice(t("cat_v4_equipped_next", { name: item.name }));
        return;
      }
    }
    onClose();
  }
  function clear() {
    setQuery("");
    setRange({ min: 0, max: 200 });
    setSetId("");
    setType("");
    setStats([]);
    setOnlyFav(false);
    setLegendary(false);
  }
  const slotLabel = t("slot_" + slot),
    typeLabel = (v: string) => t(`item_type_${v}`, { defaultValue: v }),
    favCount = candidates.filter((it) => favorites.isFav(it.ankama_id)).length,
    activeFilters =
      Number(range.min > 0 || range.max !== 200) +
      Number(!!setId) +
      stats.length +
      Number(onlyFav) +
      Number(legendary);
  return (
    <Modal
      open
      onClose={onClose}
      title={t("cat_v4_choose_slot", {
        slot: slotLabel.toLocaleLowerCase(),
      })}
      size="4xl"
      className="catalog-study"
    >
      <div
        className={"catalog-composition " + (selected ? "has-selection" : "")}
      >
        <header
          className={
            "catalog-toolbar has-toggle" + (showFilters ? " filters-open" : "")
          }
        >
          <div className="catalog-toolbar-main">
            <label className="catalog-search">
              <Search size={18} aria-hidden="true" />
              <span className="sr-only">{t("cat_v4_search_items")}</span>
              <input
                autoFocus
                placeholder={t("cat_v4_item_name")}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            <button
              className="catalog-filter-toggle"
              aria-expanded={showFilters}
              onClick={() => setShowFilters(!showFilters)}
            >
              <SlidersHorizontal size={16} aria-hidden="true" />
              {t("cat_v4_filters")}
              {activeFilters > 0 && (
                <span className="catalog-flag-count">{activeFilters}</span>
              )}
            </button>
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
                <option value="name">{t("cat_v4_sort_name")}</option>
              </select>
            </label>
            <label className="catalog-filter-wide">
              {t("cat_v4_set")}
              <select value={setId} onChange={(e) => setSetId(e.target.value)}>
                <option value="">{t("explore_tag_all")}</option>
                {options.sets.map((s) => (
                  <option key={s.ankama_id} value={s.ankama_id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="catalog-flags">
            <button
              aria-pressed={onlyFav}
              aria-label={t("cat_v4_fav_only", { count: favCount })}
              onClick={() => setOnlyFav(!onlyFav)}
            >
              <Star size={15} aria-hidden="true" />
              {t("cat_v4_favorites")}
              {favCount > 0 && <span className="catalog-flag-count">{favCount}</span>}
            </button>
            {options.legendary && (
              <button
                aria-pressed={legendary}
                onClick={() => setLegendary(!legendary)}
              >
                <Crown size={14} aria-hidden="true" />
                {t("catalog_legendary_only")}
              </button>
            )}
            <StatFilter
              stats={options.stats}
              selected={stats}
              onSelect={setStats}
            />
            <button onClick={clear}>{t("compare_clear_b")}</button>
          </div>
          {options.types.length > 1 && (
            <div className="catalog-types" role="group" aria-label={t("cat_v4_item_type")}>
              <button aria-pressed={!type} onClick={() => setType("")}>
                {t("elem_all")}
              </button>
              {options.types.map((v) => (
                <button
                  key={v}
                  aria-pressed={type === v}
                  onClick={() => setType(type === v ? "" : v)}
                >
                  {typeLabel(v)}
                </button>
              ))}
              {query && type && (
                <span>{t("cat_v4_name_all_types")}</span>
              )}
            </div>
          )}
        </header>
        <section
          className="catalog-browse"
          aria-label={t("cat_v4_results")}
          ref={scroller}
        >
          <div className="catalog-results-heading">
            <span>{t("cat_v4_items_count", { count: list.length })}</span>
            <span>{t("cat_v4_items_hint")}</span>
          </div>
          {notice && (
            <p className="catalog-notice" role="status">
              {notice}
            </p>
          )}
          <div className="catalog-grid">
            {visible.map((it) => {
              const blocked = blockedIn(it),
                equipped = build.equipped[slot] === it.ankama_id,
                active = selected?.ankama_id === it.ankama_id,
                set = it.set_id != null ? setById.get(it.set_id) : undefined,
                fav = favorites.isFav(it.ankama_id);
              return (
                <article
                  key={it.ankama_id}
                  className={
                    "catalog-card" +
                    (active ? " is-selected" : "") +
                    (equipped ? " is-equipped" : "") +
                    (blocked ? " is-blocked" : "")
                  }
                  onMouseEnter={() => hover.enter(it)}
                  onMouseLeave={hover.leave}
                >
                  <header className="catalog-card-head">
                    <span className="catalog-card-art">
                      <img
                        src={it.image_url || "/design-assets/forge-mark.svg"}
                        alt=""
                        loading="lazy"
                      />
                    </span>
                    <div>
                      <button
                        className="catalog-result-open"
                        aria-label={
                          equipped
                            ? t("cat_v4_card_equipped", { name: it.name })
                            : blocked
                              ? t("cat_v4_card_in", { name: it.name, slot: blocked })
                              : t("cat_v4_card_equip", { name: it.name })
                        }
                        aria-disabled={equipped || !!blocked}
                        onClick={() => equip(it)}
                        onFocus={(e) =>
                          e.currentTarget.matches(":focus-visible") &&
                          setSelected(it)
                        }
                      >
                        {it.name}
                      </button>
                      <small>
                        {t("cat_v4_level_short", { level: it.level })} ·{" "}
                        {typeLabel(it.type)}
                      </small>
                      {set && (
                        <button
                          className="catalog-set-link"
                          onClick={() => setSetDetail(set)}
                        >
                          {set.name}
                          <ArrowRight size={12} aria-hidden="true" />
                        </button>
                      )}
                      {(equipped || blocked) && (
                        <span className="catalog-card-status">
                          <Check size={12} aria-hidden="true" />
                          {equipped
                            ? t("cat_v4_equipped")
                            : t("cat_v4_already_in", { slot: blocked })}
                        </span>
                      )}
                    </div>
                    <span className="catalog-card-tools">
                      <button
                        className="catalog-favorite"
                        aria-label={t(fav ? "cat_v4_fav_remove" : "cat_v4_fav_add", {
                          name: it.name,
                        })}
                        aria-pressed={fav}
                        onClick={() => favorites.toggle(it.ankama_id)}
                      >
                        <Star size={16} />
                      </button>
                      <button
                        className="catalog-card-inspect"
                        aria-label={t("cat_v4_see_change", { name: it.name })}
                        title={t("cat_v4_see_change_title")}
                        onClick={(e) => inspect(it, e.currentTarget)}
                      >
                        <ChartNoAxesColumn size={16} />
                      </button>
                    </span>
                  </header>
                  <div className="catalog-card-facts">
                    <ItemFactsList item={it} />
                  </div>
                  <footer className="catalog-card-cta" aria-hidden="true">
                    {equipped
                      ? t("cat_v4_equipped")
                      : blocked
                        ? t("cat_v4_already_equipped_in", { slot: blocked })
                        : <>{t("equip_item")} <ArrowRight size={13} /></>}
                  </footer>
                </article>
              );
            })}
          </div>
          {!list.length && (
            <div className="catalog-empty">
              <h3>{t("cat_v4_no_matches")}</h3>
              <p>{t("cat_v4_items_empty_hint")}</p>
              <button onClick={clear}>{t("cat_v4_reset_filters")}</button>
            </div>
          )}
          {more && (
            <div ref={sentinel} className="catalog-sentinel" aria-hidden="true" />
          )}
        </section>
        <aside
          className="catalog-inspection"
          aria-label={t("cat_v4_build_change")}
        >
          {!selected ? (
            <div className="catalog-now">
              <span className="catalog-kicker">
                {t("cat_v4_now_in", { slot: slotLabel.toLowerCase() })}
              </span>
              {worn ? (
                <div className="catalog-item-heading is-small">
                  <img src={worn.image_url || "/design-assets/forge-mark.svg"} alt="" />
                  <div>
                    <span>{t("cat_v4_level_upper", { level: worn.level })}</span>
                    <h3>{worn.name}</h3>
                    <p>{typeLabel(worn.type)}</p>
                  </div>
                </div>
              ) : (
                <p className="catalog-now-empty">{t("cat_v4_empty_slot")}</p>
              )}
              <p>{t("cat_v4_items_intro")}</p>
            </div>
          ) : (
            <>
              <button className="catalog-back" onClick={back}>
                <ArrowLeft size={17} />
                {t("cat_v4_back_results")}
              </button>
              <div className="catalog-item-heading">
                <img
                  src={selected.image_url || "/design-assets/forge-mark.svg"}
                  alt=""
                />
                <div>
                  <span>{t("cat_v4_level_upper", { level: selected.level })}</span>
                  <h3 tabIndex={-1} ref={detailRef}>
                    {selected.name}
                  </h3>
                  <p>{typeLabel(selected.type)}</p>
                </div>
              </div>
              <p className="catalog-replaces">
                {current
                  ? t("cat_v4_is_worn")
                  : worn
                    ? t("cat_v4_replaces", { name: worn.name })
                    : t("cat_v4_fills_empty")}
              </p>
              {selected.set_id != null && setById.get(selected.set_id) && (
                <button
                  className="catalog-panel-set"
                  onClick={() => setSetDetail(setById.get(selected.set_id!)!)}
                >
                  {t("cat_v4_set_named", {
                    name: setById.get(selected.set_id)!.name,
                  })}
                  <ArrowRight size={13} aria-hidden="true" />
                </button>
              )}
              <div className="catalog-mobile-facts">
                <ItemFactsList item={selected} />
              </div>
              <h4>
                {t("cat_v4_in_build")} <span>{t("cat_v4_now_with_piece")}</span>
              </h4>
              {preview && <ImpactDeltas preview={preview} />}
              <p className="catalog-footnote">{t("cat_v4_item_footnote")}</p>
              {!!selected.conditions?.length && (
                <div className="catalog-conditions">
                  <h4>{t("cat_v4_equip_conditions")}</h4>
                  {selected.conditions.map((c, i) => (
                    <p key={i}>
                      {STAT_META[c.stat] ? t(STAT_META[c.stat].tKey) : c.stat}{" "}
                      {c.operator} {c.value}
                    </p>
                  ))}
                </div>
              )}
              <div className="catalog-equip">
                <p>
                  {current
                    ? t("cat_v4_already_equipped")
                    : block
                      ? t("cat_v4_occupied_in", { slot: t("slot_" + block.slot) })
                      : selected.level > build.level
                        ? t("cat_v4_level_over")
                        : t("cat_v4_replaces_slot", { slot: slotLabel.toLowerCase() })}
                </p>
                {slot.startsWith("dofus") && (
                  <label>
                    <input
                      type="checkbox"
                      checked={continueDofus}
                      onChange={(e) => setContinueDofus(e.target.checked)}
                    />
                    {t("cat_v4_continue_next")}
                  </label>
                )}
                <button
                  className="primary"
                  disabled={!!block || current}
                  onClick={() => equip(selected)}
                >
                  {current
                    ? t("cat_v4_equipped")
                    : t("cat_v4_equip_in", { slot: slotLabel.toLowerCase() })}
                  <ArrowRight size={17} />
                </button>
              </div>
            </>
          )}
        </aside>
      </div>
      {setDetail && (
        <Sets
          open={setDetail.ankama_id}
          onClose={() => setSetDetail(null)}
          onEquipped={onClose}
        />
      )}
    </Modal>
  );
}
