/**
 * Profile picture rules, shared by the upload form (instant feedback), the Server Action
 * (the check that counts) and the User model. Pure: no server imports.
 */

export const PICTURE_MAX_BYTES = 2 * 1024 * 1024;
export const PICTURE_ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export type PictureType = (typeof PICTURE_ALLOWED_TYPES)[number];

/** For the file input's `accept` attribute. */
export const PICTURE_ACCEPT = PICTURE_ALLOWED_TYPES.join(",");

export const PICTURE_MESSAGES = {
  missing: "Choose an image to upload.",
  type: "Use a JPEG, PNG or WebP image.",
  size: "Images must be 2 MB or smaller.",
  unreadable: "Couldn't read that image. Try a different file.",
  storage: "Couldn't save your picture right now. Try again in a moment.",
  removeFailed: "Couldn't remove your picture right now. Try again in a moment.",
} as const;

function isAllowedType(type: string): type is PictureType {
  return (PICTURE_ALLOWED_TYPES as readonly string[]).includes(type);
}

/** The problem with a file's declared size and type, or null when they're acceptable. */
export function getPictureFileError(file: { size: number; type: string }): string | null {
  if (file.size <= 0) return PICTURE_MESSAGES.missing;
  if (!isAllowedType(file.type)) return PICTURE_MESSAGES.type;
  if (file.size > PICTURE_MAX_BYTES) return PICTURE_MESSAGES.size;
  return null;
}

function startsWith(bytes: Uint8Array, signature: readonly number[], offset = 0): boolean {
  if (bytes.length < offset + signature.length) return false;
  return signature.every((value, index) => bytes[offset + index] === value);
}

/**
 * The image type from the file's first bytes, or null. Doesn't trust the declared type
 * or file name: a text file renamed `.png` is null.
 */
export function detectImageType(bytes: Uint8Array): PictureType | null {
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  // "RIFF" <size> "WEBP"
  if (startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8)) {
    return "image/webp";
  }
  return null;
}

const BLOB_AVATAR_URL = /^https:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com\/avatars\/[A-Za-z0-9/_.-]+$/;

/** True only for a profile picture stored in a Vercel Blob store under `avatars/`. */
export function isBlobAvatarUrl(value: unknown): value is string {
  return typeof value === "string" && value.length <= 2048 && BLOB_AVATAR_URL.test(value);
}
