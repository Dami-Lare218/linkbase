import type { LucideIcon } from "lucide-react";

type SideNavItemProps = {
  icon: LucideIcon;
  label: string;
  active?: boolean;
  onClick?: () => void;
};

/** Circle icon with a caption, used in the dashboard rail and the mobile bottom bar (design system `SideNavItem`). */
export function SideNavItem({ icon: Icon, label, active = false, onClick }: SideNavItemProps) {
  return (
    <button
      type="button"
      aria-current={active ? "page" : undefined}
      onClick={onClick}
      className="group flex w-[72px] flex-none cursor-pointer flex-col items-center gap-1.5 border-none bg-transparent p-0 font-sans text-fg-primary"
    >
      <span
        className={`flex h-[52px] w-[52px] items-center justify-center rounded-full transition-[background-color] duration-[120ms] ${
          active
            ? "bg-surface-inverse text-fg-inverse shadow-[0_0_0_3px_var(--lb-white),0_0_0_5px_var(--surface-inverse)]"
            : "bg-surface-fill group-hover:bg-surface-fill-active"
        }`}
      >
        <Icon size={22} aria-hidden />
      </span>
      <span className={`text-caption ${active ? "font-semibold" : "font-medium"}`}>{label}</span>
    </button>
  );
}
