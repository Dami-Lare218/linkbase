import { z } from "zod";

/**
 * Link validation, shared by the dashboard forms, the Server Actions and the Link model.
 * Pure (no server imports): the URL check also runs at render time before using a stored
 * URL as an `href` (Doc/security.md §5).
 */

export const LINK_TITLE_MAX_LENGTH = 100;
export const LINK_URL_MAX_LENGTH = 2048;

export const LINK_MESSAGES = {
  titleEmpty: "Enter a title.",
  titleLong: `Title must be ${LINK_TITLE_MAX_LENGTH} characters or fewer.`,
  urlEmpty: "Enter a URL.",
  urlInvalid: "Enter a full URL starting with http:// or https://.",
  urlLong: `URL must be ${LINK_URL_MAX_LENGTH} characters or fewer.`,
  notFound: "That link no longer exists.",
} as const;

/** True only for an absolute `http:` or `https:` URL with a host. Rejects `javascript:`, `data:`, etc. */
export function isHttpUrl(value: string): boolean {
  if (value.length === 0 || value.length > LINK_URL_MAX_LENGTH || /\s/.test(value)) return false;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  return (url.protocol === "http:" || url.protocol === "https:") && url.hostname.length > 0;
}

export const linkTitleSchema = z
  .string({ error: LINK_MESSAGES.titleEmpty })
  .trim()
  .min(1, { error: LINK_MESSAGES.titleEmpty })
  .max(LINK_TITLE_MAX_LENGTH, { error: LINK_MESSAGES.titleLong });

export const linkUrlSchema = z
  .string({ error: LINK_MESSAGES.urlEmpty })
  .trim()
  .min(1, { error: LINK_MESSAGES.urlEmpty })
  .max(LINK_URL_MAX_LENGTH, { error: LINK_MESSAGES.urlLong })
  .refine(isHttpUrl, { error: LINK_MESSAGES.urlInvalid });

/** A MongoDB ObjectId as 24 hex characters. Anything else can't be one of the user's links. */
export const linkIdSchema = z
  .string({ error: LINK_MESSAGES.notFound })
  .regex(/^[0-9a-f]{24}$/i, { error: LINK_MESSAGES.notFound });

export const createLinkSchema = z.object({ title: linkTitleSchema, url: linkUrlSchema });
export const updateLinkSchema = z.object({ id: linkIdSchema, title: linkTitleSchema, url: linkUrlSchema });
export const deleteLinkSchema = z.object({ id: linkIdSchema });
export const setLinkActiveSchema = z.object({ id: linkIdSchema, isActive: z.boolean() });
export const setFooterSchema = z.object({ showFooter: z.boolean() });

export type CreateLinkInput = z.infer<typeof createLinkSchema>;
export type UpdateLinkInput = z.infer<typeof updateLinkSchema>;
