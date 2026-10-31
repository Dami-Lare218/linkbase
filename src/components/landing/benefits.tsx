import { Link2, Palette, Timer } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const benefits: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: Timer,
    title: "Set up in minutes",
    body: "Pick a username, add your links, and your page is ready to share.",
  },
  {
    icon: Link2,
    title: "One link for everything",
    body: "Socials, portfolio, videos, shop — all behind a single URL.",
  },
  {
    icon: Palette,
    title: "Make it yours",
    body: "Add your photo, name and bio so your page feels like you.",
  },
];

export function Benefits() {
  return (
    <section
      id="how"
      aria-label="How it works"
      className="scroll-mt-[96px] bg-surface-page px-[clamp(16px,4vw,32px)] py-[clamp(48px,7vw,80px)]"
    >
      <div className="mx-auto grid max-w-[var(--container-max)] grid-cols-[repeat(auto-fit,minmax(min(100%,260px),1fr))] gap-[clamp(28px,4vw,48px)]">
        {benefits.map(({ icon: Icon, title, body }) => (
          <div key={title} className="flex items-start gap-4">
            <div className="flex h-12 w-12 flex-none items-center justify-center rounded-full bg-tangerine-50 text-tangerine-700">
              <Icon size={22} />
            </div>
            <div className="flex min-w-0 flex-col gap-1.5">
              <h2 className="m-0 font-display text-heading-sm font-extrabold tracking-[var(--tracking-heading)]">
                {title}
              </h2>
              <p className="m-0 text-body text-pretty text-fg-secondary">{body}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
