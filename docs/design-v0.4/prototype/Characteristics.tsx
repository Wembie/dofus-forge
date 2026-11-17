import { useCallback, useEffect, useRef, useState } from "react";
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

/** Step size as in production: Shift = 5, Ctrl/⌘ = 20, otherwise 1. */
const step = (e: { shiftKey: boolean; ctrlKey: boolean; metaKey: boolean }) =>
  e.shiftKey ? 5 : e.ctrlKey || e.metaKey ? 20 : 1;

/**
 * Press-and-hold as in production: one step on press, then after 350 ms a
 * repeat every 80 ms that speeds up to 5 per tick after 15 ticks. Pointer
 * events cover mouse and touch; a keyboard click still does a single step.
 */
function useHold(apply: (n: number) => void) {
  const fn = useRef(apply),
    timer = useRef<ReturnType<typeof setTimeout>>(undefined),
    tick = useRef<ReturnType<typeof setInterval>>(undefined),
    pressed = useRef(false);
  fn.current = apply;
  const stop = useCallback(() => {
    clearTimeout(timer.current);
    clearInterval(tick.current);
  }, []);
  useEffect(() => stop, [stop]);
  return {
    onPointerDown: (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      pressed.current = true;
      fn.current(step(e));
      if (e.shiftKey || e.ctrlKey || e.metaKey) return;
      let count = 0;
      timer.current = setTimeout(() => {
        tick.current = setInterval(() => {
          count++;
          fn.current(count >= 15 ? 5 : 1);
        }, 80);
      }, 350);
    },
    onPointerUp: stop,
    onPointerLeave: stop,
    onPointerCancel: stop,
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
    onClick: (e: React.MouseEvent) => {
      if (pressed.current) {
        pressed.current = false;
        return;
      }
      fn.current(step(e));
    },
  };
}

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

const signedDelta = (n: number) =>
  (n > 0 ? "+" : "−") + number.format(Math.abs(n));

function Step({
  label,
  disabled,
  apply,
  children,
}: {
  label: string;
  disabled: boolean;
  apply: (n: number) => void;
  children: React.ReactNode;
}) {
  const hold = useHold(apply);
  return (
    <button
      aria-label={label}
      title={label + " (Mayús ×5, Ctrl ×20, mantener para repetir)"}
      disabled={disabled}
      {...hold}
    >
      {children}
    </button>
  );
}

/** One row per characteristic: scroll, points and the resulting total, read left to right. */
export function Characteristics() {
  const b = useBuildStore(),
    gear = b.stats,
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
    power = stats?.power ?? 0,
    powerFromPassives = combat && gear ? power - gear.power : 0;
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
              <Step
                label={`Quitar puntos de ${NAMES[char]}`}
                disabled={points <= 0}
                apply={(n) => b.removePoints(char, n)}
              >
                −
              </Step>
              <Points
                char={char}
                value={points}
                onCommit={(target) => commit(char, target)}
              />
              <Step
                label={`Añadir puntos a ${NAMES[char]}`}
                disabled={left < next}
                apply={(n) => b.addPoints(char, n)}
              >
                +
              </Step>
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
              <strong>
                {number.format(total)}
                {combat && gear && total !== (char === "vitality" ? gear.maxHp : gear[char]) && (
                  <em title="Lo que suman tus pasivos de combate">
                    {signedDelta(total - (char === "vitality" ? gear.maxHp : gear[char]))}
                  </em>
                )}
              </strong>
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
          Mantén pulsado − o + para repetir; con Mayús suma de 5 en 5 y con
          Ctrl de 20 en 20.{" "}
          {power > 0
            ? `Tu potencia (+${number.format(power)}${powerFromPassives ? `, ${signedDelta(powerFromPassives)} por pasivos` : ""}) se suma a Fuerza, Inteligencia, Suerte y Agilidad al calcular daños.`
            : "La potencia de tu equipo se suma a las cuatro características elementales al calcular daños."}
        </p>
        <button onClick={() => b.setAllScrolls(!everyScroll)}>
          {everyScroll ? "Quitar todos los pergaminos" : "Usar todos los pergaminos"}
        </button>
      </div>
    </div>
  );
}
