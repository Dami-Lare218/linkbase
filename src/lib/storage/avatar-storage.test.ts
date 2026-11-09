import { crc32 } from "node:zlib";

import sharp from "sharp";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  deleteAvatar,
  processAvatar,
  StorageUnavailableError,
  storeAvatar,
  UnreadableImageError,
} from "@/lib/storage/avatar-storage";

/**
 * MOCKED Vercel Blob tests (Doc/testing.md §2.1): `put` and `del` from `@vercel/blob` are
 * replaced by mocks, so nothing reaches a real Blob store. Image processing uses the real
 * `sharp`. Real uploads to a Blob store are not covered here; they need Vercel credentials.
 */

const blob = vi.hoisted(() => ({ put: vi.fn(), del: vi.fn() }));

// `server-only` throws outside the Next.js server runtime; the module itself is plain Node code.
vi.mock("server-only", () => ({}));
vi.mock("@vercel/blob", () => ({ put: blob.put, del: blob.del }));

// A made-up value with the shape of a read-write token (blob-token.ts). Not a real credential.
const SAMPLE_TOKEN = "vercel_blob_rw_SampleStore123_notARealSecretValue";
const USER_ID = "665f1c2e9b1d4a0012345678";
const STORED_URL = `https://samplestore123.public.blob.vercel-storage.com/avatars/${USER_ID}/1b2c.webp`;

async function image(format: "jpeg" | "png" | "webp", width = 64, height = 48): Promise<Uint8Array> {
  const buffer = await sharp({ create: { width, height, channels: 3, background: "#3366cc" } })
    .toFormat(format)
    .toBuffer();
  return new Uint8Array(buffer);
}

beforeEach(() => {
  blob.put.mockReset();
  blob.del.mockReset();
  vi.unstubAllEnvs();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("processAvatar (real sharp)", () => {
  it.each(["jpeg", "png", "webp"] as const)("turns a %s into a 512×512 WebP", async (format) => {
    const out = await processAvatar(await image(format));
    const meta = await sharp(out).metadata();

    expect(meta.format).toBe("webp");
    expect(meta.width).toBe(512);
    expect(meta.height).toBe(512);
  });

  it("drops EXIF metadata (such as GPS location) from the stored copy", async () => {
    const withExif = await sharp({ create: { width: 40, height: 40, channels: 3, background: "#ffffff" } })
      .withExif({ IFD0: { Copyright: "secret-location-marker" } })
      .jpeg()
      .toBuffer();
    expect((await sharp(withExif).metadata()).exif).toBeDefined();

    const out = await processAvatar(new Uint8Array(withExif));
    const meta = await sharp(out).metadata();

    expect(meta.exif).toBeUndefined();
    expect(out.includes(Buffer.from("secret-location-marker"))).toBe(false);
  });

  it("rejects bytes that only start like a JPEG", async () => {
    const fake = new Uint8Array(4096);
    fake.set([0xff, 0xd8, 0xff, 0xe0]);
    await expect(processAvatar(fake)).rejects.toBeInstanceOf(UnreadableImageError);
  });

  it("rejects a truncated PNG", async () => {
    const png = await image("png", 200, 200);
    await expect(processAvatar(png.slice(0, Math.floor(png.length / 2)))).rejects.toBeInstanceOf(UnreadableImageError);
  });

  it("rejects plain text", async () => {
    await expect(processAvatar(new TextEncoder().encode("not an image"))).rejects.toBeInstanceOf(UnreadableImageError);
  });

  it("rejects a small file that claims 10,000×10,000 pixels (decompression bomb)", async () => {
    // A valid 1×1 PNG whose header is rewritten to 10,000×10,000, with its checksum fixed,
    // so the pixel limit is the only reason to refuse it.
    const png = Buffer.from(await image("png", 1, 1));
    png.writeUInt32BE(10_000, 16);
    png.writeUInt32BE(10_000, 20);
    png.writeUInt32BE(crc32(png.subarray(12, 29)), 29);

    const error = await processAvatar(new Uint8Array(png)).catch((err: unknown) => err);

    expect(error).toBeInstanceOf(UnreadableImageError);
    expect(String((error as Error).cause)).toMatch(/pixel limit/i);
  });
});

describe("storeAvatar (mocked Blob)", () => {
  it("uploads to avatars/<userId>/<uuid>.webp as a public WebP, with the token passed explicitly", async () => {
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", SAMPLE_TOKEN);
    blob.put.mockResolvedValue({ url: STORED_URL });
    const webp = Buffer.from("webp-bytes");

    await expect(storeAvatar(USER_ID, webp)).resolves.toBe(STORED_URL);

    expect(blob.put).toHaveBeenCalledTimes(1);
    const [path, body, options] = blob.put.mock.calls[0];
    expect(path).toMatch(new RegExp(`^avatars/${USER_ID}/[0-9a-f-]{36}\\.webp$`));
    expect(body).toBe(webp);
    expect(options).toEqual({ access: "public", contentType: "image/webp", addRandomSuffix: false, token: SAMPLE_TOKEN });
  });

  it("uses a new file name for every upload", async () => {
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", SAMPLE_TOKEN);
    blob.put.mockResolvedValue({ url: STORED_URL });

    await storeAvatar(USER_ID, Buffer.from("a"));
    await storeAvatar(USER_ID, Buffer.from("b"));

    expect(blob.put.mock.calls[0][0]).not.toBe(blob.put.mock.calls[1][0]);
  });

  it("still passes BLOB_READ_WRITE_TOKEN when Vercel OIDC variables are present", async () => {
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", SAMPLE_TOKEN);
    vi.stubEnv("VERCEL_OIDC_TOKEN", "sample-oidc-value");
    vi.stubEnv("BLOB_STORE_ID", "store_sample");
    blob.put.mockResolvedValue({ url: STORED_URL });

    await storeAvatar(USER_ID, Buffer.from("x"));

    expect(blob.put.mock.calls[0][2]).toMatchObject({ token: SAMPLE_TOKEN });
  });

  it.each([
    ["missing", undefined],
    ["empty", ""],
    ["the QA --no-uploads placeholder", "qa-uploads-disabled"],
    ["a read-only token", "vercel_blob_ro_SampleStore123_notARealSecretValue"],
  ])("refuses without calling Blob when the token is %s", async (_name, value) => {
    if (value === undefined) vi.stubEnv("BLOB_READ_WRITE_TOKEN", undefined);
    else vi.stubEnv("BLOB_READ_WRITE_TOKEN", value);

    await expect(storeAvatar(USER_ID, Buffer.from("x"))).rejects.toBeInstanceOf(StorageUnavailableError);
    expect(blob.put).not.toHaveBeenCalled();
  });

  it("turns a Blob failure into StorageUnavailableError, keeping the cause", async () => {
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", SAMPLE_TOKEN);
    const cause = new Error("BlobServiceNotAvailable");
    blob.put.mockRejectedValue(cause);

    const error = await storeAvatar(USER_ID, Buffer.from("x")).catch((err: unknown) => err);

    expect(error).toBeInstanceOf(StorageUnavailableError);
    expect((error as Error).cause).toBe(cause);
  });
});

describe("deleteAvatar (mocked Blob)", () => {
  it("deletes a stored avatar URL with the token passed explicitly", async () => {
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", SAMPLE_TOKEN);
    blob.del.mockResolvedValue(undefined);

    await deleteAvatar(STORED_URL);

    expect(blob.del).toHaveBeenCalledWith(STORED_URL, { token: SAMPLE_TOKEN });
  });

  it.each([
    ["null", null],
    ["undefined", undefined],
    ["an empty string", ""],
    ["another host", "https://evil.example.com/avatars/u/x.webp"],
    ["a path outside avatars/", "https://samplestore123.public.blob.vercel-storage.com/other/x.webp"],
  ])("does nothing for %s", async (_name, url) => {
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", SAMPLE_TOKEN);

    await deleteAvatar(url);

    expect(blob.del).not.toHaveBeenCalled();
  });

  it("never throws when Blob fails, and logs only the error name", async () => {
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", SAMPLE_TOKEN);
    const failure = new Error(`request to ${STORED_URL} failed with ${SAMPLE_TOKEN}`);
    failure.name = "BlobRequestError";
    blob.del.mockRejectedValue(failure);
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);

    await expect(deleteAvatar(STORED_URL)).resolves.toBeUndefined();

    expect(log).toHaveBeenCalledTimes(1);
    const line = String(log.mock.calls[0][0]);
    expect(line).toContain("BlobRequestError");
    expect(line).not.toContain(STORED_URL);
    expect(line).not.toContain(SAMPLE_TOKEN);
  });

  it("never throws when storage isn't configured, and doesn't call Blob", async () => {
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", undefined);
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);

    await expect(deleteAvatar(STORED_URL)).resolves.toBeUndefined();

    expect(blob.del).not.toHaveBeenCalled();
    expect(String(log.mock.calls[0][0])).toContain("StorageUnavailableError");
  });
});
