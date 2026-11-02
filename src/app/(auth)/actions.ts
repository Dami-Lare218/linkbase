"use server";

import { headers } from "next/headers";
import mongoose from "mongoose";
import { AuthError, CredentialsSignin } from "next-auth";
import { z } from "zod";

import { RATE_LIMITED_CODE, signIn, signOut } from "@/lib/auth/auth";
import { hashPassword } from "@/lib/auth/password";
import { consumeRateLimit, getClientIp } from "@/lib/auth/rate-limit";
import { connectToDatabase } from "@/lib/db/connect";
import { User } from "@/lib/db/models/user";
import type { FormState } from "@/lib/types/action-result";
import { logInSchema, signUpSchema } from "@/lib/validation/auth";

type SignUpField = "name" | "email" | "password";
type LogInField = "email" | "password";

const DEFAULT_REDIRECT = "/dashboard";

function readString(formData: FormData, field: string): string {
  const value = formData.get(field);
  return typeof value === "string" ? value : "";
}

/** Only same-site paths, so a crafted link can't send users to another site after login. */
function safeCallbackUrl(value: string): string {
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
    return DEFAULT_REDIRECT;
  }
  return value;
}

function isDuplicateKeyError(err: unknown): boolean {
  return err instanceof mongoose.mongo.MongoServerError && err.code === 11000;
}

export async function signUp(_prev: FormState<SignUpField>, formData: FormData): Promise<FormState<SignUpField>> {
  const input = {
    name: readString(formData, "name"),
    email: readString(formData, "email"),
    password: readString(formData, "password"),
  };
  // Echoed back so the form keeps them. Never the password.
  const values = { name: input.name, email: input.email };

  const parsed = signUpSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
  }
  const { name, email, password } = parsed.data;

  await connectToDatabase();

  const ip = getClientIp(await headers());
  if (!(await consumeRateLimit("signUpIp", ip))) {
    return { ok: false, message: "Too many sign-up attempts. Try again in an hour.", values };
  }

  try {
    await User.create({ name, email, passwordHash: await hashPassword(password) });
  } catch (err) {
    if (isDuplicateKeyError(err)) {
      return {
        ok: false,
        fieldErrors: { email: ["An account with this email already exists."] },
        values,
      };
    }
    throw new Error("Failed to create account", { cause: err });
  }

  try {
    // On success this throws Next.js's redirect, which is re-thrown below.
    await signIn("credentials", { email, password, redirectTo: DEFAULT_REDIRECT });
  } catch (err) {
    if (err instanceof AuthError && err.type === CredentialsSignin.type) {
      // The account exists, but automatic sign-in was refused (e.g. rate limited).
      return { ok: true, message: "Your account was created. Log in to continue." };
    }
    throw err;
  }

  return { ok: true };
}

export async function logIn(_prev: FormState<LogInField>, formData: FormData): Promise<FormState<LogInField>> {
  const input = {
    email: readString(formData, "email"),
    password: readString(formData, "password"),
  };
  const values = { email: input.email };

  const parsed = logInSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
  }

  const redirectTo = safeCallbackUrl(readString(formData, "callbackUrl"));

  try {
    // On success this throws Next.js's redirect, which is re-thrown below.
    await signIn("credentials", { ...parsed.data, redirectTo });
  } catch (err) {
    if (err instanceof AuthError && err.type === CredentialsSignin.type) {
      const rateLimited = err instanceof CredentialsSignin && err.code === RATE_LIMITED_CODE;
      return {
        ok: false,
        message: rateLimited
          ? "Too many attempts. Try again in 15 minutes."
          : "Invalid email or password.",
        values,
      };
    }
    // Anything else (database down, misconfiguration) is unexpected: let error.tsx handle it.
    throw err;
  }

  return { ok: true };
}

export async function logOut(): Promise<void> {
  await signOut({ redirectTo: "/" });
}
