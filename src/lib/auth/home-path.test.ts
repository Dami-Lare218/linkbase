import { describe, expect, it } from "vitest";

import { DASHBOARD_PATH, homePathFor, LOGIN_PATH, ONBOARDING_PATH } from "@/lib/auth/home-path";

describe("homePathFor", () => {
  it("sends users with a handle to the dashboard", () => {
    expect(homePathFor({ handle: "maya" })).toBe("/dashboard");
  });

  it("sends users without a handle to onboarding", () => {
    expect(homePathFor({ handle: null })).toBe("/onboarding");
  });

  it("treats an empty handle as no handle", () => {
    expect(homePathFor({ handle: "" })).toBe("/onboarding");
  });
});

describe("path constants", () => {
  it("are same-site absolute paths", () => {
    for (const path of [LOGIN_PATH, DASHBOARD_PATH, ONBOARDING_PATH]) {
      expect(path).toMatch(/^\/[a-z]+$/);
    }
  });
});
