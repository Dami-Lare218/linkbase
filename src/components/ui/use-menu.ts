"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { KeyboardEvent } from "react";

/**
 * State and keyboard behaviour for a button-triggered menu (`role="menu"`): opens on
 * click or ArrowUp/Down, focuses the first item, moves with arrows/Home/End, closes on
 * Escape (focus returns to the trigger), Tab or an outside click. Shared by UserMenu and
 * the link card's ⋮ menu. Items need `role="menuitem"` and `tabIndex={-1}`.
 */
export function useMenu() {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  function getItems(): HTMLElement[] {
    return Array.from(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);
  }

  function close(returnFocus: boolean) {
    setOpen(false);
    if (returnFocus) triggerRef.current?.focus();
  }

  // Focus the first item when the menu opens.
  useEffect(() => {
    if (open) menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
  }, [open]);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  function onTriggerKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
    } else if (event.key === "Escape" && open) {
      event.preventDefault();
      setOpen(false);
    }
  }

  function onMenuKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const items = getItems();
    const index = items.indexOf(document.activeElement as HTMLElement);

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        items[(index + 1) % items.length]?.focus();
        break;
      case "ArrowUp":
        event.preventDefault();
        items[(index - 1 + items.length) % items.length]?.focus();
        break;
      case "Home":
        event.preventDefault();
        items[0]?.focus();
        break;
      case "End":
        event.preventDefault();
        items[items.length - 1]?.focus();
        break;
      case "Escape":
        event.preventDefault();
        close(true);
        break;
      case "Tab":
        // Let focus move on naturally, and close behind it.
        setOpen(false);
        break;
    }
  }

  return {
    open,
    setOpen,
    close,
    rootRef,
    menuRef,
    /** Spread onto the trigger button. */
    triggerProps: {
      ref: triggerRef,
      "aria-haspopup": "menu" as const,
      "aria-expanded": open,
      "aria-controls": open ? menuId : undefined,
      onClick: () => setOpen((value) => !value),
      onKeyDown: onTriggerKeyDown,
    },
    /** Spread onto the `role="menu"` element. */
    menuProps: {
      ref: menuRef,
      id: menuId,
      role: "menu" as const,
      onKeyDown: onMenuKeyDown,
    },
  };
}
