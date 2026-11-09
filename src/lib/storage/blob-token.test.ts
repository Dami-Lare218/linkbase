import { describe, expect, it } from "vitest";

import { isBlobReadWriteToken } from "@/lib/storage/blob-token";

// Made-up values in the token's shape: not real credentials.
describe("isBlobReadWriteToken", () => {
  it.each(["vercel_blob_rw_AbC123_XyZ789", "vercel_blob_rw_store1_secretWith-dash.and.dots"])("accepts %s", (token) => {
    expect(isBlobReadWriteToken(token)).toBe(true);
  });

  it.each([
    ["the QA placeholder (qa:server --no-uploads)", "qa-uploads-disabled"],
    ["an empty string", ""],
    ["a read-only prefix", "vercel_blob_ro_AbC123_XyZ789"],
    ["a missing secret", "vercel_blob_rw_AbC123_"],
    ["a missing store id", "vercel_blob_rw__XyZ789"],
    ["surrounding spaces", " vercel_blob_rw_AbC123_XyZ789 "],
    ["a space inside", "vercel_blob_rw_AbC123_Xy Z789"],
    ["an OIDC-style JWT", "eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJ4In0.sig"],
  ])("rejects %s", (_name, token) => {
    expect(isBlobReadWriteToken(token)).toBe(false);
  });

  it.each([undefined, null, 42, {}])("rejects the non-string %j", (value) => {
    expect(isBlobReadWriteToken(value)).toBe(false);
  });
});
