import { ChevronDown } from "lucide-react";

type AccordionItem = {
  question: string;
  answer: string;
};

type AccordionProps = {
  /** Shared name so only one item is open at a time (native exclusive <details>). */
  name: string;
  items: AccordionItem[];
  /** Index of the item open on first render. -1 means none. */
  defaultOpen?: number;
};

/** Light-tone accordion built on native <details>, so it needs no client JavaScript. */
export function Accordion({ name, items, defaultOpen = -1 }: AccordionProps) {
  return (
    <div className="flex flex-col gap-3 font-sans">
      {items.map((item, index) => (
        <details
          key={item.question}
          name={name}
          open={index === defaultOpen}
          className="group rounded-lg bg-surface-fill text-fg-primary"
        >
          <summary className="flex cursor-pointer list-none items-center gap-4 rounded-lg px-6 py-[22px] text-left text-body-lg font-semibold [&::-webkit-details-marker]:hidden">
            <span className="flex-1">{item.question}</span>
            <ChevronDown
              size={22}
              className="flex-none transition-transform duration-200 ease-[var(--ease-standard)] group-open:rotate-180"
            />
          </summary>
          <div className="animate-[lb-fade-up_200ms_var(--ease-out)] px-6 pb-6 text-body leading-[1.6] text-fg-secondary">
            {item.answer}
          </div>
        </details>
      ))}
    </div>
  );
}
