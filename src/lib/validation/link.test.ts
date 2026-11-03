import { describe, expect, it } from "vitest";
import { z } from "zod";

import {
  createLinkSchema,
  deleteLinkSchema,
  isHttpUrl,
  LINK_MESSAGES,
  LINK_TITLE_MAX_LENGTH,
  LINK_URL_MAX_LENGTH,
  linkIdSchema,
  linkTitleSchema,
  linkUrlSchema,
  setFooterSchema,
  setLinkActiveSchema,
  updateLinkSchema,
} from "@/lib/validation/link";

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

/** The first message for a bare (non-object) schema. */
function firstFormError(schema: z.ZodType, input: unknown): string | undefined {
  const result = schema.safeParse(input);
  if (result.success) return undefined;
  return z.flattenError(result.error).formErrors[0];
}

/** An https URL of exactly `length` characters. */
function urlOfLength(length: number): string {
  const base = "https://example.com/";
  return base + "a".repeat(length - base.length);
}

// Fresh objects per call, so no test can affect another.
function validLink(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return { title: "My portfolio", url: "https://maya.design/work", ...overrides };
}

const VALID_ID = "65a1b2c3d4e5f60718293a4b";

describe("isHttpUrl", () => {
  describe("accepted", () => {
    it.each([
      "https://maya.design",
      "http://maya.design",
      "https://maya.design/work?tab=1#top",
      "https://www.instagram.com/maya.rivers",
      "https://sub.domain.example.co.uk/path",
      "HTTPS://EXAMPLE.COM",
      "http://localhost:3000",
      "https://192.168.0.1/admin",
    ])("%s", (url) => {
      expect(isHttpUrl(url)).toBe(true);
    });
  });

  describe("rejected", () => {
    it.each([
      ["javascript: (runs code when clicked)", "javascript:alert(1)"],
      ["data:", "data:text/html,<script>alert(1)</script>"],
      ["vbscript:", "vbscript:msgbox(1)"],
      ["file:", "file:///etc/passwd"],
      ["ftp:", "ftp://example.com"],
      ["mailto:", "mailto:maya@example.com"],
      ["no scheme", "maya.design"],
      ["protocol-relative", "//maya.design"],
      ["scheme only", "https://"],
      ["inner space", "https://maya .design"],
      ["leading space (callers trim first)", " https://maya.design"],
      ["empty", ""],
      ["plain text", "not a url"],
    ])("%s", (_label, url) => {
      expect(isHttpUrl(url)).toBe(false);
    });
  });

  describe("length limit", () => {
    it(`accepts exactly ${LINK_URL_MAX_LENGTH} characters`, () => {
      expect(isHttpUrl(urlOfLength(LINK_URL_MAX_LENGTH))).toBe(true);
    });

    it(`rejects ${LINK_URL_MAX_LENGTH + 1} characters`, () => {
      expect(isHttpUrl(urlOfLength(LINK_URL_MAX_LENGTH + 1))).toBe(false);
    });
  });
});

describe("linkTitleSchema", () => {
  it("trims the title", () => {
    expect(linkTitleSchema.safeParse("  My portfolio  ").data).toBe("My portfolio");
  });

  it("accepts 1 character", () => {
    expect(linkTitleSchema.safeParse("a").success).toBe(true);
  });

  it(`accepts exactly ${LINK_TITLE_MAX_LENGTH} characters`, () => {
    expect(linkTitleSchema.safeParse("a".repeat(LINK_TITLE_MAX_LENGTH)).success).toBe(true);
  });

  it(`rejects ${LINK_TITLE_MAX_LENGTH + 1} characters with the length message`, () => {
    expect(firstFormError(linkTitleSchema, "a".repeat(LINK_TITLE_MAX_LENGTH + 1))).toBe(LINK_MESSAGES.titleLong);
  });

  it("counts length after trimming", () => {
    expect(linkTitleSchema.safeParse(`  ${"a".repeat(LINK_TITLE_MAX_LENGTH)}  `).success).toBe(true);
  });

  it.each([
    ["empty", ""],
    ["whitespace only", "   "],
  ])("rejects %s with 'Enter a title.'", (_label, value) => {
    expect(firstFormError(linkTitleSchema, value)).toBe(LINK_MESSAGES.titleEmpty);
  });

  it("keeps symbols and emoji as typed (rendered as text, not HTML)", () => {
    expect(linkTitleSchema.safeParse("<b>Shop</b> 🛍️").data).toBe("<b>Shop</b> 🛍️");
  });

  it.each([undefined, null, 42, ["title"]])("rejects a non-string (%s)", (value) => {
    expect(firstFormError(linkTitleSchema, value)).toBe(LINK_MESSAGES.titleEmpty);
  });
});

describe("linkUrlSchema", () => {
  it("trims the URL before checking it", () => {
    expect(linkUrlSchema.safeParse("  https://maya.design  ").data).toBe("https://maya.design");
  });

  it.each([
    ["empty", ""],
    ["whitespace only", "   "],
  ])("rejects %s with 'Enter a URL.'", (_label, value) => {
    expect(firstFormError(linkUrlSchema, value)).toBe(LINK_MESSAGES.urlEmpty);
  });

  it.each(["javascript:alert(1)", "ftp://x.com", "maya.design", "mailto:maya@example.com"])(
    "rejects %s with the http/https message",
    (value) => {
      expect(firstFormError(linkUrlSchema, value)).toBe(LINK_MESSAGES.urlInvalid);
    },
  );

  it(`rejects ${LINK_URL_MAX_LENGTH + 1} characters with the length message first`, () => {
    expect(firstFormError(linkUrlSchema, urlOfLength(LINK_URL_MAX_LENGTH + 1))).toBe(LINK_MESSAGES.urlLong);
  });

  it("rejects a non-string", () => {
    expect(firstFormError(linkUrlSchema, 42)).toBe(LINK_MESSAGES.urlEmpty);
  });
});

describe("linkIdSchema", () => {
  it("accepts a 24-character hex id, in either case", () => {
    expect(linkIdSchema.safeParse(VALID_ID).success).toBe(true);
    expect(linkIdSchema.safeParse(VALID_ID.toUpperCase()).success).toBe(true);
  });

  it.each([
    ["23 characters", VALID_ID.slice(1)],
    ["25 characters", `${VALID_ID}a`],
    ["non-hex characters", "zzzzzzzzzzzzzzzzzzzzzzzz"],
    ["an injection-style object string", '{"$ne":null}'],
    ["empty", ""],
  ])("rejects %s with the not-found message", (_label, value) => {
    expect(firstFormError(linkIdSchema, value)).toBe(LINK_MESSAGES.notFound);
  });

  it.each([undefined, null, 123, { $ne: null }])("rejects a non-string (%s)", (value) => {
    expect(linkIdSchema.safeParse(value).success).toBe(false);
  });
});

describe("createLinkSchema", () => {
  it("accepts a title and an https URL, trimmed", () => {
    const result = createLinkSchema.safeParse(validLink({ title: " Shop ", url: " https://shop.example.com " }));

    expect(result.data).toEqual({ title: "Shop", url: "https://shop.example.com" });
  });

  it("drops unknown fields, so a client can't set userId, isActive or clicks", () => {
    const result = createLinkSchema.safeParse(
      validLink({ userId: "someone-else", isActive: false, clicks: 999, _id: VALID_ID }),
    );

    expect(result.data).toEqual({ title: "My portfolio", url: "https://maya.design/work" });
  });

  it.each([
    ["a missing title", { url: "https://maya.design" }, "title", LINK_MESSAGES.titleEmpty],
    ["an empty title", validLink({ title: "" }), "title", LINK_MESSAGES.titleEmpty],
    ["a 101-character title", validLink({ title: "a".repeat(101) }), "title", LINK_MESSAGES.titleLong],
    ["a missing URL", { title: "Shop" }, "url", LINK_MESSAGES.urlEmpty],
    ["a javascript: URL", validLink({ url: "javascript:alert(1)" }), "url", LINK_MESSAGES.urlInvalid],
    ["an ftp: URL", validLink({ url: "ftp://x.com" }), "url", LINK_MESSAGES.urlInvalid],
    ["a URL without a scheme", validLink({ url: "maya.design" }), "url", LINK_MESSAGES.urlInvalid],
  ])("shows the field error for %s", (_label, input, field, message) => {
    expect(firstErrorFor(createLinkSchema, input, field)).toBe(message);
  });

  it("reports both fields at once when both are wrong", () => {
    const errors = fieldErrorsFor(createLinkSchema, { title: "", url: "nope" });

    expect(errors.title?.[0]).toBe(LINK_MESSAGES.titleEmpty);
    expect(errors.url?.[0]).toBe(LINK_MESSAGES.urlInvalid);
  });
});

describe("updateLinkSchema", () => {
  it("accepts an id with a valid title and URL", () => {
    const result = updateLinkSchema.safeParse(validLink({ id: VALID_ID }));

    expect(result.data).toEqual({ id: VALID_ID, title: "My portfolio", url: "https://maya.design/work" });
  });

  it("uses the same title and URL rules as adding", () => {
    const errors = fieldErrorsFor(updateLinkSchema, { id: VALID_ID, title: "a".repeat(101), url: "javascript:x" });

    expect(errors.title?.[0]).toBe(LINK_MESSAGES.titleLong);
    expect(errors.url?.[0]).toBe(LINK_MESSAGES.urlInvalid);
  });

  it.each([
    ["a missing id", validLink()],
    ["a malformed id", validLink({ id: "not-an-id" })],
  ])("rejects %s as not found", (_label, input) => {
    expect(firstErrorFor(updateLinkSchema, input, "id")).toBe(LINK_MESSAGES.notFound);
  });

  it("drops unknown fields such as userId", () => {
    const result = updateLinkSchema.safeParse(validLink({ id: VALID_ID, userId: "someone-else" }));

    expect(result.data).not.toHaveProperty("userId");
  });
});

describe("deleteLinkSchema", () => {
  it("accepts a valid id", () => {
    expect(deleteLinkSchema.safeParse({ id: VALID_ID }).data).toEqual({ id: VALID_ID });
  });

  it.each([{}, { id: "" }, { id: "123" }, { id: { $gt: "" } }])("rejects %j", (input) => {
    expect(deleteLinkSchema.safeParse(input).success).toBe(false);
  });
});

describe("setLinkActiveSchema", () => {
  it.each([true, false])("accepts isActive = %s", (isActive) => {
    expect(setLinkActiveSchema.safeParse({ id: VALID_ID, isActive }).data).toEqual({ id: VALID_ID, isActive });
  });

  it.each(["true", 1, null, undefined])("rejects a non-boolean isActive (%s)", (isActive) => {
    expect(setLinkActiveSchema.safeParse({ id: VALID_ID, isActive }).success).toBe(false);
  });

  it("rejects a malformed id", () => {
    expect(setLinkActiveSchema.safeParse({ id: "x", isActive: true }).success).toBe(false);
  });
});

describe("setFooterSchema", () => {
  it.each([true, false])("accepts showFooter = %s", (showFooter) => {
    expect(setFooterSchema.safeParse({ showFooter }).data).toEqual({ showFooter });
  });

  it.each(["false", 0, null, undefined])("rejects a non-boolean showFooter (%s)", (showFooter) => {
    expect(setFooterSchema.safeParse({ showFooter }).success).toBe(false);
  });
});
