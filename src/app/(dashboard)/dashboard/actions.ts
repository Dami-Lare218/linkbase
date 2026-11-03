"use server";

import { refresh } from "next/cache";
import { z } from "zod";

import { consumeRateLimit } from "@/lib/auth/rate-limit";
import { getCurrentUser } from "@/lib/auth/session";
import type { CurrentUser } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/connect";
import { createLink, deleteLink, setLinkActive, setShowFooter, updateLink } from "@/lib/links/links";
import type { FormState } from "@/lib/types/action-result";
import {
  createLinkSchema,
  deleteLinkSchema,
  LINK_MESSAGES,
  setFooterSchema,
  setLinkActiveSchema,
  updateLinkSchema,
} from "@/lib/validation/link";

/**
 * Dashboard link actions. Order (Doc/data-mutations.md §3): authenticate → validate →
 * userId-scoped write (ownership is in the query filter) → refresh() → typed result.
 * Unexpected errors (database down) are thrown and reach the error boundary.
 */

type LinkField = "id" | "title" | "url";
type LinkFormState = FormState<LinkField>;

type Auth = { user: CurrentUser; error?: never } | { user?: never; error: FormState<never> };

async function authenticate(): Promise<Auth> {
  const user = await getCurrentUser();
  if (!user) return { error: { ok: false, message: "Log in to continue." } };
  if (!user.handle) return { error: { ok: false, message: "Pick your handle first." } };
  return { user };
}

function readString(formData: FormData, field: string): string {
  const value = formData.get(field);
  return typeof value === "string" ? value : "";
}

function readLinkFields(formData: FormData) {
  return { title: readString(formData, "title"), url: readString(formData, "url") };
}

export async function createLinkAction(_prev: LinkFormState, formData: FormData): Promise<LinkFormState> {
  const auth = await authenticate();
  if (auth.error) return auth.error;

  const input = readLinkFields(formData);
  const parsed = createLinkSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, fieldErrors: z.flattenError(parsed.error).fieldErrors, values: input };
  }

  await connectToDatabase();
  if (!(await consumeRateLimit("linkCreate", auth.user.id))) {
    return { ok: false, message: "You're adding links too quickly. Try again in a few minutes.", values: input };
  }

  const link = await createLink(auth.user.id, parsed.data);
  refresh();
  // The new link's id and saved values, so the list can show it before the refreshed data arrives.
  return { ok: true, message: "Link added", values: { id: link.id, title: link.title, url: link.url } };
}

export async function updateLinkAction(_prev: LinkFormState, formData: FormData): Promise<LinkFormState> {
  const auth = await authenticate();
  if (auth.error) return auth.error;

  const input = { id: readString(formData, "id"), ...readLinkFields(formData) };
  const values = { title: input.title, url: input.url };
  const parsed = updateLinkSchema.safeParse(input);
  if (!parsed.success) {
    const { fieldErrors } = z.flattenError(parsed.error);
    // A bad id means the link can't be the user's: same reply as "not found".
    if (fieldErrors.id) return { ok: false, message: LINK_MESSAGES.notFound, values };
    return { ok: false, fieldErrors, values };
  }

  const { id, title, url } = parsed.data;
  if ((await updateLink(auth.user.id, id, { title, url })) === "not-found") {
    // Refresh so a link deleted elsewhere also disappears from this page.
    refresh();
    return { ok: false, message: LINK_MESSAGES.notFound, values };
  }

  refresh();
  // The saved (trimmed) values, so the row can show them before the refreshed list arrives.
  return { ok: true, message: "Link updated", values: { title, url } };
}

export async function deleteLinkAction(_prev: LinkFormState, formData: FormData): Promise<LinkFormState> {
  const auth = await authenticate();
  if (auth.error) return auth.error;

  const parsed = deleteLinkSchema.safeParse({ id: readString(formData, "id") });
  if (!parsed.success) return { ok: false, message: LINK_MESSAGES.notFound };

  if ((await deleteLink(auth.user.id, parsed.data.id)) === "not-found") {
    refresh();
    return { ok: false, message: LINK_MESSAGES.notFound };
  }

  refresh();
  return { ok: true, message: "Link deleted" };
}

/** Called from a link's switch. Arguments are untrusted, so they are validated like form data. */
export async function setLinkActiveAction(id: unknown, isActive: unknown): Promise<FormState<never>> {
  const auth = await authenticate();
  if (auth.error) return auth.error;

  const parsed = setLinkActiveSchema.safeParse({ id, isActive });
  if (!parsed.success) return { ok: false, message: LINK_MESSAGES.notFound };

  if ((await setLinkActive(auth.user.id, parsed.data.id, parsed.data.isActive)) === "not-found") {
    refresh();
    return { ok: false, message: LINK_MESSAGES.notFound };
  }

  refresh();
  return { ok: true };
}

/** Called from the "Linkbase footer" switch. */
export async function setFooterAction(showFooter: unknown): Promise<FormState<never>> {
  const auth = await authenticate();
  if (auth.error) return auth.error;

  const parsed = setFooterSchema.safeParse({ showFooter });
  if (!parsed.success) return { ok: false, message: "Something went wrong. Try again." };

  await setShowFooter(auth.user.id, parsed.data.showFooter);
  refresh();
  return { ok: true };
}
