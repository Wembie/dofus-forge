import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { ModalProps } from "../../../src/ui/Modal";

/** Study-only presentation. Native dialog provides focus containment and top-layer stacking. */
export function Modal({
  open,
  onClose,
  title,
  ariaLabel,
  labelledBy,
  size = "md",
  className = "",
  children,
}: ModalProps) {
  const { t } = useTranslation();
  const ref = useRef<HTMLDialogElement>(null),
    id = useId();
  useEffect(() => {
    if (!open) return;
    const trigger = document.activeElement as HTMLElement;
    ref.current?.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
      trigger?.focus();
    };
  }, [open]);
  if (!open) return null;
  return createPortal(
    <dialog
      ref={ref}
      className={`surface-dialog size-${size} ${className}`}
      aria-label={title ? undefined : ariaLabel}
      aria-labelledby={title ? id : labelledBy}
      onCancel={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          const r = e.currentTarget.getBoundingClientRect();
          if (
            e.clientX < r.left ||
            e.clientX > r.right ||
            e.clientY < r.top ||
            e.clientY > r.bottom
          )
            onClose();
        }
      }}
    >
      <header className="surface-dialog-header">
        {title ? <h2 id={id}>{title}</h2> : <span />}
        <button
          className="icon-button"
          onClick={onClose}
          aria-label={t("modal_close")}
        >
          <X size={20} />
        </button>
      </header>
      <div className="surface-dialog-content legacy-content">{children}</div>
    </dialog>,
    document.body,
  );
}
