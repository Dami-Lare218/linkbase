import "server-only";

import { compare, hash } from "bcryptjs";

const BCRYPT_COST = 12;

export async function hashPassword(password: string): Promise<string> {
  return hash(password, BCRYPT_COST);
}

// A real hash to compare against when the email doesn't exist, so a failed login
// takes the same time whether or not the account exists. Created once per process.
let dummyHash: Promise<string> | undefined;

/**
 * Checks a password against a stored hash. Pass `null` when no user was found:
 * it still runs a full bcrypt comparison and returns false.
 */
export async function verifyPassword(password: string, storedHash: string | null): Promise<boolean> {
  if (storedHash === null) {
    dummyHash ??= hash("linkbase-timing-equaliser", BCRYPT_COST);
    await compare(password, await dummyHash);
    return false;
  }
  return compare(password, storedHash);
}
