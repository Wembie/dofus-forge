import {
  useEffect,
  useRef,
  Children,
  isValidElement,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { ArrowLeft } from "lucide-react";

/** Presentation adapter for the existing optimizer; its state machine is reused unchanged. */
export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement;
    ref.current?.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, [open]);
  if (!open) return null;
  return createPortal(
    <dialog
      ref={ref}
      className="forge-workbench"
      aria-label={title}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <header className="forge-header">
        <button onClick={onClose} aria-label="Volver al taller">
          <ArrowLeft size={18} />
          <span>Volver al taller</span>
        </button>
        <div>
          <span>DOFUS FORGE</span>
          <h2>{title}</h2>
        </div>
        <span>Mejora tu equipo</span>
      </header>
      <div className="forge-body">{presentOrder(children)}</div>
    </dialog>,
    document.body,
  );
}

type NodeProps = { className?: string; children?: ReactNode; reqs?: unknown };
/** Recompose the existing order's React elements; handlers, state and validation stay owned by OptimizerModal. */
function presentOrder(children: ReactNode): ReactNode {
  if (!isValidElement<NodeProps>(children)) return children;
  const nodes = Children.toArray(children.props.children);
  const goals = nodes.find(
    (n) => isValidElement<NodeProps>(n) && n.props.className === "space-y-2",
  );
  if (!goals) return children;
  const footer = nodes.at(-1);
  const summary = nodes.find(
    (n) =>
      isValidElement<NodeProps>(n) &&
      n.props.className?.includes("px-2.5 py-2"),
  );
  const help = nodes.filter((n) => isValidElement(n) && n.type === "p");
  const errors = help.filter(
    (n) =>
      isValidElement<NodeProps>(n) &&
      n.props.className?.includes("forge-log-in"),
  );
  const scale = nodes.find(
    (n) => isValidElement<NodeProps>(n) && n.props.reqs !== undefined,
  );
  const excluded = new Set([goals, footer, summary, scale, ...help]);
  const rules = nodes.filter((n) => !excluded.has(n));
  return (
    <div className="forge-order-content">
      {errors.length > 0 && (
        <div className="forge-errors" role="alert">
          {errors}
        </div>
      )}
      <div className="forge-context">{summary}</div>
      <nav className="forge-jumps" aria-label="Secciones del encargo">
        <a href="#forge-objectives">Objetivos</a>
        <a href="#forge-rules">Reglas y objetos</a>
        <a href="#forge-help">Cómo funciona la Ley</a>
      </nav>
      <div className="forge-columns">
        <section id="forge-objectives" aria-label="Objetivos del encargo">
          <div className="forge-section-title">
            <span>01</span>
            <h3>Qué quieres mejorar</h3>
          </div>
          <p>
            Define tus mínimos, el valor de cada punto y hasta dónde debe
            contar.
          </p>
          {goals}
          {scale}
        </section>
        <aside id="forge-rules" aria-label="Reglas del encargo">
          <div className="forge-section-title">
            <span>02</span>
            <h3>Con qué reglas buscar</h3>
          </div>
          <p>Conserva tus piezas importantes y decide qué puede cambiar.</p>
          <div className="forge-rules-list">{rules}</div>
        </aside>
      </div>
      <section
        id="forge-help"
        className="forge-order-help"
        aria-label="Ayuda del encargo"
      >
        {help.filter((n) => !errors.includes(n))}
      </section>
      <div className="forge-order-footer">{footer}</div>
    </div>
  );
}
