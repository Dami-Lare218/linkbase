import { describe, expect, it } from "vitest";
import { z } from "zod";

import { logInSchema, signUpSchema } from "@/lib/validation/auth";

/** Field errors as the Server Actions build them (`z.flattenError(...).fieldErrors`). */
function fieldErrorsFor(schema: z.ZodType, input: unknown): Partial<Record<string, string[]>> {
  const result = schema.safeParse(input);
  if (result.success) return {};
  return z.flattenError(result.error).fieldErrors;
}

/** The message the form shows under a field: forms render only the first one. */
function firstErrorFor(schema: z.ZodType, input: unknown, field: string): string | undefined {
  return fieldErrorsFor(schema, input)[field]?.[0];
}

// Fresh objects per call, so no test can affect another.
function validSignUp(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return { name: "Ada Lovelace", email: "ada@example.com", password: "correct horse", ...overrides };
}

function validLogIn(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return { email: "ada@example.com", password: "correct horse", ...overrides };
}

// "é" is 2 bytes in UTF-8, so the byte length is double the character count.
const TWO_BYTE_CHAR = "é";

describe("signUpSchema", () => {
  describe("valid input", () => {
    it("accepts a name, email and 8+ character password", () => {
      const result = signUpSchema.safeParse(validSignUp());

      expect(result.success).toBe(true);
    });

    it("trims the name", () => {
      const result = signUpSchema.safeParse(validSignUp({ name: "  Ada  " }));

      expect(result.data?.name).toBe("Ada");
    });

    it("trims and lowercases the email", () => {
      const result = signUpSchema.safeParse(validSignUp({ email: "  Ada@Example.COM  " }));

      expect(result.data?.email).toBe("ada@example.com");
    });

    it("keeps the password exactly as typed, including spaces", () => {
      const result = signUpSchema.safeParse(validSignUp({ password: "  spaced pass  " }));

      expect(result.data?.password).toBe("  spaced pass  ");
    });

    it("accepts a 50-character name", () => {
      const result = signUpSchema.safeParse(validSignUp({ name: "a".repeat(50) }));

      expect(result.success).toBe(true);
    });

    it("accepts an 8-character password", () => {
      const result = signUpSchema.safeParse(validSignUp({ password: "a".repeat(8) }));

      expect(result.success).toBe(true);
    });

    it("accepts a password of exactly 72 bytes", () => {
      const result = signUpSchema.safeParse(validSignUp({ password: "a".repeat(72) }));

      expect(result.success).toBe(true);
    });

    it("accepts 36 two-byte characters (72 bytes)", () => {
      const result = signUpSchema.safeParse(validSignUp({ password: TWO_BYTE_CHAR.repeat(36) }));

      expect(result.success).toBe(true);
    });

    it("drops fields the form doesn't define", () => {
      const result = signUpSchema.safeParse(validSignUp({ role: "admin" }));

      expect(result.success).toBe(true);
      expect(result.data).not.toHaveProperty("role");
    });
  });

  describe("name errors", () => {
    it("rejects an empty name", () => {
      expect(firstErrorFor(signUpSchema, validSignUp({ name: "" }), "name")).toBe("Enter your name.");
    });

    it("rejects a name that is only spaces", () => {
      expect(firstErrorFor(signUpSchema, validSignUp({ name: "   " }), "name")).toBe("Enter your name.");
    });

    it("rejects a missing name", () => {
      expect(firstErrorFor(signUpSchema, validSignUp({ name: undefined }), "name")).toBe("Enter your name.");
    });

    it("rejects a 51-character name", () => {
      expect(firstErrorFor(signUpSchema, validSignUp({ name: "a".repeat(51) }), "name")).toBe(
        "Name must be 50 characters or fewer.",
      );
    });
  });

  describe("email errors", () => {
    it("rejects an empty email", () => {
      expect(firstErrorFor(signUpSchema, validSignUp({ email: "" }), "email")).toBe("Enter your email address.");
    });

    it("rejects a missing email", () => {
      expect(firstErrorFor(signUpSchema, validSignUp({ email: undefined }), "email")).toBe(
        "Enter your email address.",
      );
    });

    it("rejects an email that isn't a string", () => {
      expect(firstErrorFor(signUpSchema, validSignUp({ email: 42 }), "email")).toBe("Enter your email address.");
    });

    it.each(["not-an-email", "ada@", "@example.com", "ada example.com"])("rejects the invalid email %j", (email) => {
      expect(firstErrorFor(signUpSchema, validSignUp({ email }), "email")).toBe("Enter a valid email address.");
    });

    it("rejects an email longer than 254 characters", () => {
      const email = `${"a".repeat(243)}@example.com`; // 255 characters

      expect(firstErrorFor(signUpSchema, validSignUp({ email }), "email")).toBe(
        "Email must be 254 characters or fewer.",
      );
    });
  });

  describe("password errors", () => {
    it("rejects a 7-character password", () => {
      expect(firstErrorFor(signUpSchema, validSignUp({ password: "a".repeat(7) }), "password")).toBe(
        "Password must be at least 8 characters.",
      );
    });

    it("rejects an empty password", () => {
      expect(firstErrorFor(signUpSchema, validSignUp({ password: "" }), "password")).toBe(
        "Password must be at least 8 characters.",
      );
    });

    it("rejects a missing password", () => {
      expect(firstErrorFor(signUpSchema, validSignUp({ password: undefined }), "password")).toBe(
        "Enter a password.",
      );
    });

    it("rejects a 73-byte password", () => {
      expect(firstErrorFor(signUpSchema, validSignUp({ password: "a".repeat(73) }), "password")).toBe(
        "Password is too long. Use 72 characters or fewer.",
      );
    });

    it("limits by bytes, not characters: rejects 37 two-byte characters (74 bytes)", () => {
      expect(
        firstErrorFor(signUpSchema, validSignUp({ password: TWO_BYTE_CHAR.repeat(37) }), "password"),
      ).toBe("Password is too long. Use 72 characters or fewer.");
    });
  });

  it("reports every missing field at once", () => {
    const errors = fieldErrorsFor(signUpSchema, {});

    expect(errors.name?.[0]).toBe("Enter your name.");
    expect(errors.email?.[0]).toBe("Enter your email address.");
    expect(errors.password?.[0]).toBe("Enter a password.");
  });

  it("only reports the field that is wrong", () => {
    const errors = fieldErrorsFor(signUpSchema, validSignUp({ password: "short" }));

    expect(Object.keys(errors)).toEqual(["password"]);
  });
});

describe("logInSchema", () => {
  describe("valid input", () => {
    it("accepts an email and password", () => {
      const result = logInSchema.safeParse(validLogIn());

      expect(result.success).toBe(true);
    });

    it("trims and lowercases the email", () => {
      const result = logInSchema.safeParse(validLogIn({ email: "  Ada@Example.COM  " }));

      expect(result.data?.email).toBe("ada@example.com");
    });

    it("has no minimum length beyond one character, so older passwords still work", () => {
      const result = logInSchema.safeParse(validLogIn({ password: "x" }));

      expect(result.success).toBe(true);
    });

    it("accepts a 1024-character password", () => {
      const result = logInSchema.safeParse(validLogIn({ password: "a".repeat(1024) }));

      expect(result.success).toBe(true);
    });

    it("keeps the password exactly as typed, including spaces", () => {
      const result = logInSchema.safeParse(validLogIn({ password: "  spaced pass  " }));

      expect(result.data?.password).toBe("  spaced pass  ");
    });
  });

  describe("errors", () => {
    it("rejects an empty email", () => {
      expect(firstErrorFor(logInSchema, validLogIn({ email: "" }), "email")).toBe("Enter your email address.");
    });

    it("rejects an invalid email", () => {
      expect(firstErrorFor(logInSchema, validLogIn({ email: "not-an-email" }), "email")).toBe(
        "Enter a valid email address.",
      );
    });

    it("rejects an empty password", () => {
      expect(firstErrorFor(logInSchema, validLogIn({ password: "" }), "password")).toBe("Enter your password.");
    });

    it("rejects a missing password", () => {
      expect(firstErrorFor(logInSchema, validLogIn({ password: undefined }), "password")).toBe(
        "Enter your password.",
      );
    });

    it("rejects a password over 1024 characters with the generic login message", () => {
      expect(firstErrorFor(logInSchema, validLogIn({ password: "a".repeat(1025) }), "password")).toBe(
        "Invalid email or password.",
      );
    });

    it("reports both missing fields at once", () => {
      const errors = fieldErrorsFor(logInSchema, {});

      expect(errors.email?.[0]).toBe("Enter your email address.");
      expect(errors.password?.[0]).toBe("Enter your password.");
    });
  });
});
