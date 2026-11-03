/**
 * Where a signed-in user belongs. Pure (no server imports), so it is unit-tested and shared
 * by every page and action that redirects signed-in users.
 */

export const LOGIN_PATH = "/login";
export const DASHBOARD_PATH = "/dashboard";
export const ONBOARDING_PATH = "/onboarding";

/** `/dashboard` once the user has a handle, `/onboarding` until then. */
export function homePathFor(user: { handle: string | null }): string {
  return user.handle ? DASHBOARD_PATH : ONBOARDING_PATH;
}
