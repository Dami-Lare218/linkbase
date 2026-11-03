import { z } from "zod";

import { getHandleFormatError, HANDLE_MESSAGES, normalizeHandle } from "./handle-rules";

/**
 * Server-side handle validation. Normalizes (trim + lowercase) first, so the action
 * writes the cleaned value. Reserved names and availability are checked separately.
 */
export const handleSchema = z
  .string({ error: HANDLE_MESSAGES.empty })
  .transform(normalizeHandle)
  .refine((handle) => getHandleFormatError(handle) === null, {
    error: (issue) =>
      (typeof issue.input === "string" ? getHandleFormatError(issue.input) : null) ??
      HANDLE_MESSAGES.invalid,
  });

export const claimHandleSchema = z.object({ handle: handleSchema });

export type ClaimHandleInput = z.infer<typeof claimHandleSchema>;
