import { Accordion } from "@/components/ui/accordion";

const faqs = [
  {
    question: "What is Linkbase?",
    answer:
      "Linkbase gives you one short link that opens a personal public page holding all your important links — so your audience can find everything in one place.",
  },
  {
    question: "How does it work?",
    answer:
      "Claim a username, add the links you want to share, and Linkbase creates your page at linkba.se/yourname. Update your links any time and the URL stays the same.",
  },
  {
    question: "Who is Linkbase for?",
    answer:
      "Anyone with more than one place to point people — creators, freelancers, professionals and small businesses alike.",
  },
  {
    question: "What kinds of links can I add?",
    answer:
      "Any web address: social profiles, portfolios, videos, newsletters, online shops, booking pages or your own website.",
  },
  {
    question: "How do I share my profile?",
    answer:
      "Copy your linkba.se URL and paste it wherever people find you — your social bios, email signature, business card or messages.",
  },
  {
    question: "Can I customise my page?",
    answer:
      "Yes. Add a profile photo, name and short bio, and adjust how your links appear so the page reflects you or your brand.",
  },
];

export function Faq() {
  return (
    <section
      id="faq"
      aria-labelledby="faq-heading"
      className="scroll-mt-[96px] border-t border-border-subtle bg-surface-app px-[clamp(16px,4vw,32px)] py-[clamp(56px,8vw,96px)]"
    >
      <div className="mx-auto flex max-w-[760px] flex-col gap-10">
        <h2
          id="faq-heading"
          className="m-0 text-center font-display text-[length:clamp(32px,4.4vw,48px)] leading-[1.04] font-extrabold tracking-[var(--tracking-display)] text-ink"
        >
          Questions? Answered.
        </h2>
        <Accordion name="faq" items={faqs} defaultOpen={0} />
      </div>
    </section>
  );
}
