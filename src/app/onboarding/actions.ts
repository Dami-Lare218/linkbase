"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { DASHBOARD_PATH } from "@/lib/auth/home-path";
import { consumeRateLimit } from "@/lib/auth/rate-limit";
import { getCurrentUser, getSessionUserId } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/connect";
import type { HandleAvailability } from "@/lib/onboarding/handle-field-state";
import type { FormState } from "@/lib/types/action-result";
import { claimHandle, isHandleAvailable } from "@/lib/users/handle";
import { claimHandleSchema, handleSchema } from "@/lib/validation/handle";
import { HANDLE_MESSAGES } from "@/lib/validation/handle-rules";

type ClaimHandleField = "handle";

function readString(formData: FormData, field: string): string {
  const value = formData.get(field);
  return typeof value === "string" ? value : "";
}

/**
 * Live availability check while the user types. Read-only, on public data, so it checks the
 * session cookie only (no user lookup), and runs the rate limit and the lookup together, so
 * each check is one database round trip. Claiming re-checks everything (`claimHandleAction`).
 */
export async function checkHandleAvailability(rawHandle: unknown): Promise<HandleAvailability> {
  const userId = await getSessionUserId();
  const fallbackHandle = typeof rawHandle === "string" ? rawHandle : "";
  if (!userId) return { status: "signed-out", handle: fallbackHandle, message: "Log in to continue." };

  const parsed = handleSchema.safeParse(rawHandle);
  if (!parsed.success) {
    return {
      status: "invalid",
      handle: fallbackHandle,
      message: z.flattenError(parsed.error).formErrors[0] ?? HANDLE_MESSAGES.invalid,
    };
  }
  const handle = parsed.data;

  await connectToDatabase();
  // In parallel: handles are public, so looking one up before the limit decides reveals nothing.
  const [allowed, available] = await Promise.all([
    consumeRateLimit("handleCheck", userId),
    isHandleAvailable(handle),
  ]);
  if (!allowed) {
    return { status: "rate-limited", handle, message: "Too many checks. Wait a moment and try again." };
  }

  return available
    ? { status: "available", handle }
    : { status: "taken", handle, message: HANDLE_MESSAGES.taken };
}

/** Saves the chosen handle on the signed-in user's record, then sends them to the dashboard. */
export async function claimHandleAction(
  _prev: FormState<ClaimHandleField>,
  formData: FormData,
): Promise<FormState<ClaimHandleField>> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "Log in to continue." };
  // Handles can't be changed here. Someone who already has one has nothing to do on this page.
  if (user.handle) redirect(DASHBOARD_PATH);

  const input = { handle: readString(formData, "handle") };
  const values = { handle: input.handle };

  const parsed = claimHandleSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
  }
  const { handle } = parsed.data;

  await connectToDatabase();
  if (!(await consumeRateLimit("handleClaim", user.id))) {
    return { ok: false, message: "Too many attempts. Try again in 15 minutes.", values: { handle } };
  }

  const result = await claimHandle(user.id, handle);
  if (result === "taken") {
    return { ok: false, fieldErrors: { handle: [HANDLE_MESSAGES.taken] }, values: { handle } };
  }

  // "claimed", or "already-set" if another tab claimed one first. Outside any try block.
  redirect(DASHBOARD_PATH);
}
