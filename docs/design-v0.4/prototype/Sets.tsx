import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Search } from "lucide-react";
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
import { normalizeSearch } from "../../../src/ui/normalize";
import { equipment, previewItems, visibleSlots } from "./model";
import { Modal } from "./SurfaceModal";
import labels from "./stat-labels.json";
import type { AppItem, AppSet } from "../../../src/data/loaders";
import "./catalog.css";

interface Entry {
  set: AppSet;
  items: AppItem[];
  minLevel: number;
  maxLevel: number;
}
const LEVELS = [0, 20, 40, 60, 80, 100, 120, 140, 160, 180, 200];
const level = (e: Entry) =>
  e.minLevel === e.maxLevel ? e.minLevel : `${e.minLevel}–${e.maxLevel}`;

/**
 * Same list/detail composition as the item catalogue: read the set and what it
 * changes, then equip. `open` starts on that set, for links from an item or a set page.
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
  const { t } = useTranslation(),
    build = useBuildStore(),
    sets = useDataStore((s) => s.sets) || [];
  const [query, setQuery] = useState(""),
    [range, setRange] = useState({ min: 0, max: 200 }),
    [pieces, setPieces] = useState(0),
    [sort, setSort] = useState("desc"),
    [picked, setSelected] = useState<Entry | null | undefined>(undefined),
    [page, setPage] = useState(1);
  const detailRef = useRef<HTMLHeadingElement>(null),
    lastRow = useRef<HTMLButtonElement | null>(null);
  const entries = useMemo(
    () =>
      sets.flatMap((set): Entry[] => {
        const items = set.items.flatMap((id) => equipment.get(id) ?? []);
        if (set.items.length < 2 || !items.length) return [];
        const levels = items.map((it) => it.level);
        return [
          {
            set,
            items,
            minLevel: Math.min(...levels),
            maxLevel: Math.max(...levels),
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
  const worn = useMemo(
    () => new Set(Object.values(build.equipped)),
    [build.equipped],
  );
  const count = (e: Entry) => e.items.filter((it) => worn.has(it.ankama_id)).length;
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
  useEffect(() => setPage(1), [list]);
  useEffect(() => {
    if (selected && innerWidth <= 700) detailRef.current?.focus();
  }, [selected]);
  function clear() {
    setQuery("");
    setRange({ min: 0, max: 200 });
    setPieces(0);
  }
  function back() {
    setSelected(null);
    requestAnimationFrame(() => lastRow.current?.focus());
  }
  function equip() {
    if (!plan.length) return;
    build.equipMultiple(
      plan.map(({ slot, item }) => ({ slot, ankama_id: item.ankama_id })),
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
      title="Panoplias"
      size="4xl"
      className="catalog-study"
    >
      <div
        className={"catalog-composition " + (selected ? "has-selection" : "")}
      >
        <section className="catalog-browse" aria-label="Panoplias del catálogo">
          <label className="catalog-search">
            <Search size={18} />
            <span className="sr-only">Buscar panoplias</span>
            <input
              autoFocus
              placeholder="Nombre de la panoplia…"
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
              Piezas
              <select
                value={pieces}
                onChange={(e) => setPieces(Number(e.target.value))}
              >
                <option value={0}>Cualquiera</option>
                {sizes.map((n) => (
                  <option key={n} value={n}>
                    {n} piezas
                  </option>
                ))}
              </select>
            </label>
            <label>
              Orden
              <select value={sort} onChange={(e) => setSort(e.target.value)}>
                <option value="desc">Mayor nivel</option>
                <option value="asc">Menor nivel</option>
                <option value="pieces">Más piezas</option>
                <option value="name">Nombre A–Z</option>
              </select>
            </label>
          </div>
          <div className="catalog-results-heading">
            <span>{list.length} panoplias</span>
            <span>Selecciona para ver el cambio</span>
          </div>
          <div className="catalog-results">
            {list.slice(0, page * 30).map((e) => {
              const mine = count(e),
                active = selected?.set.ankama_id === e.set.ankama_id;
              return (
                <div
                  className={"catalog-result " + (active ? "selected" : "")}
                  key={e.set.ankama_id}
                >
                  <button
                    className="catalog-result-open set-row"
                    aria-pressed={active}
                    onClick={(event) => {
                      lastRow.current = event.currentTarget;
                      setSelected(e);
                    }}
                  >
                    <span>
                      <b>{e.set.name}</b>
                      <small>
                        Niv. {level(e)} · {e.items.length} piezas
                        {mine > 0 && ` · ${mine} en tu equipo`}
                      </small>
                    </span>
                    <span className="set-row-pieces">
                      {e.items.slice(0, 4).map((it) => (
                        <img
                          key={it.ankama_id}
                          src={it.image_url || "/design-assets/forge-mark.svg"}
                          alt=""
                          loading="lazy"
                        />
                      ))}
                      {e.items.length > 4 && <i>+{e.items.length - 4}</i>}
                    </span>
                    <ArrowRight size={16} />
                  </button>
                </div>
              );
            })}
            {!list.length && (
              <div className="catalog-empty">
                <h3>No hay coincidencias</h3>
                <p>Amplía el rango de nivel o busca otro nombre.</p>
                <button onClick={clear}>Restablecer filtros</button>
              </div>
            )}
            {list.length > page * 30 && (
              <button className="catalog-more" onClick={() => setPage(page + 1)}>
                Ver 30 panoplias más
              </button>
            )}
          </div>
        </section>
        <section
          className="catalog-inspection"
          aria-label="Piezas, bonificaciones y cambio en el equipo"
        >
          {!selected ? (
            <div className="catalog-empty">
              <Search size={30} />
              <h3>Las piezas y lo que suman juntas.</h3>
              <p>
                Selecciona una panoplia para ver dónde va cada pieza, qué
                bonificación alcanzas y cómo cambia tu build antes de equiparla.
              </p>
            </div>
          ) : (
            <>
              <button className="catalog-back" onClick={back}>
                <ArrowLeft size={17} />
                Volver a las panoplias
              </button>
              <div className="catalog-item-heading set-heading">
                <div>
                  <span>NIVEL {level(selected)}</span>
                  <h3 tabIndex={-1} ref={detailRef}>
                    {selected.set.name}
                  </h3>
                  <p>
                    {selected.items.length} piezas · {have} en tu equipo
                  </p>
                </div>
              </div>
              <h4>
                Piezas <span>Dónde va cada una</span>
              </h4>
              <ul className="set-pieces-plan">
                {selected.items.map((it) => {
                  const target = plan.find(
                      (p) => p.item.ankama_id === it.ankama_id,
                    ),
                    out = target && equipment.get(build.equipped[target.slot] || 0);
                  return (
                    <li key={it.ankama_id}>
                      <img
                        src={it.image_url || "/design-assets/forge-mark.svg"}
                        alt=""
                      />
                      <span>
                        <b>{it.name}</b>
                        <small>
                          {worn.has(it.ankama_id) ? (
                            <>
                              <Check size={12} /> Ya equipada
                            </>
                          ) : !target ? (
                            "Sin espacio libre para esta pieza"
                          ) : out ? (
                            `${t("slot_" + target.slot)} · reemplaza ${out.name}`
                          ) : (
                            `${t("slot_" + target.slot)} · espacio vacío`
                          )}
                        </small>
                      </span>
                      <em>Niv. {it.level}</em>
                    </li>
                  );
                })}
              </ul>
              <h4>
                Bonificaciones <span>Según las piezas equipadas</span>
              </h4>
              <ol className="set-tiers">
                {tiers.map((n) => {
                  const effects = selected.set.bonuses[n].filter(
                    (e) => !isIgnored(e.stat),
                  );
                  return (
                    <li
                      key={n}
                      className={
                        n === after ? "is-reached" : n === have ? "is-current" : ""
                      }
                    >
                      <span className="set-tier-count">
                        {n} <small>piezas</small>
                      </span>
                      <span className="set-tier-effects">
                        {effects.map((e, i) => {
                          const meta = STAT_META[e.stat];
                          return (
                            <span key={i}>
                              {meta?.icon && (
                                <img src={statIconUrl(meta.icon)} alt="" />
                              )}
                              <b>{fmtValue(e.min, e.max)}</b>{" "}
                              {meta ? t(meta.tKey) : e.stat}
                            </span>
                          );
                        })}
                        {!effects.length && <span>Sin efectos de combate</span>}
                      </span>
                      {n === after && plan.length > 0 && (
                        <span className="set-tier-note">Con este cambio</span>
                      )}
                      {n === have && !(n === after && plan.length > 0) && (
                        <span className="set-tier-note">Ahora</span>
                      )}
                    </li>
                  );
                })}
              </ol>
              {preview && (
                <>
                  <h4>
                    En tu equipo <span>Actual → con la panoplia</span>
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
                        next = preview[key] || 0,
                        diff = next - before;
                      return (
                        <div key={key}>
                          <dt>{labels[key]}</dt>
                          <dd>
                            {before} <ArrowRight size={12} /> <b>{next}</b>
                            <em
                              className={
                                diff < 0
                                  ? "negative"
                                  : diff > 0
                                    ? "positive"
                                    : ""
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
                    Incluye las bonificaciones de panoplia que ganas y las que
                    pierdes. Cambiar una pieza retira las runas de su espacio.
                  </p>
                </>
              )}
              <div className="catalog-equip">
                <p>
                  {!plan.length
                    ? have
                      ? "Ya llevas todas las piezas que caben en tu equipo."
                      : "Ninguna pieza tiene espacio disponible."
                    : replaced
                      ? `Equipa ${plan.length} piezas y reemplaza ${replaced} de tus objetos. Se deshace en un paso.`
                      : `Equipa ${plan.length} piezas en espacios vacíos. Se deshace en un paso.`}
                </p>
                <button
                  className="primary"
                  disabled={!plan.length}
                  onClick={equip}
                >
                  {plan.length
                    ? `Equipar ${plan.length} piezas`
                    : "Panoplia equipada"}
                  <ArrowRight size={17} />
                </button>
              </div>
            </>
          )}
        </section>
      </div>
    </Modal>
  );
}
