import { useMemo } from "react";
import { useBuildStore } from "../../../src/store/buildStore";
import { useDataStore } from "../../../src/store/dataStore";
import { usePvpStore, type PvpElement } from "../../../src/store/pvpStore";
import { useCombatStats } from "../../../src/store/useCombatStats";
import {
  dedupEffects,
  spellGrade,
  spellMods,
} from "../../../src/features/spells/spellCalc";
import {
  simulateSpellHit,
  simulateWeaponHit,
  type HitResult,
} from "../../../src/features/pvp/simulate";
import { statIconUrl } from "../../../src/features/equipment/statDisplay";
import type { AppSpell } from "../../../src/data/spellLoaders";
import { equipment } from "./model";
import "./tools.css";

const ELEMENTS: [PvpElement, string][] = [
  ["neutral", "Neutro"],
  ["earth", "Tierra"],
  ["fire", "Fuego"],
  ["water", "Agua"],
  ["air", "Aire"],
];
/** Mirrors the production picker: effects that hit a plain target, without a condition. */
const HITS = new Set(["damage", "steal", "poison"]);

interface Row {
  key: string;
  name: string;
  art: string | null;
  hit: HitResult;
}
const span = (lo: number, hi: number) => (hi > lo ? `${lo} – ${hi}` : String(lo));

/** Every attack of the build against one target: the normal and critical range, side by side. */
export function Combat() {
  const b = useBuildStore(),
    stats = useCombatStats(),
    spells = useDataStore((s) => s.spells),
    resist = usePvpStore((s) => s.resist),
    setResist = usePvpStore((s) => s.setResist),
    reset = usePvpStore((s) => s.reset);
  const weapon = equipment.get(b.equipped.weapon || 0),
    transform = b.weaponTransforms.weapon ?? null,
    grade = spellGrade(b.level);
  const groups = useMemo(() => {
    if (!stats || !b.selectedClass) return [];
    const rows = (list: AppSpell[]) =>
      list.flatMap((spell): Row[] => {
        const level =
          spell.levels.find((l) => l.grade === grade) ?? spell.levels.at(-1);
        if (
          !level ||
          !dedupEffects(level.effects).some(
            (e) => HITS.has(e.kind) && e.condition === undefined,
          )
        )
          return [];
        return [
          {
            key: "s" + spell.id,
            name: spell.name,
            art: spell.image_url,
            hit: simulateSpellHit(
              level,
              stats,
              spellMods(stats, level.minRange, level.maxRange),
              resist,
            ),
          },
        ];
      });
    const own = spells.get(b.selectedClass)?.spells ?? [],
      common = spells.get("common")?.spells ?? [];
    return [
      {
        title: "Arma",
        rows: weapon
          ? [
              {
                key: "weapon",
                name: weapon.name,
                art: weapon.image_url,
                hit: simulateWeaponHit(weapon, stats, resist, transform),
              },
            ]
          : [],
      },
      { title: "Hechizos", rows: rows(own.filter((s) => !s.is_variant)) },
      { title: "Variantes", rows: rows(own.filter((s) => s.is_variant)) },
      { title: "Hechizos comunes", rows: rows(common) },
    ].filter((g) => g.rows.length);
  }, [stats, spells, resist, weapon, transform, grade, b.selectedClass]);
  const untouched = ELEMENTS.every(
    ([el]) => !resist[el].fixed && !resist[el].percent,
  );
  return (
    <div className="combat">
      <div className="combat-layout">
        <section className="combat-target" aria-label="Objetivo">
          <header>
            <h3>Objetivo</h3>
            <button disabled={untouched} onClick={reset}>
              Reiniciar
            </button>
          </header>
          <div className="combat-resist" role="group" aria-label="Resistencias">
            <span>Resistencia</span>
            <span>Fija</span>
            <span>%</span>
            {ELEMENTS.map(([el, name]) => (
              <div key={el}>
                <span className={el}>
                  <img src={statIconUrl(el + "_resistance")} alt="" />
                  {name}
                </span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  aria-label={`Resistencia fija a ${name}`}
                  value={resist[el].fixed}
                  onFocus={(e) => e.currentTarget.select()}
                  onChange={(e) =>
                    setResist(
                      el,
                      "fixed",
                      Math.max(0, parseInt(e.target.value, 10) || 0),
                    )
                  }
                />
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={100}
                  aria-label={`Resistencia porcentual a ${name}`}
                  value={resist[el].percent}
                  onFocus={(e) => e.currentTarget.select()}
                  onChange={(e) =>
                    setResist(
                      el,
                      "percent",
                      Math.min(
                        100,
                        Math.max(0, parseInt(e.target.value, 10) || 0),
                      ),
                    )
                  }
                />
              </div>
            ))}
          </div>
          <p>
            {untouched
              ? "Sin resistencias: verás el daño de tu build tal cual."
              : "El daño de la tabla ya descuenta estas resistencias."}{" "}
            Siempre cuenta tus pasivos de combate activos.
          </p>
        </section>
        <section className="combat-damage" aria-label="Daño de tus ataques">
          {!groups.length ? (
            <div className="tool-empty">
              <h3>Aún no hay ataques que calcular</h3>
              <p>
                Elige una clase o equipa un arma para ver cuánto daño hace cada
                ataque contra este objetivo.
              </p>
            </div>
          ) : (
            <table>
              <caption className="sr-only">
                Daño por ataque contra el objetivo
              </caption>
              <thead>
                <tr>
                  <th scope="col">Ataque</th>
                  <th scope="col">Golpe normal</th>
                  <th scope="col">Crítico</th>
                </tr>
              </thead>
              {groups.map((group) => (
                <tbody key={group.title}>
                  <tr className="combat-group">
                    <th scope="colgroup" colSpan={3}>
                      {group.title}
                    </th>
                  </tr>
                  {group.rows.map((row) => (
                    <tr key={row.key}>
                      <th scope="row">
                        <span>
                          {row.art ? <img src={row.art} alt="" /> : <i />}
                          {row.name}
                        </span>
                      </th>
                      <td>{span(row.hit.min, row.hit.max)}</td>
                      <td className={row.hit.hasCrit ? "is-crit" : "is-none"}>
                        {row.hit.hasCrit
                          ? span(row.hit.critMin, row.hit.critMax)
                          : "sin crítico"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              ))}
            </table>
          )}
        </section>
      </div>
    </div>
  );
}
