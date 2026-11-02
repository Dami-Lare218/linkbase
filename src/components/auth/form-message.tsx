import type { ReactNode } from "react";
import { CircleAlert, Info } from "lucide-react";

type FormMessageProps = {
  tone: "error" | "info";
  children: ReactNode;
};

/** Form-level message above the fields, announced to screen readers when it appears. */
export function FormMessage({ tone, children }: FormMessageProps) {
  const isError = tone === "error";
  const Icon = isError ? CircleAlert : Info;

  return (
    <p
      role={isError ? "alert" : "status"}
      className={`m-0 flex items-start gap-2 rounded-md px-4 py-3 text-body-sm font-medium ${
        isError
          ? "bg-[var(--status-error-bg)] text-[var(--status-error)]"
          : "bg-[var(--status-info-bg)] text-[var(--status-info)]"
      }`}
    >
      <Icon size={18} aria-hidden className="mt-px flex-none" />
      <span>{children}</span>
    </p>
  );
}
