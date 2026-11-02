import { Suspense } from "react";

import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/session";

import { UserMenu } from "./user-menu";

/**
 * Right-hand side of the SiteNav: Log in / Sign up for visitors, the user menu when signed in.
 * Reading the session is request-time work, so it streams in behind Suspense and the rest
 * of the page still prerenders. The fallback is empty, so visitors who are signed in never
 * see a "Log in" flash.
 */
export function HeaderAuth() {
  return (
    <Suspense fallback={<div aria-hidden className="h-11 w-11 flex-none" />}>
      <HeaderAuthContent />
    </Suspense>
  );
}

async function HeaderAuthContent() {
  const user = await getCurrentUser();

  if (user) {
    // Only the fields the menu shows cross to the client.
    return <UserMenu name={user.name} email={user.email} />;
  }

  return (
    <>
      <Button href="/login" variant="secondary" className="max-[819px]:hidden">
        Log in
      </Button>
      <Button href="/signup" className="flex-none">
        <span className="max-[399px]:hidden">Sign up free</span>
        <span className="min-[400px]:hidden">Sign up</span>
      </Button>
    </>
  );
}

/** "Log in" button for the bottom of the mobile menu. Renders nothing when signed in. */
export function MobileMenuLogIn() {
  return (
    <Suspense fallback={null}>
      <MobileMenuLogInContent />
    </Suspense>
  );
}

async function MobileMenuLogInContent() {
  const user = await getCurrentUser();
  if (user) return null;

  return (
    <Button href="/login" variant="secondary" fullWidth>
      Log in
    </Button>
  );
}
