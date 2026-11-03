type TabItem = { id: string; label: string };

type TabsProps = {
  items: TabItem[];
  /** Prefix for the tab and panel ids: tab `${idPrefix}-tab-${id}` controls `${idPrefix}-panel-${id}`. */
  idPrefix: string;
  value: string;
  onChange?: (id: string) => void;
  /** Accessible name for the tab list. */
  label: string;
  className?: string;
};

/** Underlined text tabs (design system `Tabs`). Pair each tab with an element `role="tabpanel"`. */
export function Tabs({ items, idPrefix, value, onChange, label, className = "" }: TabsProps) {
  return (
    <div role="tablist" aria-label={label} className={`flex gap-6 border-b border-border-subtle ${className}`}>
      {items.map((item) => {
        const selected = item.id === value;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            id={`${idPrefix}-tab-${item.id}`}
            aria-controls={`${idPrefix}-panel-${item.id}`}
            aria-selected={selected}
            onClick={() => onChange?.(item.id)}
            className={`cursor-pointer border-none bg-transparent px-0 pt-2 pb-2.5 font-sans text-body font-medium ${
              selected ? "text-fg-primary shadow-[inset_0_-2px_0_var(--border-strong)]" : "text-fg-secondary hover:text-fg-primary"
            }`}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
