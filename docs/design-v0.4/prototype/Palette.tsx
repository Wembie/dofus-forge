import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ElementType,
} from "react";
import { createPortal } from "react-dom";
import { CornerDownLeft, Search } from "lucide-react";
import { normalizeSearch } from "@/ui/normalize.ts";
import "./tools.css";

const OPEN_EVENT = "forge-palette-open";
/** For a visible trigger: touch screens have no Ctrl+K. */
export const openPalette = () => window.dispatchEvent(new Event(OPEN_EVENT));

/** Same shape as production's Command, plus the group it is listed under and an optional key hint. */
export type PaletteCommand = {
  key: string;
  label: string;
  Icon: ElementType;
  onRun: () => void;
  disabled?: boolean;
  group: string;
  hint?: string;
};

/**
 * Ctrl/Cmd+K, as in production: the actions already on screen, faster to
 * reach. Filters by name without accents, moves with the arrows, runs with
 * Enter, closes with Escape or a click outside; disabled actions stay listed.
 */
export function Palette({ commands }: { commands: PaletteCommand[] }) {
  const [open, setOpenState] = useState(false),
    [query, setQuery] = useState(""),
    [active, setActive] = useState(0),
    ref = useRef<HTMLDialogElement>(null),
    input = useRef<HTMLInputElement>(null),
    listId = useId();
  const shown = useMemo(() => {
    const q = normalizeSearch(query.trim());
    return q
      ? commands.filter((c) => normalizeSearch(c.label).includes(q))
      : commands;
  }, [commands, query]);
  const groups = useMemo(
    () =>
      [...new Set(shown.map((c) => c.group))].map((group) => ({
        group,
        items: shown.filter((c) => c.group === group),
      })),
    [shown],
  );
  const order = groups.flatMap((g) => g.items);
  /** Search and highlight start fresh every time, so they are reset together with the open state. */
  function setOpen(next: boolean | ((was: boolean) => boolean)) {
    setOpenState((was) => {
      const now = typeof next === "function" ? next(was) : next;
      if (now !== was) {
        setQuery("");
        setActive(0);
      }
      return now;
    });
  }
  useEffect(() => {
    function toggle(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    }
    const show = () => setOpen(true);
    window.addEventListener("keydown", toggle);
    window.addEventListener(OPEN_EVENT, show);
    return () => {
      window.removeEventListener("keydown", toggle);
      window.removeEventListener(OPEN_EVENT, show);
    };
  }, []);
  useLayoutEffect(() => {
    if (!open) return;
    const trigger = document.activeElement as HTMLElement | null;
    ref.current?.showModal();
    input.current?.focus();
    return () => trigger?.focus();
  }, [open]);
  useEffect(() => setActive(0), [query]);
  useEffect(() => {
    document
      .getElementById(`${listId}-${active}`)
      ?.scrollIntoView({ block: "nearest" });
  }, [active, listId]);
  if (!open) return null;
  function run(c: PaletteCommand | undefined) {
    if (!c || c.disabled) return;
    setOpen(false);
    c.onRun();
  }
  return createPortal(
    <dialog
      ref={ref}
      className="palette"
      aria-label="Buscar una acción"
      onCancel={(e) => {
        e.preventDefault();
        setOpen(false);
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) setOpen(false);
      }}
      onKeyDown={(e) => {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setActive((i) => Math.min(i + 1, order.length - 1));
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          setActive((i) => Math.max(i - 1, 0));
        } else if (e.key === "Enter") {
          e.preventDefault();
          run(order[active]);
        }
      }}
    >
      <label className="palette-search">
        <Search size={18} aria-hidden="true" />
        <input
          ref={input}
          role="combobox"
          aria-expanded="true"
          aria-controls={listId}
          aria-activedescendant={order.length ? `${listId}-${active}` : undefined}
          aria-label="Buscar una acción"
          placeholder="Buscar una acción…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <kbd>Esc</kbd>
      </label>
      <div className="palette-list" id={listId} role="listbox" aria-label="Acciones">
        {!order.length && (
          <p className="palette-empty">Ninguna acción coincide con «{query}».</p>
        )}
        {groups.map(({ group, items }) => (
          <div key={group} role="group" aria-label={group}>
            <h3 aria-hidden="true">{group}</h3>
            {items.map((c) => {
              const i = order.indexOf(c);
              return (
                <div
                  key={c.key}
                  id={`${listId}-${i}`}
                  role="option"
                  aria-selected={i === active}
                  aria-disabled={c.disabled || undefined}
                  className="palette-option"
                  onMouseMove={() => setActive(i)}
                  onClick={() => run(c)}
                >
                  <c.Icon size={16} aria-hidden="true" />
                  <span>{c.label}</span>
                  {c.disabled ? (
                    <small>No disponible</small>
                  ) : c.hint ? (
                    <kbd>{c.hint}</kbd>
                  ) : null}
                  {i === active && !c.disabled && (
                    <CornerDownLeft size={14} aria-hidden="true" />
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <footer className="palette-foot" aria-hidden="true">
        <span>
          <kbd>↑</kbd>
          <kbd>↓</kbd> moverse
        </span>
        <span>
          <kbd>Enter</kbd> ejecutar
        </span>
        <span>
          <kbd>Ctrl</kbd>
          <kbd>K</kbd> abrir o cerrar
        </span>
      </footer>
    </dialog>,
    document.body,
  );
}
