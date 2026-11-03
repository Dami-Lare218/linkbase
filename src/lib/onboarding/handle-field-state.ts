import { getHandleFormatError, HANDLE_MESSAGES } from "@/lib/validation/handle-rules";

/**
 * What the onboarding handle field shows, derived from the current value and the latest
 * server replies. Pure, so it is unit-tested and the form can't drift out of sync.
 */

export type HandleCheckStatus = "available" | "taken" | "invalid" | "rate-limited" | "signed-out" | "error";

/** A reply from `checkHandleAvailability`, or a client-side "error" when the call failed. */
export type HandleAvailability = {
  status: HandleCheckStatus;
  /** The normalized handle the reply is about. Replies for other values are ignored. */
  handle: string;
  message?: string;
};

export const CHECK_FAILED_MESSAGE = "Couldn't check availability. Check your connection and try again.";

export type HandleFieldInput = {
  /** The (lowercased) value in the field. */
  value: string;
  /** The latest availability reply, possibly for an older value. */
  availability: HandleAvailability | null;
  /** The value a check is running for, if any. */
  checkingHandle: string | null;
  /** The value the last claim was rejected for, and why (from the Server Action). */
  claim?: { handle?: string; error?: string };
};

export type HandleFieldState = {
  error?: string;
  helperText?: string;
  isChecking: boolean;
  /** True only when the server confirmed this exact value is available. Enables Claim. */
  isAvailable: boolean;
  /** Shown in the example profile: any plausible handle (even a taken one), else null. */
  previewHandle: string | null;
};

export function getHandleFieldState({ value, availability, checkingHandle, claim }: HandleFieldInput): HandleFieldState {
  const formatError = value ? getHandleFormatError(value) : null;
  const claimError = claim?.handle === value ? claim.error : undefined;
  const result = availability?.handle === value ? availability : null;
  const isChecking = !formatError && checkingHandle === value;
  const isAvailable = !formatError && !claimError && result?.status === "available";

  let error = formatError ?? claimError;
  if (!error && !isChecking && result && result.status !== "available") {
    error = result.message ?? (result.status === "error" ? CHECK_FAILED_MESSAGE : HANDLE_MESSAGES.taken);
  }

  let helperText: string | undefined;
  if (!error && isChecking) helperText = "Checking availability…";
  if (!error && isAvailable) helperText = `linkba.se/${value} is available.`;

  return {
    error,
    helperText,
    isChecking,
    isAvailable,
    previewHandle: value && !formatError ? value : null,
  };
}
