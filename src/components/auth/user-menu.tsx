"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import Link from "next/link";
import { useFormStatus } from "react-dom";
import { ChevronDown, LayoutDashboard, LogOut } from "lucide-react";

import { logOut } from "@/app/(auth)/actions";
import { Avatar } from "@/components/ui/avatar";

type UserMenuProps = {
  name: string;
  email: string;
};

const itemClass =
  "flex h-12 w-full cursor-pointer items-center gap-3 rounded-md border-none bg-transparent px-3.5 text-left font-sans text-body font-medium text-fg-primary no-underline hover:bg-surface-fill hover:text-fg-primary focus-visible:bg-surface-fill disabled:cursor-not-allowed disabled:text-fg-disabled";

/** Avatar button with an account dropdown: identity, Dashboard and Sign out. */
export function UserMenu({ name, email }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const displayName = name || email;

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

  function handleTriggerKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
    } else if (event.key === "Escape" && open) {
      event.preventDefault();
      setOpen(false);
    }
  }

  function handleMenuKeyDown(event: KeyboardEvent<HTMLDivElement>) {
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

  return (
    <div ref={rootRef} className="relative flex-none">
      <button
        ref={triggerRef}
        type="button"
        aria-label={`Account menu for ${displayName}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((value) => !value)}
        onKeyDown={handleTriggerKeyDown}
        className="flex h-11 cursor-pointer items-center gap-1 rounded-full border-none bg-transparent p-0 pr-1 text-fg-primary transition-transform duration-[120ms] active:scale-[.94]"
      >
        <Avatar name={displayName} size={40} />
        <ChevronDown
          size={18}
          aria-hidden
          className={`transition-transform duration-[200ms] ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open ? (
        <div className="absolute top-[calc(100%_+_12px)] right-0 z-10 box-border flex w-[min(280px,calc(100vw_-_24px))] flex-col gap-1 rounded-xl bg-white p-3 shadow-[var(--shadow-lg)]">
          <div className="flex min-w-0 flex-col gap-0.5 px-3.5 pt-1.5 pb-2.5">
            <span className="truncate text-body font-semibold text-fg-primary">{displayName}</span>
            {name ? <span className="truncate text-body-sm text-fg-secondary">{email}</span> : null}
          </div>
          <div className="h-px bg-border-subtle" aria-hidden />

          <div
            ref={menuRef}
            id={menuId}
            role="menu"
            aria-label="Account"
            onKeyDown={handleMenuKeyDown}
            className="flex flex-col gap-1 pt-1"
          >
            <Link
              href="/dashboard"
              role="menuitem"
              tabIndex={-1}
              onClick={() => setOpen(false)}
              className={itemClass}
            >
              <LayoutDashboard size={20} aria-hidden />
              Dashboard
            </Link>
            <form action={logOut} className="m-0">
              <SignOutItem />
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SignOutItem() {
  const { pending } = useFormStatus();

  return (
    <button type="submit" role="menuitem" tabIndex={-1} disabled={pending} className={itemClass}>
      <LogOut size={20} aria-hidden />
      {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}
