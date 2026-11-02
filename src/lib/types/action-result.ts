/**
 * Shared result for Server Actions called through `useActionState`.
 * Plain, serializable data only: it crosses from server to client.
 */
export type FormState<TField extends string = string> = {
  ok: boolean;
  /** Form-level message, e.g. "Invalid email or password." */
  message?: string;
  /** Messages keyed by field name, shown inline next to each field. */
  fieldErrors?: Partial<Record<TField, string[]>>;
  /** Submitted values to put back in the form (never passwords). */
  values?: Partial<Record<TField, string>>;
};
