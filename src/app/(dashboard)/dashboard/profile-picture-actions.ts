"use server";

import { refresh, updateTag } from "next/cache";

import { consumeRateLimit } from "@/lib/auth/rate-limit";
import { getCurrentUser } from "@/lib/auth/session";
import type { CurrentUser } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/connect";
import { User } from "@/lib/db/models/user";
import {
  deleteAvatar,
  processAvatar,
  StorageUnavailableError,
  storeAvatar,
  UnreadableImageError,
} from "@/lib/storage/avatar-storage";
import type { FormState } from "@/lib/types/action-result";
import { profileTag } from "@/lib/users/public-profile";
import { detectImageType, getPictureFileError, PICTURE_MAX_BYTES, PICTURE_MESSAGES } from "@/lib/validation/profile-picture";

/**
 * Profile picture actions. The user id always comes from the session; the client can't
 * name a user or a file. Order: authenticate → rate limit → validate → process → store →
 * write → delete the old file → refresh.
 */

type PictureField = "picture";
export type PictureFormState = FormState<PictureField>;

type Auth =
  | { user: CurrentUser & { handle: string }; error?: never }
  | { user?: never; error: PictureFormState };

async function authenticate(): Promise<Auth> {
  const user = await getCurrentUser();
  if (!user) return { error: { ok: false, message: "Log in to continue." } };
  if (!user.handle) return { error: { ok: false, message: "Pick your handle first." } };
  return { user: { ...user, handle: user.handle } };
}

function fieldError(message: string): PictureFormState {
  return { ok: false, fieldErrors: { picture: [message] } };
}

export async function uploadProfilePictureAction(_prev: PictureFormState, formData: FormData): Promise<PictureFormState> {
  const auth = await authenticate();
  if (auth.error) return auth.error;
  const { user } = auth;

  const file = formData.get("picture");
  if (!(file instanceof File)) return fieldError(PICTURE_MESSAGES.missing);
  // Declared size and type first (cheap), then the real bytes.
  const declaredError = getPictureFileError(file);
  if (declaredError) return fieldError(declaredError);

  await connectToDatabase();
  if (!(await consumeRateLimit("avatarUpload", user.id))) {
    return { ok: false, message: "Too many uploads. Try again in an hour." };
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes.byteLength > PICTURE_MAX_BYTES) return fieldError(PICTURE_MESSAGES.size);
  if (detectImageType(bytes) === null) return fieldError(PICTURE_MESSAGES.type);

  let webp: Buffer;
  try {
    webp = await processAvatar(bytes);
  } catch (err) {
    if (err instanceof UnreadableImageError) return fieldError(PICTURE_MESSAGES.unreadable);
    throw err;
  }

  const previous = await User.findById(user.id).select("image").lean();
  let url: string;
  try {
    url = await storeAvatar(user.id, webp);
  } catch (err) {
    if (!(err instanceof StorageUnavailableError)) throw err;
    // Name only: the cause may include request details.
    console.error(`[avatar] Upload failed (${err.name}).`);
    return { ok: false, message: PICTURE_MESSAGES.storage };
  }
  let result: Awaited<ReturnType<typeof User.updateOne>>;
  try {
    result = await User.updateOne({ _id: user.id }, { $set: { image: url } }, { runValidators: true });
  } catch (err) {
    // Nothing points to the new file: delete it, then let the error reach the client's catch.
    await deleteAvatar(url);
    throw err;
  }
  if (result.matchedCount === 0) {
    // The account disappeared meanwhile: don't keep the new file.
    await deleteAvatar(url);
    return { ok: false, message: "Log in to continue." };
  }
  if (previous?.image && previous.image !== url) await deleteAvatar(previous.image);

  updateTag(profileTag(user.handle));
  refresh();
  // The new URL, so the dashboard can show it before the refreshed data arrives.
  return { ok: true, message: "Profile picture updated", values: { picture: url } };
}

/** Takes no input: the user and the file to delete both come from the session's own record. */
export async function removeProfilePictureAction(): Promise<PictureFormState> {
  const auth = await authenticate();
  if (auth.error) return auth.error;
  const { user } = auth;

  await connectToDatabase();
  // Read the URL from the user's own record, never from client input.
  const previous = await User.findOneAndUpdate({ _id: user.id }, { $unset: { image: 1 } }).select("image").lean();
  await deleteAvatar(previous?.image);

  updateTag(profileTag(user.handle));
  refresh();
  return { ok: true, message: "Profile picture removed", values: { picture: "" } };
}
