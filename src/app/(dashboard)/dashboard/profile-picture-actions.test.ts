import { beforeEach, describe, expect, it, vi } from "vitest";

import { removeProfilePictureAction, uploadProfilePictureAction } from "@/app/(dashboard)/dashboard/profile-picture-actions";
import type { PictureFormState } from "@/app/(dashboard)/dashboard/profile-picture-actions";
import { StorageUnavailableError, UnreadableImageError } from "@/lib/storage/avatar-storage";
import { PICTURE_MAX_BYTES, PICTURE_MESSAGES } from "@/lib/validation/profile-picture";

/**
 * MOCKED integration tests for the profile picture Server Actions (Doc/testing.md §2.1).
 * The session, rate limit, database, Next.js cache and avatar storage are mocks: these tests
 * check the action's own logic (order of checks, ownership, replace/remove clean-up, error
 * handling). The real validation rules run unmocked. Nothing reaches MongoDB or Vercel Blob,
 * so real uploads are NOT verified here (they need Vercel Blob credentials).
 */

const m = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  consumeRateLimit: vi.fn(),
  connectToDatabase: vi.fn(),
  findById: vi.fn(),
  updateOne: vi.fn(),
  findOneAndUpdate: vi.fn(),
  processAvatar: vi.fn(),
  storeAvatar: vi.fn(),
  deleteAvatar: vi.fn(),
  updateTag: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ updateTag: m.updateTag, refresh: m.refresh }));
vi.mock("@/lib/auth/session", () => ({ getCurrentUser: m.getCurrentUser }));
vi.mock("@/lib/auth/rate-limit", () => ({ consumeRateLimit: m.consumeRateLimit }));
vi.mock("@/lib/db/connect", () => ({ connectToDatabase: m.connectToDatabase }));
vi.mock("@/lib/users/public-profile", () => ({ profileTag: (handle: string) => `profile:${handle}` }));
// `.select().lean()` chains, as the action uses them.
vi.mock("@/lib/db/models/user", () => ({
  User: {
    findById: (...args: unknown[]) => ({ select: () => ({ lean: () => m.findById(...args) }) }),
    findOneAndUpdate: (...args: unknown[]) => ({ select: () => ({ lean: () => m.findOneAndUpdate(...args) }) }),
    updateOne: m.updateOne,
  },
}));
// The real error classes (the action checks them with instanceof); storage calls are mocks.
vi.mock("@/lib/storage/avatar-storage", async () => {
  const actual = await vi.importActual<typeof import("@/lib/storage/avatar-storage")>("@/lib/storage/avatar-storage");
  return {
    StorageUnavailableError: actual.StorageUnavailableError,
    UnreadableImageError: actual.UnreadableImageError,
    processAvatar: m.processAvatar,
    storeAvatar: m.storeAvatar,
    deleteAvatar: m.deleteAvatar,
  };
});

const SESSION_USER = { id: "665f1c2e9b1d4a0012345678", name: "QA User", email: "qa@linkbase.test", handle: "maya" };
const OTHER_USER_ID = "665f1c2e9b1d4a00ffffffff";
const STORE = "https://samplestore.public.blob.vercel-storage.com/avatars";
const NEW_URL = `${STORE}/${SESSION_USER.id}/new.webp`;
const OLD_URL = `${STORE}/${SESSION_USER.id}/old.webp`;
const WEBP = Buffer.from("processed-webp");
const START: PictureFormState = { ok: false };

const JPEG_BYTES = [0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46];

function form(file: File | string | null, extra: Record<string, string> = {}): FormData {
  const data = new FormData();
  if (file !== null) data.set("picture", file);
  for (const [key, value] of Object.entries(extra)) data.set(key, value);
  return data;
}

function jpeg(size = JPEG_BYTES.length): File {
  const bytes = new Uint8Array(size);
  bytes.set(JPEG_BYTES);
  return new File([bytes], "me.jpg", { type: "image/jpeg" });
}

function file(content: string | Uint8Array, type: string, name = "upload"): File {
  const part = typeof content === "string" ? content : new Uint8Array(content);
  return new File([part], name, { type });
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  m.getCurrentUser.mockResolvedValue(SESSION_USER);
  m.consumeRateLimit.mockResolvedValue(true);
  m.connectToDatabase.mockResolvedValue(undefined);
  m.findById.mockResolvedValue({ _id: SESSION_USER.id });
  m.updateOne.mockResolvedValue({ matchedCount: 1, modifiedCount: 1 });
  m.findOneAndUpdate.mockResolvedValue({ _id: SESSION_USER.id, image: OLD_URL });
  m.processAvatar.mockResolvedValue(WEBP);
  m.storeAvatar.mockResolvedValue(NEW_URL);
  m.deleteAvatar.mockResolvedValue(undefined);
});

function expectNothingStored() {
  expect(m.storeAvatar).not.toHaveBeenCalled();
  expect(m.updateOne).not.toHaveBeenCalled();
  expect(m.deleteAvatar).not.toHaveBeenCalled();
  expect(m.updateTag).not.toHaveBeenCalled();
}

describe("uploadProfilePictureAction: authentication", () => {
  it("refuses a signed-out request before touching the database or storage", async () => {
    m.getCurrentUser.mockResolvedValue(null);

    await expect(uploadProfilePictureAction(START, form(jpeg()))).resolves.toEqual({ ok: false, message: "Log in to continue." });

    expect(m.connectToDatabase).not.toHaveBeenCalled();
    expect(m.consumeRateLimit).not.toHaveBeenCalled();
    expect(m.processAvatar).not.toHaveBeenCalled();
    expectNothingStored();
  });

  it("refuses a user who hasn't picked a handle", async () => {
    m.getCurrentUser.mockResolvedValue({ ...SESSION_USER, handle: null });

    await expect(uploadProfilePictureAction(START, form(jpeg()))).resolves.toEqual({
      ok: false,
      message: "Pick your handle first.",
    });
    expectNothingStored();
  });
});

describe("uploadProfilePictureAction: validation", () => {
  it.each([
    ["no file", form(null)],
    ["a text field instead of a file", form("https://evil.example.com/x.png")],
    ["an empty file", form(file("", "image/png"))],
  ])("rejects %s as missing", async (_name, data) => {
    await expect(uploadProfilePictureAction(START, data)).resolves.toEqual({
      ok: false,
      fieldErrors: { picture: [PICTURE_MESSAGES.missing] },
    });
    expectNothingStored();
  });

  it.each([
    ["GIF", file("GIF89a....", "image/gif")],
    ["SVG", file('<svg xmlns="http://www.w3.org/2000/svg"/>', "image/svg+xml")],
    ["PDF", file("%PDF-1.7", "application/pdf")],
  ])("rejects a %s by its declared type, before the rate limit", async (_name, upload) => {
    await expect(uploadProfilePictureAction(START, form(upload))).resolves.toEqual({
      ok: false,
      fieldErrors: { picture: [PICTURE_MESSAGES.type] },
    });
    expect(m.consumeRateLimit).not.toHaveBeenCalled();
    expectNothingStored();
  });

  it("rejects a file over 2 MB", async () => {
    await expect(uploadProfilePictureAction(START, form(jpeg(PICTURE_MAX_BYTES + 1)))).resolves.toEqual({
      ok: false,
      fieldErrors: { picture: [PICTURE_MESSAGES.size] },
    });
    expect(m.processAvatar).not.toHaveBeenCalled();
    expectNothingStored();
  });

  it("accepts a file of exactly 2 MB", async () => {
    await expect(uploadProfilePictureAction(START, form(jpeg(PICTURE_MAX_BYTES)))).resolves.toMatchObject({ ok: true });
  });

  it.each([
    ["text renamed .png", file("this is plain text", "image/png", "fake.png")],
    ["GIF bytes declared as JPEG", file("GIF89a\u0001\u0000", "image/jpeg", "x.jpg")],
    ["SVG declared as WebP", file("<svg></svg>", "image/webp", "x.webp")],
  ])("rejects %s by its real bytes, without processing it", async (_name, upload) => {
    await expect(uploadProfilePictureAction(START, form(upload))).resolves.toEqual({
      ok: false,
      fieldErrors: { picture: [PICTURE_MESSAGES.type] },
    });
    expect(m.processAvatar).not.toHaveBeenCalled();
    expectNothingStored();
  });

  it("rejects a malformed image that sharp can't decode", async () => {
    m.processAvatar.mockRejectedValue(new UnreadableImageError("bad"));

    await expect(uploadProfilePictureAction(START, form(jpeg(64)))).resolves.toEqual({
      ok: false,
      fieldErrors: { picture: [PICTURE_MESSAGES.unreadable] },
    });
    expectNothingStored();
  });

  it("rethrows unexpected processing errors (the panel shows its generic message)", async () => {
    m.processAvatar.mockRejectedValue(new Error("sharp crashed"));

    await expect(uploadProfilePictureAction(START, form(jpeg()))).rejects.toThrow("sharp crashed");
    expectNothingStored();
  });
});

describe("uploadProfilePictureAction: rate limit", () => {
  it("counts uploads per session user and stops at the limit", async () => {
    m.consumeRateLimit.mockResolvedValue(false);

    await expect(uploadProfilePictureAction(START, form(jpeg()))).resolves.toEqual({
      ok: false,
      message: "Too many uploads. Try again in an hour.",
    });
    expect(m.consumeRateLimit).toHaveBeenCalledWith("avatarUpload", SESSION_USER.id);
    expect(m.processAvatar).not.toHaveBeenCalled();
    expectNothingStored();
  });
});

describe("uploadProfilePictureAction: success and ownership", () => {
  it("stores the processed picture, saves its URL and refreshes the public profile", async () => {
    const result = await uploadProfilePictureAction(START, form(jpeg()));

    expect(result).toEqual({ ok: true, message: "Profile picture updated", values: { picture: NEW_URL } });
    expect(m.storeAvatar).toHaveBeenCalledWith(SESSION_USER.id, WEBP);
    expect(m.updateOne).toHaveBeenCalledWith(
      { _id: SESSION_USER.id },
      { $set: { image: NEW_URL } },
      { runValidators: true },
    );
    expect(m.deleteAvatar).not.toHaveBeenCalled();
    expect(m.updateTag).toHaveBeenCalledWith("profile:maya");
    expect(m.refresh).toHaveBeenCalledTimes(1);
  });

  it("uses only the session's user, ignoring any user id or URL sent with the form", async () => {
    const data = form(jpeg(), { userId: OTHER_USER_ID, _id: OTHER_USER_ID, image: `${STORE}/${OTHER_USER_ID}/x.webp` });

    await uploadProfilePictureAction(START, data);

    expect(m.findById).toHaveBeenCalledWith(SESSION_USER.id);
    expect(m.storeAvatar).toHaveBeenCalledWith(SESSION_USER.id, WEBP);
    expect(m.updateOne.mock.calls[0][0]).toEqual({ _id: SESSION_USER.id });
    expect(m.updateOne.mock.calls[0][1]).toEqual({ $set: { image: NEW_URL } });
    expect(m.deleteAvatar).not.toHaveBeenCalled();
  });
});

describe("uploadProfilePictureAction: replacing a picture", () => {
  it("deletes the previous file only after the new URL is saved", async () => {
    m.findById.mockResolvedValue({ _id: SESSION_USER.id, image: OLD_URL });

    await expect(uploadProfilePictureAction(START, form(jpeg()))).resolves.toMatchObject({ ok: true });

    expect(m.deleteAvatar).toHaveBeenCalledTimes(1);
    expect(m.deleteAvatar).toHaveBeenCalledWith(OLD_URL);
    expect(m.updateOne.mock.invocationCallOrder[0]).toBeLessThan(m.deleteAvatar.mock.invocationCallOrder[0]);
  });

  it("doesn't delete anything when the stored URL is unchanged", async () => {
    m.findById.mockResolvedValue({ _id: SESSION_USER.id, image: NEW_URL });

    await uploadProfilePictureAction(START, form(jpeg()));

    expect(m.deleteAvatar).not.toHaveBeenCalled();
  });
});

describe("uploadProfilePictureAction: storage and database failures", () => {
  it("shows the storage message when Blob is unavailable, and keeps the current picture", async () => {
    m.findById.mockResolvedValue({ _id: SESSION_USER.id, image: OLD_URL });
    m.storeAvatar.mockRejectedValue(new StorageUnavailableError("not configured"));

    await expect(uploadProfilePictureAction(START, form(jpeg()))).resolves.toEqual({
      ok: false,
      message: PICTURE_MESSAGES.storage,
    });
    expect(m.updateOne).not.toHaveBeenCalled();
    expect(m.deleteAvatar).not.toHaveBeenCalled();
    expect(m.updateTag).not.toHaveBeenCalled();
  });

  it("logs only the error name for a storage failure", async () => {
    const cause = new Error(`failed for ${NEW_URL}`);
    m.storeAvatar.mockRejectedValue(new StorageUnavailableError("down", { cause }));

    await uploadProfilePictureAction(START, form(jpeg()));

    const lines = vi.mocked(console.error).mock.calls.map((call) => String(call[0]));
    expect(lines).toEqual(["[avatar] Upload failed (StorageUnavailableError)."]);
  });

  it("rethrows other storage errors", async () => {
    m.storeAvatar.mockRejectedValue(new TypeError("bug"));

    await expect(uploadProfilePictureAction(START, form(jpeg()))).rejects.toThrow("bug");
    expect(m.updateOne).not.toHaveBeenCalled();
  });

  it("deletes the new file when saving its URL fails, and keeps the old one", async () => {
    m.findById.mockResolvedValue({ _id: SESSION_USER.id, image: OLD_URL });
    m.updateOne.mockRejectedValue(new Error("MongoNetworkError"));

    await expect(uploadProfilePictureAction(START, form(jpeg()))).rejects.toThrow("MongoNetworkError");

    expect(m.deleteAvatar).toHaveBeenCalledTimes(1);
    expect(m.deleteAvatar).toHaveBeenCalledWith(NEW_URL);
    expect(m.updateTag).not.toHaveBeenCalled();
  });

  it("deletes the new file when the account no longer exists", async () => {
    m.findById.mockResolvedValue({ _id: SESSION_USER.id, image: OLD_URL });
    m.updateOne.mockResolvedValue({ matchedCount: 0, modifiedCount: 0 });

    await expect(uploadProfilePictureAction(START, form(jpeg()))).resolves.toEqual({
      ok: false,
      message: "Log in to continue.",
    });
    expect(m.deleteAvatar).toHaveBeenCalledTimes(1);
    expect(m.deleteAvatar).toHaveBeenCalledWith(NEW_URL);
    expect(m.updateTag).not.toHaveBeenCalled();
  });
});

describe("removeProfilePictureAction", () => {
  it("refuses a signed-out request before touching the database or storage", async () => {
    m.getCurrentUser.mockResolvedValue(null);

    await expect(removeProfilePictureAction()).resolves.toEqual({ ok: false, message: "Log in to continue." });
    expect(m.connectToDatabase).not.toHaveBeenCalled();
    expect(m.findOneAndUpdate).not.toHaveBeenCalled();
    expect(m.deleteAvatar).not.toHaveBeenCalled();
  });

  it("refuses a user who hasn't picked a handle", async () => {
    m.getCurrentUser.mockResolvedValue({ ...SESSION_USER, handle: null });

    await expect(removeProfilePictureAction()).resolves.toMatchObject({ ok: false });
    expect(m.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it("clears the session user's own picture, deletes that file and refreshes the profile", async () => {
    await expect(removeProfilePictureAction()).resolves.toEqual({
      ok: true,
      message: "Profile picture removed",
      values: { picture: "" },
    });
    expect(m.findOneAndUpdate).toHaveBeenCalledWith({ _id: SESSION_USER.id }, { $unset: { image: 1 } });
    expect(m.deleteAvatar).toHaveBeenCalledWith(OLD_URL);
    expect(m.updateTag).toHaveBeenCalledWith("profile:maya");
    expect(m.refresh).toHaveBeenCalledTimes(1);
  });

  it("deletes the file named in the user's own record, never one from the client", async () => {
    const remove = removeProfilePictureAction as (...args: unknown[]) => Promise<PictureFormState>;

    await remove({ ok: false }, form(null, { image: `${STORE}/${OTHER_USER_ID}/x.webp`, userId: OTHER_USER_ID }));

    expect(m.findOneAndUpdate.mock.calls[0][0]).toEqual({ _id: SESSION_USER.id });
    expect(m.deleteAvatar).toHaveBeenCalledWith(OLD_URL);
  });

  it("succeeds when there was no picture (nothing to delete)", async () => {
    m.findOneAndUpdate.mockResolvedValue({ _id: SESSION_USER.id });

    await expect(removeProfilePictureAction()).resolves.toMatchObject({ ok: true });
    expect(m.deleteAvatar).toHaveBeenCalledWith(undefined);
  });

  it("rethrows a database failure (the dialog shows its message) without deleting the file", async () => {
    m.findOneAndUpdate.mockRejectedValue(new Error("MongoNetworkError"));

    await expect(removeProfilePictureAction()).rejects.toThrow("MongoNetworkError");
    expect(m.deleteAvatar).not.toHaveBeenCalled();
    expect(m.updateTag).not.toHaveBeenCalled();
  });
});
