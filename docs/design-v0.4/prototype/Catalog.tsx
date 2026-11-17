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
        setNotice(`${item.name} equipado. Elige el siguiente Dofus.`);
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
      title={`Elegir ${slotLabel.toLocaleLowerCase()}`}
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
              <span className="sr-only">Buscar objetos</span>
              <input
                autoFocus
                placeholder="Nombre del objeto…"
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
              Filtros
              {activeFilters > 0 && (
                <span className="catalog-flag-count">{activeFilters}</span>
              )}
            </button>
          </div>
          <div className="catalog-filters">
            <label>
              Nivel mínimo
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
              Nivel máximo
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
                    {n || "Sin límite"}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Orden
              <select value={sort} onChange={(e) => setSort(e.target.value)}>
                <option value="desc">Mayor nivel</option>
                <option value="asc">Menor nivel</option>
                <option value="name">Nombre A–Z</option>
              </select>
            </label>
            <label className="catalog-filter-wide">
              Panoplia
              <select value={setId} onChange={(e) => setSetId(e.target.value)}>
                <option value="">Todas</option>
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
              aria-label={`Solo favoritos (${favCount})`}
              onClick={() => setOnlyFav(!onlyFav)}
            >
              <Star size={15} aria-hidden="true" />
              Favoritos
              {favCount > 0 && <span className="catalog-flag-count">{favCount}</span>}
            </button>
            {options.legendary && (
              <button
                aria-pressed={legendary}
                onClick={() => setLegendary(!legendary)}
              >
                <Crown size={14} aria-hidden="true" />
                Legendarios
              </button>
            )}
            <StatFilter
              stats={options.stats}
              selected={stats}
              onSelect={setStats}
            />
            <button onClick={clear}>Limpiar</button>
          </div>
          {options.types.length > 1 && (
            <div className="catalog-types" role="group" aria-label="Tipo de objeto">
              <button aria-pressed={!type} onClick={() => setType("")}>
                Todos
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
                <span>La búsqueda por nombre incluye todos los tipos</span>
              )}
            </div>
          )}
        </header>
        <section
          className="catalog-browse"
          aria-label="Resultados del catálogo"
          ref={scroller}
        >
          <div className="catalog-results-heading">
            <span>{list.length} objetos</span>
            <span>Clic para equipar · pasa por encima para ver el cambio</span>
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
                        aria-label={`${it.name}: ${equipped ? "equipado" : blocked ? `ya en ${blocked}` : "equipar"}`}
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
                        Niv. {it.level} · {typeLabel(it.type)}
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
                          {equipped ? "Equipado" : `Ya en ${blocked}`}
                        </span>
                      )}
                    </div>
                    <span className="catalog-card-tools">
                      <button
                        className="catalog-favorite"
                        aria-label={`${fav ? "Quitar de" : "Añadir a"} favoritos: ${it.name}`}
                        aria-pressed={fav}
                        onClick={() => favorites.toggle(it.ankama_id)}
                      >
                        <Star size={16} />
                      </button>
                      <button
                        className="catalog-card-inspect"
                        aria-label={`Ver el cambio de ${it.name}`}
                        title="Ver qué cambia en tu build"
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
                      ? "Equipado"
                      : blocked
                        ? `Ya equipado en ${blocked}`
                        : <>Equipar <ArrowRight size={13} /></>}
                  </footer>
                </article>
              );
            })}
          </div>
          {!list.length && (
            <div className="catalog-empty">
              <h3>No hay coincidencias</h3>
              <p>Combina menos filtros o busca otro nombre.</p>
              <button onClick={clear}>Restablecer filtros</button>
            </div>
          )}
          {more && (
            <div ref={sentinel} className="catalog-sentinel" aria-hidden="true" />
          )}
        </section>
        <aside
          className="catalog-inspection"
          aria-label="Cambio en el equipo"
        >
          {!selected ? (
            <div className="catalog-now">
              <span className="catalog-kicker">Ahora en {slotLabel.toLowerCase()}</span>
              {worn ? (
                <div className="catalog-item-heading is-small">
                  <img src={worn.image_url || "/design-assets/forge-mark.svg"} alt="" />
                  <div>
                    <span>NIVEL {worn.level}</span>
                    <h3>{worn.name}</h3>
                    <p>{typeLabel(worn.type)}</p>
                  </div>
                </div>
              ) : (
                <p className="catalog-now-empty">Espacio vacío</p>
              )}
              <p>
                Cada tarjeta muestra todos sus efectos y se equipa con un clic.
                Pasa el cursor por una pieza para ver aquí vida, PA, PM,
                alcance, características y potencia antes y después.
              </p>
            </div>
          ) : (
            <>
              <button className="catalog-back" onClick={back}>
                <ArrowLeft size={17} />
                Volver a los resultados
              </button>
              <div className="catalog-item-heading">
                <img
                  src={selected.image_url || "/design-assets/forge-mark.svg"}
                  alt=""
                />
                <div>
                  <span>NIVEL {selected.level}</span>
                  <h3 tabIndex={-1} ref={detailRef}>
                    {selected.name}
                  </h3>
                  <p>{typeLabel(selected.type)}</p>
                </div>
              </div>
              <p className="catalog-replaces">
                {current
                  ? "Es la pieza que llevas."
                  : worn
                    ? `Reemplaza ${worn.name}`
                    : "Ocupa un espacio vacío"}
              </p>
              {selected.set_id != null && setById.get(selected.set_id) && (
                <button
                  className="catalog-panel-set"
                  onClick={() => setSetDetail(setById.get(selected.set_id!)!)}
                >
                  Panoplia: {setById.get(selected.set_id)!.name}
                  <ArrowRight size={13} aria-hidden="true" />
                </button>
              )}
              <div className="catalog-mobile-facts">
                <ItemFactsList item={selected} />
              </div>
              <h4>
                En tu equipo <span>Actual → con esta pieza</span>
              </h4>
              {preview && <ImpactDeltas preview={preview} />}
              <p className="catalog-footnote">
                Incluye las bonificaciones de panoplia. Cambiar la pieza retira
                las runas del espacio.
              </p>
              {!!selected.conditions?.length && (
                <div className="catalog-conditions">
                  <h4>Condiciones para equipar</h4>
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
                    ? "Este objeto ya está equipado."
                    : block
                      ? `Ya ocupado en ${t("slot_" + block.slot)}. Revisa ese espacio antes de continuar.`
                      : selected.level > build.level
                        ? "El nivel de este objeto supera el nivel de tu personaje."
                        : `Reemplaza el objeto del espacio ${slotLabel.toLowerCase()}.`}
                </p>
                {slot.startsWith("dofus") && (
                  <label>
                    <input
                      type="checkbox"
                      checked={continueDofus}
                      onChange={(e) => setContinueDofus(e.target.checked)}
                    />
                    Continuar al siguiente espacio vacío
                  </label>
                )}
                <button
                  className="primary"
                  disabled={!!block || current}
                  onClick={() => equip(selected)}
                >
                  {current
                    ? "Equipado"
                    : `Equipar en ${slotLabel.toLowerCase()}`}
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
