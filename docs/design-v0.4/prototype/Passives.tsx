import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, RotateCcw } from "lucide-react";
import { useBuildStore } from "../../../src/store/buildStore";
import {
  setCombatView,
  useCombatView,
} from "../../../src/store/useCombatView";
import {
  ITEM_PASSIVES,
  TEXT_ONLY_PASSIVES,
  controlRoom,
  passiveBonus,
  type PassiveBonus,
  type PassiveControl,
} from "../../../src/engine/passives";
import { bonusParts } from "../../../src/features/passives/passiveLabels";
import { plainText } from "../../../src/features/passives/PassivesPanel";
import { statIconUrl } from "../../../src/features/equipment/statDisplay";
import { visibleSlots, equipment } from "./model";
import type { AppItem } from "../../../src/data/loaders";
import "./tools.css";

/** Which numbers the workshop shows: the gear alone, or the gear with the passives you switch on. */
export function CombatSwitch() {
  const combat = useCombatView();
  return (
    <div className="view-switch">
      <div role="radiogroup" aria-label="Estadísticas que muestra el taller">
        <button
          role="radio"
          aria-checked={!combat}
          onClick={() => setCombatView(false)}
        >
          Equipo
        </button>
        <button
          role="radio"
          aria-checked={combat}
          onClick={() => setCombatView(true)}
        >
          En combate
        </button>
      </div>
      <p>
        {combat
          ? "El taller suma los pasivos que actives aquí, como durante un combate."
          : "El taller muestra solo tu equipo, como la ficha del juego fuera de combate."}
      </p>
    </div>
  );
}

function Bonus({ bonus }: { bonus: PassiveBonus }) {
  const { t } = useTranslation();
  return (
    <span className="passive-bonus">
      {bonusParts(bonus).map((p) => (
        <span key={p.key} className={p.negative ? "negative" : ""}>
          <img src={statIconUrl(p.icon)} alt="" />
          <b>{p.value}</b> {t(p.tKey)}
        </span>
      ))}
    </span>
  );
}

function Control({
  control,
  item,
}: {
  control: PassiveControl;
  item: AppItem;
}) {
  const state = useBuildStore((s) => s.passives),
    setPassive = useBuildStore((s) => s.setPassive),
    value = state[control.id] ?? 0,
    set = (next: number) => setPassive(control.id, next);
  if (control.kind === "stacks") {
    const room = controlRoom(control, state);
    return (
      <div className="passive-stacks">
        <p>
          <Bonus bonus={control.perStack} />
          <span>por acumulación</span>
        </p>
        <div>
          <button
            aria-label={`Quitar una acumulación de ${item.name}`}
            disabled={value <= 0}
            onClick={() => set(value - 1)}
          >
            −
          </button>
          <input
            type="range"
            min={0}
            max={control.max}
            value={value}
            aria-label={`Acumulaciones de ${item.name}`}
            aria-valuetext={`${value} de ${control.max}`}
            onChange={(e) => set(Math.min(Number(e.target.value), room))}
          />
          <button
            aria-label={`Añadir una acumulación a ${item.name}`}
            disabled={value >= room}
            onClick={() => set(value + 1)}
          >
            +
          </button>
          <output>
            <b>{value}</b> / {control.max}
          </output>
        </div>
      </div>
    );
  }
  if (control.options.length === 1) {
    const on = value === 1;
    return (
      <button
        className="passive-toggle"
        role="switch"
        aria-checked={on}
        onClick={() => set(on ? 0 : 1)}
      >
        <i />
        <span>
          {control.options[0].turn != null && (
            <em>Turno {control.options[0].turn}</em>
          )}
          <Bonus bonus={control.options[0].bonus} />
        </span>
      </button>
    );
  }
  return (
    <div
      className="passive-options"
      role="radiogroup"
      aria-label={`Caso activo de ${item.name}`}
    >
      <button role="radio" aria-checked={value === 0} onClick={() => set(0)}>
        Sin activar
      </button>
      {control.options.map((option, i) => (
        <button
          key={i}
          role="radio"
          aria-checked={value === i + 1}
          onClick={() => set(i + 1)}
        >
          {option.turn != null && <em>Turno {option.turn}</em>}
          <Bonus bonus={option.bonus} />
        </button>
      ))}
    </div>
  );
}

function Passive({ item }: { item: AppItem }) {
  const state = useBuildStore((s) => s.passives),
    [open, setOpen] = useState(false);
  const controls = ITEM_PASSIVES.get(item.ankama_id) ?? [],
    active = controls.some((c) => (state[c.id] ?? 0) > 0),
    shared = controls.filter((c) => c.kind === "stacks" && c.shared),
    cap =
      shared.length > 1 && shared[0].kind === "stacks" ? shared[0].shared : null,
    used = shared.reduce((sum, c) => sum + (state[c.id] ?? 0), 0);
  const [, ...bullets] = (item.ability ?? "").split("•").map((s) => s.trim()),
    ability = (item.ability ?? "").split(":")[0]?.trim();
  return (
    <li className={"passive" + (active ? " is-active" : "")}>
      <div className="passive-source">
        <img src={item.image_url || "/design-assets/forge-mark.svg"} alt="" />
        <span>
          <b>{item.name}</b>
          <small>
            {ability && ability !== item.name ? ability + " · " : ""}
            {!controls.length
              ? "sin efecto en estadísticas"
              : active
                ? "activo"
                : "sin activar"}
          </small>
        </span>
      </div>
      <div className="passive-controls">
        {controls.map((control) => (
          <Control key={control.id} control={control} item={item} />
        ))}
        {!controls.length && (
          <p className="passive-plain">
            Da escudos, curas o estados: no cambia las cifras del taller.
          </p>
        )}
        {cap != null && (
          <p className="passive-plain">
            Acumulaciones compartidas: {used} de {cap}.
          </p>
        )}
        {bullets.some(Boolean) && (
          <>
            <button
              className="passive-text"
              aria-expanded={open}
              onClick={() => setOpen(!open)}
            >
              <ChevronDown size={14} />
              {open ? "Ocultar texto del juego" : "Ver texto del juego"}
            </button>
            {open && (
              <ul>
                {bullets.filter(Boolean).map((line, i) => (
                  <li key={i}>{plainText(line)}</li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </li>
  );
}

/** One row per equipped item with a passive: what it gives, set to the state you want to read. */
export function Passives() {
  const equipped = useBuildStore((s) => s.equipped),
    state = useBuildStore((s) => s.passives),
    setPassive = useBuildStore((s) => s.setPassive);
  const items = visibleSlots
    .flatMap((slot) => equipment.get(equipped[slot] || 0) ?? [])
    .filter(
      (it) =>
        ITEM_PASSIVES.has(it.ankama_id) || TEXT_ONLY_PASSIVES.has(it.ankama_id),
    );
  const total = passiveBonus(
      items.map((it) => it.ankama_id),
      state,
    ),
    any = Object.keys(total).length > 0,
    activeIds = Object.keys(state).filter((id) => state[id] > 0);
  return (
    <div className="passives">
      <CombatSwitch />
      {!items.length ? (
        <div className="tool-empty">
          <h3>Tu equipo no tiene pasivos de combate</h3>
          <p>
            Aparecen al equipar Dofus, prismaraditas u objetos legendarios con
            un efecto que se activa durante el combate.
          </p>
        </div>
      ) : (
        <>
          <div className="passive-total" aria-live="polite">
            <span>Suma de pasivos activos</span>
            {any ? (
              <Bonus bonus={total} />
            ) : (
              <em>Ninguno activo todavía</em>
            )}
            {activeIds.length > 0 && (
              <button onClick={() => activeIds.forEach((id) => setPassive(id, 0))}>
                <RotateCcw size={14} />
                Restablecer
              </button>
            )}
          </div>
          <ul className="passive-list">
            {items.map((it) => (
              <Passive key={it.ankama_id} item={it} />
            ))}
          </ul>
          <p className="passive-plain">
            Actívalos según cómo va el combate. Se suman al daño de hechizos y
            armas y a la simulación de combate.
          </p>
        </>
      )}
    </div>
  );
}
