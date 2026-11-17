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
  if (!effects.length) return <span>Sin efectos de combate</span>;
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
      title="Panoplias"
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
              <span className="sr-only">Buscar panoplias</span>
              <input
                autoFocus
                placeholder="Nombre de la panoplia…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
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
                <option value="pieces">Más piezas</option>
                <option value="name">Nombre A–Z</option>
              </select>
            </label>
          </div>
          <div className="catalog-types" role="group" aria-label="Número de piezas">
            <button aria-pressed={!pieces} onClick={() => setPieces(0)}>
              Todas
            </button>
            {sizes.map((n) => (
              <button
                key={n}
                aria-pressed={pieces === n}
                onClick={() => setPieces(pieces === n ? 0 : n)}
              >
                {n} piezas
              </button>
            ))}
          </div>
        </header>
        <section
          className="catalog-browse"
          aria-label="Panoplias del catálogo"
          ref={scroller}
        >
          <div className="catalog-results-heading">
            <span>{list.length} panoplias</span>
            <span>Clic para equipar · pasa por encima para ver el detalle</span>
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
                        aria-label={`${e.set.name}: ${placeable ? `equipar ${placeable} ${placeable === 1 ? "pieza" : "piezas"}` : complete ? "equipada" : "sin espacio libre"}`}
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
                        Niv. {level(e)} · {e.items.length} piezas
                      </small>
                    </div>
                    <span className="catalog-card-tools">
                      <span
                        className="set-card-count"
                        aria-label={`${mine} de ${e.items.length} en tu equipo`}
                      >
                        {complete && <Check size={12} aria-hidden="true" />}
                        {mine}/{e.items.length}
                      </span>
                      <button
                        className="catalog-card-inspect"
                        aria-label={`Ver el detalle de ${e.set.name}`}
                        title="Ver dónde va cada pieza"
                        onClick={(event) => {
                          lastRow.current = event.currentTarget;
                          setSelected(e);
                        }}
                      >
                        <ChartNoAxesColumn size={16} />
                      </button>
                    </span>
                  </header>
                  <ul className="set-card-pieces" aria-label="Piezas">
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
                      <h5>Con {e.top} piezas</h5>
                      <p className="set-tier-effects">
                        <Bonus effects={e.topBonus} />
                      </p>
                    </div>
                  )}
                  <footer className="catalog-card-cta" aria-hidden="true">
                    {placeable ? (
                      <>
                        Equipar {placeable} {placeable === 1 ? "pieza" : "piezas"}
                        <ArrowRight size={13} />
                      </>
                    ) : complete ? (
                      "Panoplia equipada"
                    ) : (
                      "Sin espacio libre"
                    )}
                  </footer>
                </article>
              );
            })}
          </div>
          {!list.length && (
            <div className="catalog-empty">
              <h3>No hay coincidencias</h3>
              <p>Amplía el rango de nivel o busca otro nombre.</p>
              <button onClick={clear}>Restablecer filtros</button>
            </div>
          )}
          {more && (
            <div ref={sentinel} className="catalog-sentinel" aria-hidden="true" />
          )}
        </section>
        <aside
          className="catalog-inspection"
          aria-label="Piezas, bonificaciones y cambio en el equipo"
        >
          {!selected ? (
            <div className="catalog-now">
              <span className="catalog-kicker">Panoplias en tu equipo</span>
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
                <p className="catalog-now-empty">Ninguna pieza de panoplia</p>
              )}
              <p>
                Cada tarjeta muestra sus piezas y la bonificación completa, y
                se equipa con un clic. Pasa el cursor por una para ver aquí
                dónde va cada pieza, qué bonificación alcanzas y cómo cambia
                tu build.
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
                      Abrir la página de la panoplia
                      <ExternalLink size={13} aria-hidden="true" />
                    </a>
                  )}
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
                        <em>Niv. {it.level}</em>
                      </span>
                      {worn.has(it.ankama_id) ? (
                        <button
                          className="set-piece-action"
                          aria-label={`Quitar ${it.name}`}
                          onClick={() => removePiece(it)}
                        >
                          Quitar
                        </button>
                      ) : (
                        <button
                          className="set-piece-action"
                          aria-label={`Equipar solo ${it.name}`}
                          onClick={() => equipPiece(it)}
                        >
                          Equipar
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
              <h4>
                Bonificaciones <span>Según las piezas equipadas</span>
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
                      {n} <small>piezas</small>
                    </span>
                    <span className="set-tier-effects">
                      <Bonus
                        effects={selected.set.bonuses[n].filter(
                          (e) => !isIgnored(e.stat),
                        )}
                      />
                    </span>
                    {n === after && plan.length > 0 && (
                      <span className="set-tier-note">Con este cambio</span>
                    )}
                    {n === have && !(n === after && plan.length > 0) && (
                      <span className="set-tier-note">Ahora</span>
                    )}
                  </li>
                ))}
              </ol>
              {preview && (
                <>
                  <h4>
                    En tu equipo <span>Actual → con la panoplia</span>
                  </h4>
                  <ImpactDeltas preview={preview} />
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
                  onClick={() => equipSet(selected)}
                >
                  {plan.length
                    ? `Equipar ${plan.length} piezas`
                    : "Panoplia equipada"}
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
