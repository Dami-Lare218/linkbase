import type { HTMLInputAutoCompleteAttribute, HTMLInputTypeAttribute } from "react";
import { CircleAlert } from "lucide-react";

type InputProps = {
  /** Used for the input's `name`, and its `id` unless `id` is set. */
  name: string;
  label: string;
  id?: string;
  type?: HTMLInputTypeAttribute;
  defaultValue?: string;
  placeholder?: string;
  autoComplete?: HTMLInputAutoCompleteAttribute;
  required?: boolean;
  disabled?: boolean;
  maxLength?: number;
  minLength?: number;
  /** Error message. Takes priority over `helperText`. */
  error?: string;
  helperText?: string;
  size?: "md" | "lg";
};

const fieldBase =
  "box-border flex w-full items-center gap-2 rounded-md bg-surface-fill px-4 transition-[background-color,box-shadow] duration-[120ms] ease-[var(--ease-standard)]";

/** Text field with label and an error or helper message (ui.md §3.1). */
export function Input({
  name,
  label,
  id,
  type = "text",
  defaultValue,
  placeholder,
  autoComplete,
  required,
  disabled,
  maxLength,
  minLength,
  error,
  helperText,
  size = "lg",
}: InputProps) {
  const inputId = id ?? name;
  const message = error ?? helperText;
  const messageId = message ? `${inputId}-message` : undefined;

  const ring = error
    ? "shadow-[inset_0_0_0_2px_var(--status-error)] focus-within:bg-surface-card"
    : "hover:shadow-[inset_0_0_0_1px_var(--border-default)] focus-within:bg-surface-card focus-within:shadow-[inset_0_0_0_2px_var(--border-strong)] focus-within:hover:shadow-[inset_0_0_0_2px_var(--border-strong)]";

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-body-sm font-medium text-fg-primary">
        {label}
      </label>
      <div
        className={`${fieldBase} ${size === "lg" ? "h-[var(--control-lg)]" : "h-[var(--control-md)]"} ${
          disabled ? "bg-gray-50 shadow-none" : ring
        }`}
      >
        <input
          id={inputId}
          name={name}
          type={type}
          defaultValue={defaultValue}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required={required}
          disabled={disabled}
          maxLength={maxLength}
          minLength={minLength}
          aria-invalid={error ? true : undefined}
          aria-describedby={messageId}
          className="h-full min-w-0 flex-1 border-none bg-transparent p-0 font-[inherit] text-body text-fg-primary outline-none placeholder:text-gray-400 disabled:cursor-not-allowed disabled:text-fg-disabled"
        />
      </div>
      {message ? (
        <p
          id={messageId}
          className={`m-0 flex items-start gap-1.5 text-body-sm ${
            error ? "text-[var(--status-error)]" : "text-fg-secondary"
          }`}
        >
          {error ? <CircleAlert size={16} aria-hidden className="mt-0.5 flex-none" /> : null}
          <span>{message}</span>
        </p>
      ) : null}
    </div>
  );
}
