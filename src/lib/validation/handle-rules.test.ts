import { describe, expect, it } from "vitest";

import {
  getHandleFormatError,
  HANDLE_MAX_LENGTH,
  HANDLE_MESSAGES,
  HANDLE_MIN_LENGTH,
  HANDLE_PATTERN,
  isReservedHandle,
  normalizeHandle,
  RESERVED_HANDLES,
} from "@/lib/validation/handle-rules";

describe("normalizeHandle", () => {
  it("trims surrounding whitespace", () => {
    expect(normalizeHandle("  maya  ")).toBe("maya");
  });

  it("lowercases", () => {
    expect(normalizeHandle("Maya_Ortiz-1")).toBe("maya_ortiz-1");
  });

  it("keeps inner spaces, so they still fail validation", () => {
    expect(normalizeHandle(" Maya Ortiz ")).toBe("maya ortiz");
  });

  it("returns an empty string for whitespace only", () => {
    expect(normalizeHandle("   ")).toBe("");
  });
});

describe("getHandleFormatError", () => {
  describe("valid handles", () => {
    it.each(["maya", "mayaortiz", "maya_ortiz", "maya-ortiz", "m4y4", "123", "a_b", "x-y", "___", "---"])(
      "accepts %s",
      (handle) => {
        expect(getHandleFormatError(handle)).toBeNull();
      },
    );
  });

  describe("length boundaries", () => {
    it("rejects 2 characters as too short", () => {
      expect(getHandleFormatError("mo")).toBe(HANDLE_MESSAGES.short);
    });

    it("accepts exactly 3 characters", () => {
      expect(getHandleFormatError("a".repeat(HANDLE_MIN_LENGTH))).toBeNull();
    });

    it("accepts exactly 30 characters", () => {
      expect(getHandleFormatError("a".repeat(HANDLE_MAX_LENGTH))).toBeNull();
    });

    it("rejects 31 characters as too long", () => {
      expect(getHandleFormatError("a".repeat(HANDLE_MAX_LENGTH + 1))).toBe(HANDLE_MESSAGES.long);
    });

    it("rejects an empty value", () => {
      expect(getHandleFormatError("")).toBe(HANDLE_MESSAGES.empty);
    });
  });

  describe("invalid characters", () => {
    it.each([
      ["a space", "maya ortiz"],
      ["a period", "maya.ortiz"],
      ["an exclamation mark", "maya!"],
      ["an @ sign", "@maya"],
      ["a slash", "maya/ortiz"],
      ["an uppercase letter", "Maya"],
      ["an accented letter", "mayá"],
      ["an emoji", "maya😀"],
    ])("rejects %s", (_label, handle) => {
      expect(getHandleFormatError(handle)).toBe(HANDLE_MESSAGES.invalid);
    });

    it("reports invalid characters before length, so short values with symbols say what to fix", () => {
      expect(getHandleFormatError("m!")).toBe(HANDLE_MESSAGES.invalid);
    });
  });
});

describe("HANDLE_PATTERN", () => {
  it("agrees with getHandleFormatError on valid and invalid examples", () => {
    const examples = ["maya", "maya_ortiz-1", "mo", "maya.ortiz", "Maya", "a".repeat(30), "a".repeat(31)];

    for (const handle of examples) {
      expect(HANDLE_PATTERN.test(handle)).toBe(getHandleFormatError(handle) === null);
    }
  });
});

describe("isReservedHandle", () => {
  it.each(["admin", "linkbase", "help", "support", "dashboard", "onboarding"])("reserves %s", (handle) => {
    expect(isReservedHandle(handle)).toBe(true);
  });

  it("allows ordinary handles", () => {
    expect(isReservedHandle("mayaortiz")).toBe(false);
  });

  it("expects a normalized handle (callers normalize first)", () => {
    expect(isReservedHandle(normalizeHandle(" Admin "))).toBe(true);
  });

  it("only reserves names that are valid handles, so each one is reachable", () => {
    for (const handle of RESERVED_HANDLES) {
      expect(getHandleFormatError(handle)).toBeNull();
    }
  });
});
