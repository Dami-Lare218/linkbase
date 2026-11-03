"use client";

import Link from "next/link";
import { useFormStatus } from "react-dom";
import { ChevronDown, LayoutDashboard, LogOut } from "lucide-react";

import { logOut } from "@/app/(auth)/actions";
import { Avatar } from "@/components/ui/avatar";
import { useMenu } from "@/components/ui/use-menu";

type UserMenuProps = {
  name: string;
  email: string;
};

const itemClass =
  "flex h-12 w-full cursor-pointer items-center gap-3 rounded-md border-none bg-transparent px-3.5 text-left font-sans text-body font-medium text-fg-primary no-underline hover:bg-surface-fill hover:text-fg-primary focus-visible:bg-surface-fill disabled:cursor-not-allowed disabled:text-fg-disabled";

/** Avatar button with an account dropdown: identity, Dashboard and Sign out. */
export function UserMenu({ name, email }: UserMenuProps) {
  const { open, setOpen, rootRef, triggerProps, menuProps } = useMenu();
  const displayName = name || email;

  return (
    <div ref={rootRef} className="relative flex-none">
      <button
        {...triggerProps}
        type="button"
        aria-label={`Account menu for ${displayName}`}
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
            {...menuProps}
            aria-label="Account"
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
