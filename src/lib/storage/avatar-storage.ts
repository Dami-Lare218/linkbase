import "server-only";

import { randomUUID } from "node:crypto";

import { del, put } from "@vercel/blob";
import sharp from "sharp";

import { isBlobAvatarUrl } from "@/lib/validation/profile-picture";

import { isBlobReadWriteToken } from "./blob-token";

/**
 * Profile picture storage in Vercel Blob. Only the resulting URL is saved on the User.
 * The token comes from `BLOB_READ_WRITE_TOKEN` (the QA server sets the test store's token).
 */

const AVATAR_SIZE = 512;
// Refuse decompression bombs: a 2 MB file can still claim huge dimensions.
const MAX_INPUT_PIXELS = 40_000_000;

/** The image couldn't be decoded (corrupt, disguised or not really an image). */
export class UnreadableImageError extends Error {
  name = "UnreadableImageError";
}

/**
 * Decodes the upload and re-encodes it as a 512×512 WebP. Re-encoding proves it is a real
 * image and drops all metadata (EXIF, including GPS location). EXIF orientation is applied
 * first so photos aren't sideways.
 */
export async function processAvatar(input: Uint8Array): Promise<Buffer> {
  try {
    return await sharp(input, { limitInputPixels: MAX_INPUT_PIXELS, failOn: "error", animated: false })
      .rotate()
      .resize(AVATAR_SIZE, AVATAR_SIZE, { fit: "cover", position: "attention" })
      .webp({ quality: 82 })
      .toBuffer();
  } catch (err) {
    throw new UnreadableImageError("Image could not be processed", { cause: err });
  }
}

/** Storage is not configured or the Blob service failed. The user can try again later. */
export class StorageUnavailableError extends Error {
  name = "StorageUnavailableError";
}

/**
 * The read-write token, always passed explicitly: without a `token` option `@vercel/blob`
 * prefers Vercel OIDC credentials (`VERCEL_OIDC_TOKEN` + `BLOB_STORE_ID`) over
 * `BLOB_READ_WRITE_TOKEN`, which could send QA uploads to the dev store.
 */
function blobToken(): string {
  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (!isBlobReadWriteToken(token)) throw new StorageUnavailableError("Profile picture storage is not configured");
  return token;
}

/** Stores a processed avatar for the user and returns its public URL. */
export async function storeAvatar(userId: string, webp: Buffer): Promise<string> {
  const token = blobToken();
  try {
    const { url } = await put(`avatars/${userId}/${randomUUID()}.webp`, webp, {
      access: "public",
      contentType: "image/webp",
      addRandomSuffix: false,
      token,
    });
    return url;
  } catch (err) {
    throw new StorageUnavailableError("Profile picture could not be stored", { cause: err });
  }
}

/**
 * Deletes a previously stored avatar. Best-effort: a failure leaves an orphaned file but
 * must not undo the user's change, so it is logged (error name only) and swallowed.
 */
export async function deleteAvatar(url: string | null | undefined): Promise<void> {
  if (!isBlobAvatarUrl(url)) return;
  try {
    await del(url, { token: blobToken() });
  } catch (err) {
    console.error(`[avatar] Could not delete an old profile picture (${err instanceof Error ? err.name : "UnknownError"}).`);
  }
}
