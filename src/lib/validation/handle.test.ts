import { describe, expect, it } from "vitest";
import { z } from "zod";

import { claimHandleSchema, handleSchema } from "@/lib/validation/handle";
import { HANDLE_MESSAGES } from "@/lib/validation/handle-rules";

/** The message the onboarding form shows under the field, as `claimHandleAction` builds it. */
function firstFieldError(input: unknown): string | undefined {
  const result = claimHandleSchema.safeParse(input);
  if (result.success) return undefined;
  return z.flattenError(result.error).fieldErrors.handle?.[0];
}

/** The message `checkHandleAvailability` returns for a bare handle. */
function firstFormError(input: unknown): string | undefined {
  const result = handleSchema.safeParse(input);
  if (result.success) return undefined;
  return z.flattenError(result.error).formErrors[0];
}

describe("handleSchema", () => {
  describe("valid input", () => {
    it("accepts a valid handle unchanged", () => {
      expect(handleSchema.safeParse("maya_ortiz-1").data).toBe("maya_ortiz-1");
    });

    it("normalizes before validating: trims and lowercases", () => {
      expect(handleSchema.safeParse("  Maya_Ortiz-1  ").data).toBe("maya_ortiz-1");
    });

    it("accepts 3 and 30 characters", () => {
      expect(handleSchema.safeParse("abc").success).toBe(true);
      expect(handleSchema.safeParse("a".repeat(30)).success).toBe(true);
    });

    it("counts length after trimming, so padding doesn't push a 30-character handle over", () => {
      expect(handleSchema.safeParse(`  ${"a".repeat(30)}  `).success).toBe(true);
    });
  });

  describe("invalid input", () => {
    it("rejects 2 characters with the 'too short' message", () => {
      expect(firstFormError("mo")).toBe(HANDLE_MESSAGES.short);
    });

    it("rejects 31 characters with the 'too long' message", () => {
      expect(firstFormError("a".repeat(31))).toBe(HANDLE_MESSAGES.long);
    });

    it("rejects whitespace only as empty", () => {
      expect(firstFormError("   ")).toBe(HANDLE_MESSAGES.empty);
    });

    it.each(["maya ortiz!", "maya.ortiz", "maya/ortiz", "mayá"])("rejects %s with the 'invalid' message", (value) => {
      expect(firstFormError(value)).toBe(HANDLE_MESSAGES.invalid);
    });

    it.each([undefined, null, 42, ["maya"], { handle: "maya" }])("rejects a non-string (%s)", (value) => {
      expect(handleSchema.safeParse(value).success).toBe(false);
    });
  });

  it("doesn't decide availability: reserved names pass the format check", () => {
    // Reserved and taken handles are rejected by the data layer, not the schema.
    expect(handleSchema.safeParse("admin").success).toBe(true);
  });
});

describe("claimHandleSchema", () => {
  it("accepts { handle } and returns the normalized handle", () => {
    const result = claimHandleSchema.safeParse({ handle: " Maya " });

    expect(result.data).toEqual({ handle: "maya" });
  });

  it("drops unknown fields, so a client can't send extra data such as a userId", () => {
    const result = claimHandleSchema.safeParse({ handle: "maya", userId: "someone-else" });

    expect(result.data).toEqual({ handle: "maya" });
  });

  it.each([
    ["an empty handle", { handle: "" }, HANDLE_MESSAGES.empty],
    ["a missing handle", {}, HANDLE_MESSAGES.empty],
    ["a short handle", { handle: "mo" }, HANDLE_MESSAGES.short],
    ["a long handle", { handle: "a".repeat(31) }, HANDLE_MESSAGES.long],
    ["invalid characters", { handle: "maya ortiz!" }, HANDLE_MESSAGES.invalid],
  ])("shows the field error for %s", (_label, input, message) => {
    expect(firstFieldError(input)).toBe(message);
  });
});
