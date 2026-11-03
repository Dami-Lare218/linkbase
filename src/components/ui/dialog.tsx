"use client";

import { useEffect, useId, useRef } from "react";
import type { MouseEvent, ReactNode } from "react";
import { X } from "lucide-react";

import { IconButton } from "./icon-button";

type DialogProps = {
  open: boolean;
  /** Called on Escape, the ✕ button, or a click on the backdrop. */
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  /** Max width in px (design default 480). */
  width?: number;
};

/**
 * Modal dialog (design system `Dialog`) on the native `<dialog>` element: `showModal()`
 * gives focus trapping, Escape to close and an inert page behind it. Focus goes to the
 * first focusable element in the content and returns to the opener on close.
 */
export function Dialog({ open, onClose, title, description, children, width = 480 }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  function handleBackdropClick(event: MouseEvent<HTMLDialogElement>) {
    // Clicks on the ::backdrop target the <dialog> itself; clicks inside hit the panel.
    if (event.target === event.currentTarget) onClose();
  }

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={handleBackdropClick}
      className="m-auto box-border w-[calc(100%-32px)] animate-[lb-fade-up_var(--duration-slow)_var(--ease-out)] rounded-2xl border-none bg-surface-card p-0 text-fg-primary shadow-[var(--shadow-overlay)] backdrop:bg-[var(--surface-overlay)]"
      style={{ maxWidth: width }}
    >
      {open ? (
        <div className="relative p-[clamp(24px,5vw,32px)]">
          <h2
            id={titleId}
            className="m-0 mr-10 mb-2 font-sans text-[length:var(--text-heading-md)] leading-[var(--lh-heading-md)] font-extrabold tracking-[var(--tracking-heading)]"
          >
            {title}
          </h2>
          {description ? (
            <p id={descriptionId} className="m-0 mb-6 text-body text-fg-secondary">
              {description}
            </p>
          ) : null}
          {children}
          {/* Last in DOM order so showModal() focuses the first field or action, not Close. */}
          <IconButton icon={X} label="Close" size="sm" onClick={onClose} className="absolute top-5 right-5" />
        </div>
      ) : null}
    </dialog>
  );
}
