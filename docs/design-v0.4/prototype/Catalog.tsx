import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Search, Star } from "lucide-react";
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
import {
  STAT_META,
  statIconUrl,
} from "../../../src/features/equipment/statDisplay";
import { ItemSpellEffects } from "../../../src/features/equipment/ItemSpellEffects";
import { SetDetailModal } from "../../../src/features/equipment/SetDetailModal";
import { StatFilter } from "../../../src/ui/StatFilter";
import { normalizeSearch } from "../../../src/ui/normalize";
import { equipment, previewItems, visibleSlots } from "./model";
import { Modal } from "./SurfaceModal";
import labels from "./stat-labels.json";
import type { AppItem, AppSet } from "../../../src/data/loaders";
import "./catalog.css";

/** New list/detail composition consuming the existing slot, filter, conflict and build rules. */
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
    [page, setPage] = useState(1),
    [setDetail, setSetDetail] = useState<AppSet | null>(null),
    [continueDofus, setContinueDofus] = useState(true),
    [notice, setNotice] = useState("");
  const detailRef = useRef<HTMLHeadingElement>(null),
    lastItem = useRef<HTMLButtonElement | null>(null);
  const config = SLOT_CONFIGS.find((s) => s.id === slot)!,
    candidates = useMemo(
      () => [...equipment.values()].filter((it) => matchesSlot(it, config)),
      [slot],
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
      sets: sets.filter((s) =>
        candidates.some((it) => it.set_id === s.ankama_id),
      ),
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
  const block = selected
    ? catalogBlock(selected, slot, build.equipped, equipment)
    : null;
  const current = build.equipped[slot] === selected?.ankama_id;
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
  useEffect(() => setPage(1), [list]);
  useEffect(() => {
    if (selected && innerWidth <= 700) detailRef.current?.focus();
  }, [selected]);
  function inspect(item: AppItem, button: HTMLButtonElement) {
    lastItem.current = button;
    setSelected(item);
  }
  function back() {
    setSelected(null);
    requestAnimationFrame(() => lastItem.current?.focus());
  }
  function equip() {
    if (!selected || block || current) return;
    build.equipItem(slot, selected.ankama_id);
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
        setNotice(`${selected.name} equipado. Elige el siguiente Dofus.`);
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
  const slotLabel = t("slot_" + slot);
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
        <section
          className="catalog-browse"
          aria-label="Resultados del catálogo"
        >
          <label className="catalog-search">
            <Search size={18} />
            <span className="sr-only">Buscar objetos</span>
            <input
              autoFocus
              placeholder="Nombre del objeto…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
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
                {[0, 20, 40, 60, 80, 100, 120, 140, 160, 180, 200].map((n) => (
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
                {[0, 20, 40, 60, 80, 100, 120, 140, 160, 180, 200].map((n) => (
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
            {options.types.length > 1 && (
              <label>
                Tipo
                <select value={type} onChange={(e) => setType(e.target.value)}>
                  <option value="">Todos</option>
                  {options.types.map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </label>
            )}
            <label>
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
            <button aria-pressed={onlyFav} onClick={() => setOnlyFav(!onlyFav)}>
              <Star size={15} />
              Favoritos
            </button>
            <button
              aria-pressed={legendary}
              onClick={() => setLegendary(!legendary)}
            >
              Legendarios
            </button>
            <StatFilter
              stats={options.stats}
              selected={stats}
              onSelect={setStats}
            />
            <button onClick={clear}>Limpiar</button>
          </div>
          <div className="catalog-results-heading">
            <span>{list.length} objetos</span>
            <span>Selecciona para ver el cambio</span>
          </div>
          {notice && (
            <p className="catalog-notice" role="status">
              {notice}
            </p>
          )}
          <div className="catalog-results">
            {list.slice(0, page * 30).map((it) => {
              const blocked = catalogBlock(it, slot, build.equipped, equipment),
                equipped = build.equipped[slot] === it.ankama_id;
              return (
                <div
                  className={
                    "catalog-result " +
                    (selected?.ankama_id === it.ankama_id ? "selected" : "")
                  }
                  key={it.ankama_id}
                >
                  <button
                    className="catalog-result-open"
                    onClick={(e) => inspect(it, e.currentTarget)}
                    aria-pressed={selected?.ankama_id === it.ankama_id}
                  >
                    <img
                      src={it.image_url || "/design-assets/forge-mark.svg"}
                      alt=""
                    />
                    <span>
                      <b>{it.name}</b>
                      <small>
                        Niv. {it.level} ·{" "}
                        {equipped
                          ? "Equipado"
                          : blocked
                            ? "En otro espacio"
                            : it.type}
                      </small>
                    </span>
                    <ArrowRight size={16} />
                  </button>
                  <button
                    className="catalog-favorite"
                    aria-label={`${favorites.isFav(it.ankama_id) ? "Quitar de" : "Añadir a"} favoritos: ${it.name}`}
                    aria-pressed={favorites.isFav(it.ankama_id)}
                    onClick={() => favorites.toggle(it.ankama_id)}
                  >
                    <Star size={16} />
                  </button>
                </div>
              );
            })}
            {!list.length && (
              <div className="catalog-empty">
                <h3>No hay coincidencias</h3>
                <p>Combina menos filtros o busca otro nombre.</p>
                <button onClick={clear}>Restablecer filtros</button>
              </div>
            )}
            {list.length > page * 30 && (
              <button
                className="catalog-more"
                onClick={() => setPage(page + 1)}
              >
                Ver 30 objetos más
              </button>
            )}
          </div>
        </section>
        <section
          className="catalog-inspection"
          aria-label="Detalle y cambio en el equipo"
        >
          {!selected ? (
            <div className="catalog-empty">
              <Search size={30} />
              <h3>La pieza y lo que cambia.</h3>
              <p>
                Selecciona un objeto para consultar sus efectos, condiciones y
                el impacto en tu build antes de equiparlo.
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
                  <p>{selected.type}</p>
                </div>
              </div>
              {selected.set_id && (
                <button
                  className="catalog-set-link"
                  onClick={() =>
                    setSetDetail(
                      sets.find((s) => s.ankama_id === selected.set_id) || null,
                    )
                  }
                >
                  {sets.find((s) => s.ankama_id === selected.set_id)?.name}
                  <ArrowRight size={14} />
                </button>
              )}
              <h4>Efectos del objeto</h4>
              <dl className="catalog-effects">
                {selected.effects
                  .filter((e) => e.stat in STAT_META || e.min || e.max)
                  .map((e, i) => {
                    const meta = STAT_META[e.stat];
                    return (
                      <div key={i}>
                        <dt>
                          {meta && <img src={statIconUrl(meta.icon)} alt="" />}
                          {meta ? t(meta.tKey) : e.stat}
                          {isAttackEffect(e) && <small>ataque</small>}
                        </dt>
                        <dd>
                          {e.min}
                          {e.max !== 0 && e.max !== e.min ? "–" + e.max : ""}
                        </dd>
                      </div>
                    );
                  })}
              </dl>
              <ItemSpellEffects effects={selected.effects} />
              <h4>
                En tu equipo <span>Actual → con esta pieza</span>
              </h4>
              <dl className="catalog-deltas">
                {(
                  [
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
                  ] as const
                ).map((key) => {
                  const before = build.stats![key],
                    after = preview?.[key] || 0,
                    diff = after - before;
                  return (
                    <div key={key}>
                      <dt>{labels[key]}</dt>
                      <dd>
                        {before} <ArrowRight size={12} /> <b>{after}</b>
                        <em
                          className={
                            diff < 0 ? "negative" : diff > 0 ? "positive" : ""
                          }
                        >
                          {diff > 0 ? "+" : ""}
                          {diff}
                        </em>
                      </dd>
                    </div>
                  );
                })}
              </dl>
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
                  onClick={equip}
                >
                  {current
                    ? "Equipado"
                    : `Equipar en ${slotLabel.toLowerCase()}`}
                  <ArrowRight size={17} />
                </button>
              </div>
            </>
          )}
        </section>
      </div>
      {setDetail && (
        <SetDetailModal
          set={setDetail}
          onClose={() => setSetDetail(null)}
          onEquipAll={onClose}
        />
      )}
    </Modal>
  );
}
