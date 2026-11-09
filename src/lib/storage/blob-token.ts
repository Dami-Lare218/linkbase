/**
 * Shape check for a Vercel Blob read-write token (`vercel_blob_rw_<storeId>_<secret>`).
 * Pure, so it's unit-tested. Never logs or returns the token.
 */

const BLOB_READ_WRITE_TOKEN = /^vercel_blob_rw_[A-Za-z0-9]+_[^\s_]\S*$/;

export function isBlobReadWriteToken(value: unknown): value is string {
  return typeof value === "string" && BLOB_READ_WRITE_TOKEN.test(value);
}
