"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Menu, X } from "lucide-react";

import { Button } from "@/components/ui/button";

type MobileMenuProps = {
  links: { href: string; label: string }[];
};

/** Menu button and dropdown panel for the nav below 820px. */
export function MobileMenu({ links }: MobileMenuProps) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }

    function handlePointerDown(event: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleResize() {
      if (window.matchMedia("(min-width: 820px)").matches) setOpen(false);
    }

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("resize", handleResize);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("resize", handleResize);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="flex-none min-[820px]:hidden">
      <button
        ref={buttonRef}
        type="button"
        aria-label="Menu"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border-none bg-surface-fill p-0 text-fg-primary transition-[background-color,transform] duration-[120ms] hover:bg-surface-fill-hover active:scale-[.94]"
      >
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>

      <div
        id={panelId}
        hidden={!open}
        className="absolute top-[calc(100%_+_8px)] right-0 left-0 z-10 flex-col gap-1 rounded-xl bg-white p-3 shadow-[var(--shadow-lg)] [&:not([hidden])]:flex"
      >
        {links.map((link) => (
          <a
            key={link.href}
            href={link.href}
            onClick={() => setOpen(false)}
            className="flex h-12 items-center rounded-md px-3.5 text-body font-medium text-fg-primary no-underline hover:bg-surface-fill hover:text-fg-primary"
          >
            {link.label}
          </a>
        ))}
        <Button href="#" variant="secondary" fullWidth>
          Log in
        </Button>
      </div>
    </div>
  );
}
