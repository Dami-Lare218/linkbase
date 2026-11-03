/**
 * Handle (username) rules shared by the onboarding form, the Zod schema and the User model.
 * Pure on purpose: no Zod, no server imports, so Client Components can use it for instant feedback.
 * The server always re-validates (`handle.ts`).
 */

export const HANDLE_MIN_LENGTH = 3;
export const HANDLE_MAX_LENGTH = 30;

/** Lowercase letters, numbers, hyphens and underscores, 3–30 characters. */
export const HANDLE_PATTERN = /^[a-z0-9_-]{3,30}$/;

const HANDLE_INVALID_CHARACTER = /[^a-z0-9_-]/;

export const HANDLE_MESSAGES = {
  empty: "Choose a handle.",
  invalid: "Remove spaces and symbols to continue.",
  short: `Add at least ${HANDLE_MIN_LENGTH} characters.`,
  long: `Use ${HANDLE_MAX_LENGTH} characters or fewer.`,
  taken: "That handle is taken. Try another.",
} as const;

/**
 * Names nobody can claim: brand and support names, plus words that look like app routes.
 * Shown to the user as "taken", like any other unavailable handle.
 */
export const RESERVED_HANDLES: ReadonlySet<string> = new Set([
  "admin",
  "linkbase",
  "help",
  "support",
  "api",
  "dashboard",
  "login",
  "signup",
  "onboarding",
  "settings",
  "user",
]);

/** Trims and lowercases, so `" Maya_Ortiz "` becomes `"maya_ortiz"`. */
export function normalizeHandle(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * The format problem with an already normalized handle, or null when the format is valid.
 * Doesn't check availability or reserved names.
 */
export function getHandleFormatError(handle: string): string | null {
  if (handle.length === 0) return HANDLE_MESSAGES.empty;
  if (HANDLE_INVALID_CHARACTER.test(handle)) return HANDLE_MESSAGES.invalid;
  if (handle.length < HANDLE_MIN_LENGTH) return HANDLE_MESSAGES.short;
  if (handle.length > HANDLE_MAX_LENGTH) return HANDLE_MESSAGES.long;
  return null;
}

export function isReservedHandle(handle: string): boolean {
  return RESERVED_HANDLES.has(handle);
}
