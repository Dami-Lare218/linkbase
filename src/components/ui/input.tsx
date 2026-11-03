import type { ChangeEventHandler, HTMLInputAutoCompleteAttribute, HTMLInputTypeAttribute, ReactNode } from "react";
import { CircleAlert, CircleCheck } from "lucide-react";

type InputProps = {
  /** Used for the input's `name`, and its `id` unless `id` is set. */
  name: string;
  label: string;
  id?: string;
  type?: HTMLInputTypeAttribute;
  /** Uncontrolled initial value. Use `value` + `onChange` instead for a controlled field. */
  defaultValue?: string;
  value?: string;
  onChange?: ChangeEventHandler<HTMLInputElement>;
  placeholder?: string;
  autoComplete?: HTMLInputAutoCompleteAttribute;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  spellCheck?: boolean;
  required?: boolean;
  disabled?: boolean;
  /** Keeps the value but blocks editing (e.g. while submitting), and is still sent with the form. */
  readOnly?: boolean;
  maxLength?: number;
  minLength?: number;
  /** Fixed text before the value, e.g. `linkba.se/`. */
  prefix?: string;
  /** Content after the value, e.g. a spinner. */
  trailing?: ReactNode;
  /** Error message. Takes priority over `success` and `helperText`. */
  error?: string;
  /** Valid state: green ring and check icon. `helperText` shows in green. */
  success?: boolean;
  helperText?: string;
  /** Extra ids for `aria-describedby`, e.g. a separate rules line. */
  describedBy?: string;
  /** Always render the message line as a polite live region, so changes are announced. */
  liveMessage?: boolean;
  size?: "md" | "lg";
};

const fieldBase =
  "box-border flex w-full items-center gap-2 rounded-md bg-surface-fill px-4 transition-[background-color,box-shadow] duration-[120ms] ease-[var(--ease-standard)]";

const focusRing =
  "focus-within:bg-surface-card focus-within:shadow-[inset_0_0_0_2px_var(--border-strong)] focus-within:hover:shadow-[inset_0_0_0_2px_var(--border-strong)]";

/** Text field with label and an error, success or helper message (ui.md §3.1). */
export function Input({
  name,
  label,
  id,
  type = "text",
  defaultValue,
  value,
  onChange,
  placeholder,
  autoComplete,
  autoCapitalize,
  spellCheck,
  required,
  disabled,
  readOnly,
  maxLength,
  minLength,
  prefix,
  trailing,
  error,
  success = false,
  helperText,
  describedBy,
  liveMessage = false,
  size = "lg",
}: InputProps) {
  const inputId = id ?? name;
  const message = error ?? helperText;
  const isSuccess = success && !error;
  const messageId = message || liveMessage ? `${inputId}-message` : undefined;
  const ariaDescribedBy = [messageId, describedBy].filter(Boolean).join(" ") || undefined;

  // Precedence matches the design system: error, then focus, then success, then hover.
  const ring = error
    ? "shadow-[inset_0_0_0_2px_var(--status-error)] focus-within:bg-surface-card"
    : isSuccess
      ? `shadow-[inset_0_0_0_2px_var(--status-success)] ${focusRing}`
      : `hover:shadow-[inset_0_0_0_1px_var(--border-default)] ${focusRing}`;

  const messageTone = error
    ? "text-[var(--status-error)]"
    : isSuccess
      ? "text-[var(--status-success)]"
      : "text-fg-secondary";

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
        {prefix ? <span className="text-body whitespace-nowrap text-fg-secondary">{prefix}</span> : null}
        <input
          id={inputId}
          name={name}
          type={type}
          defaultValue={defaultValue}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          autoCapitalize={autoCapitalize}
          spellCheck={spellCheck}
          required={required}
          disabled={disabled}
          readOnly={readOnly}
          maxLength={maxLength}
          minLength={minLength}
          aria-invalid={error ? true : undefined}
          aria-describedby={ariaDescribedBy}
          className="h-full min-w-0 flex-1 border-none bg-transparent p-0 font-[inherit] text-body text-fg-primary outline-none placeholder:text-gray-400 disabled:cursor-not-allowed disabled:text-fg-disabled"
        />
        {isSuccess ? (
          <CircleCheck size={20} aria-hidden className="flex-none text-[var(--status-success)]" />
        ) : null}
        {trailing}
      </div>
      {message || liveMessage ? (
        <p
          id={messageId}
          aria-live={liveMessage ? "polite" : undefined}
          className={`m-0 flex items-start gap-1.5 text-body-sm ${messageTone}`}
        >
          {error ? <CircleAlert size={16} aria-hidden className="mt-0.5 flex-none" /> : null}
          {message ? <span>{message}</span> : null}
        </p>
      ) : null}
    </div>
  );
}
