import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useBuildStore } from "../../../src/store/buildStore";
import { computeActiveSets } from "../../../src/features/equipment/SetBonusesPanel";
import {
  STAT_META,
  fmtValue,
  isIgnored,
  statIconUrl,
} from "../../../src/features/equipment/statDisplay";
import { CHANGELOG, DOFUS_GAME_VERSION } from "../../../src/data/changelog";
import { equipment } from "./model";
import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { Sets } from "./Sets";
import "./catalog.css";
import "./tools.css";

/** Each set you wear, the pieces that count and every tier, with the one in force marked. */
export function SetBonuses() {
  const { t } = useTranslation(),
    b = useBuildStore(),
    [open, setOpen] = useState<number | null>(null);
  const active = useMemo(
    () => computeActiveSets(b.equipped, b._equipment, b._sets),
    [b.equipped, b._equipment, b._sets],
  );
  const worn = new Set(Object.values(b.equipped));
  if (!active.length)
    return (
      <div className="tool-empty">
        <h3>Ninguna panoplia en tu equipo</h3>
        <p>
          Las bonificaciones aparecen cuando llevas dos o más piezas de la misma
          panoplia. Puedes buscarlas desde «Panoplias» en el taller.
        </p>
      </div>
    );
  return (
    <div
      className="bonus-sets"
      role="group"
      aria-label="Panoplias en tu equipo"
      tabIndex={0}
    >
      {active.map(({ set, count }) => {
        const pieces = set.items.flatMap((id) => equipment.get(id) ?? []),
          tiers = Object.keys(set.bonuses)
            .map(Number)
            .sort((x, y) => x - y),
          inForce = tiers.filter((n) => n <= count).at(-1);
        return (
          <section key={set.ankama_id} aria-label={set.name}>
            <header>
              <h3>{set.name}</h3>
              <p>
                <strong>{count}</strong> de {pieces.length} piezas
                {inForce ? "" : " · aún sin bonificación"}
              </p>
              <button
                className="bonus-open"
                onClick={() => setOpen(set.ankama_id)}
              >
                Ver la panoplia
                <ArrowRight size={14} />
              </button>
            </header>
            <ul className="bonus-pieces">
              {pieces.map((it) => (
                <li
                  key={it.ankama_id}
                  className={worn.has(it.ankama_id) ? "" : "is-missing"}
                  title={
                    it.name + (worn.has(it.ankama_id) ? "" : " · sin equipar")
                  }
                >
                  <img
                    src={it.image_url || "/design-assets/forge-mark.svg"}
                    alt=""
                  />
                  <span className="sr-only">
                    {it.name}
                    {worn.has(it.ankama_id) ? ", equipada" : ", sin equipar"}
                  </span>
                </li>
              ))}
            </ul>
            <ol className="set-tiers">
              {tiers.map((n) => {
                const effects = set.bonuses[n].filter((e) => !isIgnored(e.stat));
                return (
                  <li key={n} className={n === inForce ? "is-reached" : ""}>
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
                    {n === inForce && (
                      <span className="set-tier-note">Activa</span>
                    )}
                    {n === count + 1 && (
                      <span className="set-tier-note is-next">
                        Con una pieza más
                      </span>
                    )}
                  </li>
                );
              })}
            </ol>
          </section>
        );
      })}
      {open != null && (
        <Sets open={open} onClose={() => setOpen(null)} />
      )}
    </div>
  );
}

const day = new Intl.DateTimeFormat("es", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

/** Release notes as a dated reading list, newest first, a page at a time. */
export function Changelog() {
  const [shown, setShown] = useState(12);
  return (
    <div className="notes">
      <p className="notes-data">
        Datos del juego <strong>{DOFUS_GAME_VERSION}</strong>
        <span>{CHANGELOG.length} versiones publicadas</span>
      </p>
      <ol>
        {CHANGELOG.slice(0, shown).map((entry, i) => (
          <li key={entry.version}>
            <div>
              <strong>{entry.version}</strong>
              <time dateTime={entry.date}>
                {day.format(new Date(entry.date + "T00:00:00Z"))}
              </time>
              {i === 0 && <em>Actual</em>}
            </div>
            <ul>
              {entry.notes.map((note, n) => (
                <li key={n}>{note}</li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
      {shown < CHANGELOG.length && (
        <button onClick={() => setShown(shown + 24)}>
          Ver versiones anteriores
        </button>
      )}
    </div>
  );
}
