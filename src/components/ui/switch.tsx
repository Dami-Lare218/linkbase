type SwitchProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Accessible name, e.g. "Show Linkbase footer". */
  label: string;
  size?: "sm" | "md";
  disabled?: boolean;
};

/** On/off switch (design system `Switch`): green when on, `role="switch"`. */
export function Switch({ checked, onChange, label, size = "md", disabled = false }: SwitchProps) {
  const track = size === "sm" ? "h-5 w-9" : "h-7 w-12";
  const knob = size === "sm" ? "h-3.5 w-3.5" : "h-[22px] w-[22px]";
  const knobOn = size === "sm" ? "translate-x-4" : "translate-x-5";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex flex-none cursor-pointer items-center rounded-full border-none p-0 transition-[background-color] duration-[var(--duration-base)] ease-[var(--ease-standard)] disabled:cursor-not-allowed ${track} ${
        disabled ? "bg-gray-200" : checked ? "bg-[var(--status-success)]" : "bg-gray-300"
      }`}
    >
      <span
        aria-hidden
        className={`absolute top-[3px] left-[3px] rounded-full bg-white shadow-[var(--shadow-xs)] transition-transform duration-[var(--duration-base)] ease-[var(--ease-standard)] ${knob} ${
          checked ? knobOn : "translate-x-0"
        }`}
      />
    </button>
  );
}
