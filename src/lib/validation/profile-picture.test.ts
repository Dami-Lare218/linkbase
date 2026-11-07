import { describe, expect, it } from "vitest";

import {
  detectImageType,
  getPictureFileError,
  isBlobAvatarUrl,
  PICTURE_ACCEPT,
  PICTURE_MAX_BYTES,
  PICTURE_MESSAGES,
} from "@/lib/validation/profile-picture";

// File signatures, padded so they look like the start of a real file.
const JPEG = [0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10];
const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00];
const WEBP = [0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50, 0x56, 0x50];

function bytes(values: number[]): Uint8Array {
  return Uint8Array.from(values);
}

function ascii(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

describe("PICTURE_MAX_BYTES and PICTURE_ACCEPT", () => {
  it("allows 2 MB", () => {
    expect(PICTURE_MAX_BYTES).toBe(2_097_152);
  });

  it("lists exactly JPEG, PNG and WebP for the file input", () => {
    expect(PICTURE_ACCEPT).toBe("image/jpeg,image/png,image/webp");
  });
});

describe("getPictureFileError", () => {
  it.each(["image/jpeg", "image/png", "image/webp"])("accepts %s", (type) => {
    expect(getPictureFileError({ size: 1000, type })).toBeNull();
  });

  it.each(["image/gif", "image/svg+xml", "image/heic", "image/bmp", "text/plain", "application/pdf", "", "IMAGE/PNG"])(
    "rejects the declared type %j",
    (type) => {
      expect(getPictureFileError({ size: 1000, type })).toBe(PICTURE_MESSAGES.type);
    },
  );

  it.each([
    [1, null],
    [PICTURE_MAX_BYTES - 1, null],
    [PICTURE_MAX_BYTES, null],
    [PICTURE_MAX_BYTES + 1, PICTURE_MESSAGES.size],
    [3 * 1024 * 1024, PICTURE_MESSAGES.size],
  ])("size %i → %j", (size, expected) => {
    expect(getPictureFileError({ size, type: "image/png" })).toBe(expected);
  });

  it("treats an empty file as no file chosen", () => {
    expect(getPictureFileError({ size: 0, type: "image/png" })).toBe(PICTURE_MESSAGES.missing);
  });

  it("reports an empty file before a wrong type", () => {
    expect(getPictureFileError({ size: 0, type: "" })).toBe(PICTURE_MESSAGES.missing);
  });

  it("reports a wrong type before the size", () => {
    expect(getPictureFileError({ size: PICTURE_MAX_BYTES + 1, type: "image/gif" })).toBe(PICTURE_MESSAGES.type);
  });

  it("shows the messages the upload panel displays", () => {
    expect(PICTURE_MESSAGES).toEqual({
      missing: "Choose an image to upload.",
      type: "Use a JPEG, PNG or WebP image.",
      size: "Images must be 2 MB or smaller.",
      unreadable: "Couldn't read that image. Try a different file.",
      storage: "Couldn't save your picture right now. Try again in a moment.",
      removeFailed: "Couldn't remove your picture right now. Try again in a moment.",
    });
  });
});

describe("detectImageType", () => {
  it.each([
    ["JPEG", JPEG, "image/jpeg"],
    ["PNG", PNG, "image/png"],
    ["WebP", WEBP, "image/webp"],
  ])("detects %s from its first bytes", (_name, signature, expected) => {
    expect(detectImageType(bytes(signature))).toBe(expected);
  });

  it("needs only the bare signature", () => {
    expect(detectImageType(bytes([0xff, 0xd8, 0xff]))).toBe("image/jpeg");
  });

  it.each([
    ["GIF", ascii("GIF89a\u0001\u0000")],
    ["SVG", ascii('<svg xmlns="http://www.w3.org/2000/svg"></svg>')],
    ["SVG with an XML declaration", ascii('<?xml version="1.0"?><svg></svg>')],
    ["text renamed .png", ascii("hello, this is not an image")],
    ["HTML", ascii("<!DOCTYPE html><script>alert(1)</script>")],
    ["PDF", ascii("%PDF-1.7")],
    ["BMP", ascii("BM\u0000\u0000")],
    ["a RIFF file that isn't WebP (WAV)", ascii("RIFF$\u0000\u0000\u0000WAVEfmt ")],
    ["an empty file", new Uint8Array(0)],
  ])("rejects %s", (_name, input) => {
    expect(detectImageType(input)).toBeNull();
  });

  it.each([
    ["JPEG", JPEG.slice(0, 2)],
    ["PNG", PNG.slice(0, 7)],
    ["WebP", WEBP.slice(0, 11)],
  ])("rejects a truncated %s signature", (_name, signature) => {
    expect(detectImageType(bytes(signature))).toBeNull();
  });

  it("rejects a signature that doesn't start at byte 0", () => {
    expect(detectImageType(bytes([0x00, ...PNG]))).toBeNull();
  });

  it("rejects a PNG signature with one wrong byte", () => {
    const broken = [...PNG];
    broken[4] = 0x00;
    expect(detectImageType(bytes(broken))).toBeNull();
  });
});

describe("isBlobAvatarUrl", () => {
  const valid = "https://abc123store.public.blob.vercel-storage.com/avatars/665f1c2e9b1d4a0012345678/4b8e1d2a-1c3f-4e5a-9b7c-2d4e6f8a0b1c.webp";

  it("accepts a stored avatar URL", () => {
    expect(isBlobAvatarUrl(valid)).toBe(true);
  });

  it.each([
    ["http (not https)", valid.replace("https://", "http://")],
    ["another host", "https://evil.example.com/avatars/u/x.webp"],
    ["a look-alike host", "https://store.public.blob.vercel-storage.com.evil.com/avatars/u/x.webp"],
    ["outside avatars/", "https://store.public.blob.vercel-storage.com/other/u/x.webp"],
    ["a private Blob store", "https://store.private.blob.vercel-storage.com/avatars/u/x.webp"],
    ["a query string", `${valid}?download=1`],
    ["a fragment", `${valid}#x`],
    ["credentials in the URL", "https://user:pass@store.public.blob.vercel-storage.com/avatars/u/x.webp"],
    ["a port", "https://store.public.blob.vercel-storage.com:8443/avatars/u/x.webp"],
    ["an encoded character", "https://store.public.blob.vercel-storage.com/avatars/u/%2e%2e.webp"],
    ["javascript:", "javascript:alert(1)"],
    ["a data: URL", "data:image/png;base64,AAAA"],
    ["a blob: URL", "blob:http://localhost:3000/1234"],
    ["surrounding spaces", ` ${valid} `],
    ["an empty string", ""],
  ])("rejects %s", (_name, value) => {
    expect(isBlobAvatarUrl(value)).toBe(false);
  });

  it("rejects a URL longer than 2048 characters", () => {
    const long = `https://store.public.blob.vercel-storage.com/avatars/${"a".repeat(2048)}.webp`;
    expect(isBlobAvatarUrl(long)).toBe(false);
  });

  it.each([null, undefined, 42, {}, ["https://store.public.blob.vercel-storage.com/avatars/u/x.webp"]])(
    "rejects the non-string %j",
    (value) => {
      expect(isBlobAvatarUrl(value)).toBe(false);
    },
  );
});
