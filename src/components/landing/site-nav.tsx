import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/ui/wordmark";

import { MobileMenu } from "./mobile-menu";

const navLinks = [
  { href: "#how", label: "How it works" },
  { href: "#faq", label: "FAQ" },
];

const navLinkClass =
  "flex h-11 items-center rounded-md px-3.5 text-body font-medium text-fg-primary no-underline hover:bg-surface-fill hover:text-fg-primary";

/** Floating white pill nav, fixed near the top of the page. */
export function SiteNav() {
  return (
    <div className="pointer-events-none fixed top-[clamp(10px,2vw,16px)] right-0 left-0 z-20 box-border px-[clamp(10px,3vw,32px)]">
      <div className="pointer-events-auto mx-auto max-w-[var(--container-max)]">
        <nav
          aria-label="Main"
          className="relative box-border flex h-[clamp(60px,14vw,72px)] w-full min-w-0 items-center gap-[clamp(6px,2vw,24px)] rounded-full bg-white pr-[clamp(6px,1.5vw,12px)] pl-[clamp(14px,3vw,28px)] font-sans shadow-[var(--shadow-nav)]"
        >
          <a href="#" aria-label="Linkbase home" className="flex flex-none rounded-md no-underline">
            <Wordmark size="clamp(22px, 1.5vw + 16px, 26px)" />
          </a>

          <div className="ml-2 hidden gap-1 min-[820px]:flex">
            {navLinks.map((link) => (
              <a key={link.href} href={link.href} className={navLinkClass}>
                {link.label}
              </a>
            ))}
          </div>

          <div className="min-w-0 flex-1" />

          <Button href="#" variant="secondary" className="max-[819px]:hidden">
            Log in
          </Button>
          <Button href="#" className="flex-none">
            <span className="max-[399px]:hidden">Sign up free</span>
            <span className="min-[400px]:hidden">Sign up</span>
          </Button>

          <MobileMenu links={navLinks} />
        </nav>
      </div>
    </div>
  );
}
