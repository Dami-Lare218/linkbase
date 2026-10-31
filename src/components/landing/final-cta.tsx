import { Wordmark } from "@/components/ui/wordmark";

import { ClaimForm } from "./claim-form";

// Placeholder targets until these pages exist.
const footerLinks = ["Log in", "Sign up", "Help", "Privacy", "Terms"];

/** Closing call to action, with the footer card inset at the bottom (as in the design). */
export function FinalCta() {
  return (
    <section
      aria-labelledby="final-cta-heading"
      className="bg-tangerine-500 px-[clamp(12px,3vw,32px)] pt-[clamp(56px,8vw,96px)] pb-[clamp(12px,3vw,32px)]"
    >
      <div className="mx-auto flex max-w-[var(--container-max)] flex-col items-center gap-5 text-center">
        <h2
          id="final-cta-heading"
          className="m-0 max-w-[720px] font-display text-[length:clamp(36px,5.4vw,64px)] leading-none font-extrabold tracking-[var(--tracking-display)] text-balance text-ink"
        >
          Your corner of the internet, in one link.
        </h2>
        <p className="m-0 max-w-[460px] text-body-lg text-pretty text-ink">
          Claim your username and have your page ready to share in minutes.
        </p>
        <div className="mt-3 flex w-full justify-center">
          <ClaimForm align="center" />
        </div>

        <footer className="mt-[clamp(48px,7vw,80px)] box-border flex w-full flex-col gap-8 rounded-2xl bg-white p-[clamp(24px,4vw,40px)] text-left">
          <div className="flex flex-wrap items-start justify-between gap-7">
            <div className="flex max-w-[380px] flex-[1_1_280px] flex-col gap-3">
              <Wordmark size={28} />
              <p className="m-0 text-body-sm text-pretty text-fg-secondary">
                One link for everything you share. A simple public profile for creators,
                freelancers, professionals and small businesses.
              </p>
            </div>
            <nav aria-label="Footer" className="-mt-2.5 flex flex-wrap gap-x-6">
              {footerLinks.map((label) => (
                <a
                  key={label}
                  href="#"
                  className="inline-flex min-h-11 items-center rounded-sm text-[15px] font-medium text-fg-primary no-underline hover:text-fg-brand"
                >
                  {label}
                </a>
              ))}
            </nav>
          </div>
          <div className="border-t border-border-subtle pt-5 text-[13px] text-fg-secondary">
            © 2026 Linkbase
          </div>
        </footer>
      </div>
    </section>
  );
}
