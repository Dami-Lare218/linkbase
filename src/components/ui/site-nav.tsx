import type { ReactNode } from "react";
import Link from "next/link";

import { MobileMenu } from "./mobile-menu";
import type { NavLink } from "./mobile-menu";
import { Wordmark } from "./wordmark";

type SiteNavProps = {
  /** In-page or site links. Collapsed into the menu button below 820px. */
  links?: NavLink[];
  /** Right-hand controls, e.g. Log in / Sign up or the user menu. */
  actions?: ReactNode;
  /** Extra content at the bottom of the mobile menu panel. */
  menuFooter?: ReactNode;
};

const navLinkClass =
  "flex h-11 items-center rounded-md px-3.5 text-body font-medium text-fg-primary no-underline hover:bg-surface-fill hover:text-fg-primary";

/** Floating white pill nav, fixed near the top of the page (ui.md §4.1). */
export function SiteNav({ links = [], actions, menuFooter }: SiteNavProps) {
  return (
    <div className="pointer-events-none fixed top-[clamp(10px,2vw,16px)] right-0 left-0 z-20 box-border px-[clamp(10px,3vw,32px)]">
      <div className="pointer-events-auto mx-auto max-w-[var(--container-max)]">
        <nav
          aria-label="Main"
          className="relative box-border flex h-[clamp(60px,14vw,72px)] w-full min-w-0 items-center gap-[clamp(6px,2vw,24px)] rounded-full bg-white pr-[clamp(6px,1.5vw,12px)] pl-[clamp(14px,3vw,28px)] font-sans shadow-[var(--shadow-nav)]"
        >
          <Link href="/" aria-label="Linkbase home" className="flex flex-none rounded-md no-underline">
            <Wordmark size="clamp(22px, 1.5vw + 16px, 26px)" />
          </Link>

          {links.length > 0 ? (
            <div className="ml-2 hidden gap-1 min-[820px]:flex">
              {links.map((link) => (
                <a key={link.href} href={link.href} className={navLinkClass}>
                  {link.label}
                </a>
              ))}
            </div>
          ) : null}

          <div className="min-w-0 flex-1" />

          {actions}

          {links.length > 0 ? <MobileMenu links={links} footer={menuFooter} /> : null}
        </nav>
      </div>
    </div>
  );
}
