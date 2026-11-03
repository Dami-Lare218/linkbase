import { describe, expect, it } from "vitest";

import { CHECK_FAILED_MESSAGE, getHandleFieldState } from "@/lib/onboarding/handle-field-state";
import type { HandleAvailability, HandleFieldInput } from "@/lib/onboarding/handle-field-state";
import { HANDLE_MESSAGES } from "@/lib/validation/handle-rules";

// Fresh input per call, so no test can affect another.
function input(overrides: Partial<HandleFieldInput> = {}): HandleFieldInput {
  return { value: "", availability: null, checkingHandle: null, ...overrides };
}

function reply(status: HandleAvailability["status"], handle: string, message?: string): HandleAvailability {
  return { status, handle, message };
}

describe("getHandleFieldState", () => {
  describe("empty field", () => {
    it("shows no error, no helper and the placeholder preview; Claim stays disabled", () => {
      expect(getHandleFieldState(input())).toEqual({
        error: undefined,
        helperText: undefined,
        isChecking: false,
        isAvailable: false,
        previewHandle: null,
      });
    });
  });

  describe("format errors (instant, before any server check)", () => {
    it.each([
      ["mo", HANDLE_MESSAGES.short],
      ["maya ortiz!", HANDLE_MESSAGES.invalid],
      ["maya.ortiz", HANDLE_MESSAGES.invalid],
      ["a".repeat(31), HANDLE_MESSAGES.long],
    ])("%s → %s", (value, message) => {
      const state = getHandleFieldState(input({ value }));

      expect(state.error).toBe(message);
      expect(state.isAvailable).toBe(false);
      expect(state.previewHandle).toBeNull();
    });

    it("wins over a stale 'available' reply for the same text", () => {
      const state = getHandleFieldState(input({ value: "mo", availability: reply("available", "mo") }));

      expect(state.error).toBe(HANDLE_MESSAGES.short);
      expect(state.isAvailable).toBe(false);
    });

    it("never shows the spinner for an invalid value", () => {
      expect(getHandleFieldState(input({ value: "mo", checkingHandle: "mo" })).isChecking).toBe(false);
    });
  });

  describe("valid format, waiting for the server", () => {
    it("previews the handle before any reply arrives", () => {
      const state = getHandleFieldState(input({ value: "maya" }));

      expect(state.previewHandle).toBe("maya");
      expect(state.error).toBeUndefined();
      expect(state.isAvailable).toBe(false);
    });

    it("shows 'Checking availability…' while a check runs for this value", () => {
      const state = getHandleFieldState(input({ value: "maya", checkingHandle: "maya" }));

      expect(state.isChecking).toBe(true);
      expect(state.helperText).toBe("Checking availability…");
    });

    it("ignores a running check for an older value", () => {
      expect(getHandleFieldState(input({ value: "mayao", checkingHandle: "maya" })).isChecking).toBe(false);
    });
  });

  describe("server replies", () => {
    it("enables Claim only when this exact value is available", () => {
      const state = getHandleFieldState(input({ value: "maya", availability: reply("available", "maya") }));

      expect(state.isAvailable).toBe(true);
      expect(state.helperText).toBe("linkba.se/maya is available.");
      expect(state.error).toBeUndefined();
    });

    it("ignores a reply for a different value", () => {
      const state = getHandleFieldState(input({ value: "mayao", availability: reply("available", "maya") }));

      expect(state.isAvailable).toBe(false);
      expect(state.helperText).toBeUndefined();
    });

    it("shows the taken message and keeps the preview", () => {
      const state = getHandleFieldState(
        input({ value: "maya", availability: reply("taken", "maya", HANDLE_MESSAGES.taken) }),
      );

      expect(state.error).toBe(HANDLE_MESSAGES.taken);
      expect(state.isAvailable).toBe(false);
      expect(state.previewHandle).toBe("maya");
    });

    it("falls back to the taken message when a reply has none", () => {
      expect(getHandleFieldState(input({ value: "maya", availability: reply("taken", "maya") })).error).toBe(
        HANDLE_MESSAGES.taken,
      );
    });

    it("shows the server's message for rate limits", () => {
      const state = getHandleFieldState(
        input({ value: "maya", availability: reply("rate-limited", "maya", "Too many checks.") }),
      );

      expect(state.error).toBe("Too many checks.");
      expect(state.isAvailable).toBe(false);
    });

    it("explains a failed check instead of spinning forever", () => {
      const state = getHandleFieldState(input({ value: "maya", availability: reply("error", "maya") }));

      expect(state.error).toBe(CHECK_FAILED_MESSAGE);
      expect(state.isChecking).toBe(false);
      expect(state.isAvailable).toBe(false);
    });

    it("shows the spinner, not the old error, while re-checking the same value", () => {
      const state = getHandleFieldState(
        input({ value: "maya", availability: reply("error", "maya"), checkingHandle: "maya" }),
      );

      expect(state.isChecking).toBe(true);
      expect(state.error).toBeUndefined();
      expect(state.helperText).toBe("Checking availability…");
    });
  });

  describe("claim rejected by the server", () => {
    it("shows the claim error for the value that was submitted, even after an 'available' reply", () => {
      const state = getHandleFieldState(
        input({
          value: "maya",
          availability: reply("available", "maya"),
          claim: { handle: "maya", error: HANDLE_MESSAGES.taken },
        }),
      );

      expect(state.error).toBe(HANDLE_MESSAGES.taken);
      expect(state.isAvailable).toBe(false);
    });

    it("drops the claim error once the user types something else", () => {
      const state = getHandleFieldState(
        input({
          value: "maya2",
          availability: reply("available", "maya2"),
          claim: { handle: "maya", error: HANDLE_MESSAGES.taken },
        }),
      );

      expect(state.error).toBeUndefined();
      expect(state.isAvailable).toBe(true);
    });
  });
});
