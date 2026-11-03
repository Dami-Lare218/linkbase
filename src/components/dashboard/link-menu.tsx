"use client";

import { EllipsisVertical, Pencil, Trash2 } from "lucide-react";

import { useMenu } from "@/components/ui/use-menu";

type LinkMenuProps = {
  title: string;
  onEdit: () => void;
  onDelete: () => void;
};

const itemClass =
  "flex h-11 w-full cursor-pointer items-center gap-3 rounded-md border-none bg-transparent px-3 text-left font-sans text-body font-medium text-fg-primary hover:bg-surface-fill focus-visible:bg-surface-fill";

/** The link card's ⋮ button and its menu: Edit, Delete. */
export function LinkMenu({ title, onEdit, onDelete }: LinkMenuProps) {
  const { open, close, rootRef, triggerProps, menuProps } = useMenu();

  // Delete: focus goes back to ⋮ first, so the dialog returns focus there when it closes.
  // Edit: the row becomes a form that focuses its title field itself.
  function choose(action: () => void, returnFocus: boolean) {
    close(returnFocus);
    action();
  }

  return (
    <div ref={rootRef} className="relative flex-none">
      <button
        {...triggerProps}
        type="button"
        aria-label={`Options for ${title}`}
        title="Link options"
        className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border-none bg-transparent text-fg-primary hover:bg-surface-fill"
      >
        <EllipsisVertical size={18} aria-hidden />
      </button>
      {open ? (
        <div
          {...menuProps}
          aria-label={`Options for ${title}`}
          className="absolute top-[calc(100%_+_6px)] right-0 z-10 box-border flex w-44 flex-col gap-1 rounded-xl bg-white p-2 shadow-[var(--shadow-lg)]"
        >
          <button type="button" role="menuitem" tabIndex={-1} onClick={() => choose(onEdit, false)} className={itemClass}>
            <Pencil size={18} aria-hidden />
            Edit
          </button>
          <button
            type="button"
            role="menuitem"
            tabIndex={-1}
            onClick={() => choose(onDelete, true)}
            className={`${itemClass} text-[var(--status-error)] hover:text-[var(--status-error)]`}
          >
            <Trash2 size={18} aria-hidden />
            Delete
          </button>
        </div>
      ) : null}
    </div>
  );
}
