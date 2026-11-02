import type { NextAuthConfig } from "next-auth";

/**
 * Auth.js settings that don't touch the database. `src/proxy.ts` uses this on its own,
 * so Proxy never loads Mongoose. `auth.ts` adds the Credentials provider on top.
 */

const DAY_SECONDS = 24 * 60 * 60;

const AUTH_PAGES = ["/login", "/signup"];

function isDashboardPath(pathname: string): boolean {
  return pathname === "/dashboard" || pathname.startsWith("/dashboard/");
}

export const authConfig = {
  pages: { signIn: "/login" },
  session: {
    // Credentials sign-in only works with JWT sessions.
    strategy: "jwt",
    maxAge: 30 * DAY_SECONDS,
    updateAge: DAY_SECONDS,
  },
  providers: [],
  callbacks: {
    // Proxy only: an optimistic redirect. Pages and actions still check the session themselves.
    authorized({ auth, request }) {
      const { pathname, search } = request.nextUrl;
      const signedIn = Boolean(auth?.user);

      if (isDashboardPath(pathname) && !signedIn) {
        const loginUrl = new URL("/login", request.nextUrl);
        loginUrl.searchParams.set("callbackUrl", `${pathname}${search}`);
        return Response.redirect(loginUrl);
      }

      if (AUTH_PAGES.includes(pathname) && signedIn) {
        return Response.redirect(new URL("/dashboard", request.nextUrl));
      }

      return true;
    },
    jwt({ token, user }) {
      // `user` is only set at sign-in.
      if (user?.id) token.id = user.id;
      return token;
    },
    session({ session, token }) {
      if (typeof token.id === "string") session.user.id = token.id;
      return session;
    },
  },
  logger: {
    error(error) {
      // A wrong password or rate limit is an expected failure, not a server error.
      if ("type" in error && error.type === "CredentialsSignin") return;
      console.error("[auth]", error);
    },
  },
} satisfies NextAuthConfig;
