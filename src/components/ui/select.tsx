import { ChevronDown } from "lucide-react";

type SelectOption = { value: string; label: string };

type SelectProps = {
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  id: string;
  size?: "md" | "lg";
};

/** Native select styled like the filled Input (design system `Select`). */
export function Select({ label, value, options, onChange, id, size = "lg" }: SelectProps) {
  return (
    <div className="flex w-full flex-col gap-1.5">
      <label htmlFor={id} className="text-body-sm font-medium text-fg-primary">
        {label}
      </label>
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={`box-border w-full cursor-pointer appearance-none rounded-md border-none bg-surface-fill pr-11 pl-4 font-sans text-body text-fg-primary outline-none focus:bg-surface-card focus:shadow-[inset_0_0_0_2px_var(--border-strong)] ${
            size === "md" ? "h-[var(--control-md)]" : "h-[var(--control-lg)]"
          }`}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown
          size={20}
          aria-hidden
          className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-fg-secondary"
        />
      </div>
    </div>
  );
}
