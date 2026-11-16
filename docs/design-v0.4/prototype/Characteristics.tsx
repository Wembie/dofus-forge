import { useEffect, useRef, useState } from "react";
import { useBuildStore } from "../../../src/store/buildStore";
import { useCombatStats } from "../../../src/store/useCombatStats";
import {
  useCombatView,
  useHasPassives,
} from "../../../src/store/useCombatView";
import {
  maxPointsForBudget,
  pointCost,
  statBudget,
  SCROLL_BONUS,
} from "../../../src/engine/characteristics";
import {
  CHARACTERISTICS,
  type Characteristic,
} from "../../../src/engine/types";
import { statIconUrl } from "../../../src/features/equipment/statDisplay";
import "./tools.css";

const NAMES: Record<Characteristic, string> = {
  vitality: "Vitalidad",
  wisdom: "Sabiduría",
  strength: "Fuerza",
  intelligence: "Inteligencia",
  chance: "Suerte",
  agility: "Agilidad",
};
const ELEMENTAL = new Set<Characteristic>([
  "strength",
  "intelligence",
  "chance",
  "agility",
]);
/** Thousands are always grouped, as in the workshop sheet (the "es" locale skips four-digit numbers). */
const number = {
  format: (n: number) =>
    String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, "."),
};

function Points({
  char,
  value,
  onCommit,
}: {
  char: Characteristic;
  value: number;
  onCommit: (target: number) => void;
}) {
  const [text, setText] = useState(String(value)),
    editing = useRef(false);
  useEffect(() => {
    if (!editing.current) setText(String(value));
  }, [value]);
  return (
    <input
      inputMode="numeric"
      aria-label={"Puntos en " + NAMES[char]}
      value={text}
      onFocus={(e) => {
        editing.current = true;
        e.currentTarget.select();
      }}
      onChange={(e) => setText(e.target.value.replace(/\D/g, "").slice(0, 4))}
      onBlur={() => {
        editing.current = false;
        onCommit(Number(text) || 0);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
      }}
    />
  );
}

/** One row per characteristic: scroll, points and the resulting total, read left to right. */
export function Characteristics() {
  const b = useBuildStore(),
    combatStats = useCombatStats(),
    combatView = useCombatView(),
    hasPassives = useHasPassives(),
    combat = combatView && hasPassives && combatStats != null,
    stats = combat ? combatStats : b.stats;
  const budget = statBudget(b.level),
    spent = CHARACTERISTICS.reduce(
      (sum, c) => sum + pointCost(c, b.allocated[c]),
      0,
    ),
    left = budget - spent,
    everyScroll = CHARACTERISTICS.every((c) => b.scrolled[c]),
    power = stats?.power ?? 0;
  function commit(char: Characteristic, target: number) {
    const now = b.allocated[char];
    if (target > now) b.addPoints(char, target - now);
    else if (target < now) b.removePoints(char, now - target);
  }
  return (
    <div className="chars">
      <div className="chars-budget">
        <p>
          <strong>{number.format(left)}</strong>
          {left === 1 ? " punto por repartir" : " puntos por repartir"}
          <span>
            {number.format(spent)} de {number.format(budget)} usados · nivel{" "}
            {b.level}
          </span>
        </p>
        <div
          className="chars-meter"
          role="img"
          aria-label={`${spent} de ${budget} puntos usados`}
        >
          <i style={{ width: (budget ? (spent / budget) * 100 : 0) + "%" }} />
        </div>
      </div>
      {combat && (
        <p className="chars-note">
          Vista en combate: los totales incluyen tus pasivos activos.
        </p>
      )}
      <div className="chars-head" aria-hidden="true">
        <span>Característica</span>
        <span>Pergamino</span>
        <span>Puntos</span>
        <span>Total</span>
      </div>
      {CHARACTERISTICS.map((char) => {
        const points = b.allocated[char],
          next = pointCost(char, points + 1) - pointCost(char, points),
          most = maxPointsForBudget(char, left + pointCost(char, points)),
          total = stats
            ? char === "vitality"
              ? stats.maxHp
              : stats[char]
            : points;
        return (
          <div
            className={"chars-row" + (char === "strength" ? " starts-group" : "")}
            role="group"
            aria-label={NAMES[char]}
            key={char}
          >
            <div className="chars-name">
              <img src={statIconUrl(char)} alt="" />
              <span>
                <b>{NAMES[char]}</b>
                <small>
                  {next === 1 ? "1 punto" : `${next} puntos`} por unidad
                </small>
              </span>
            </div>
            <button
              className="chars-scroll"
              aria-pressed={b.scrolled[char]}
              aria-label={`Pergamino de ${NAMES[char]}, +${SCROLL_BONUS}`}
              onClick={() => b.toggleScroll(char)}
            >
              +{SCROLL_BONUS}
            </button>
            <div className="chars-points">
              <button
                aria-label={`Quitar 10 puntos de ${NAMES[char]}`}
                disabled={points <= 0}
                onClick={() => b.removePoints(char, 10)}
              >
                −10
              </button>
              <Points
                char={char}
                value={points}
                onCommit={(target) => commit(char, target)}
              />
              <button
                aria-label={`Añadir 10 puntos a ${NAMES[char]}`}
                disabled={left < next}
                onClick={() => b.addPoints(char, 10)}
              >
                +10
              </button>
              <button
                className="chars-max"
                aria-label={`Asignar el máximo posible a ${NAMES[char]}`}
                disabled={most <= points}
                onClick={() => commit(char, most)}
              >
                Máx.
              </button>
            </div>
            <div className="chars-total">
              <strong>{number.format(total)}</strong>
              <small>
                {char === "vitality"
                  ? "puntos de vida"
                  : ELEMENTAL.has(char) && power > 0
                    ? `${number.format(total + power)} con potencia`
                    : " "}
              </small>
            </div>
          </div>
        );
      })}
      <div className="chars-foot">
        <p>
          {power > 0
            ? `Tu potencia (+${number.format(power)}) se suma a Fuerza, Inteligencia, Suerte y Agilidad al calcular daños.`
            : "La potencia de tu equipo se suma a las cuatro características elementales al calcular daños."}
        </p>
        <button onClick={() => b.setAllScrolls(!everyScroll)}>
          {everyScroll ? "Quitar todos los pergaminos" : "Usar todos los pergaminos"}
        </button>
      </div>
    </div>
  );
}
