import NextAuth from "next-auth";

import { authConfig } from "@/lib/auth/config";

// Optimistic redirects only (see `authorized` in the config). Not a security boundary:
// pages and Server Actions check the session themselves. No database access here.
const { auth } = NextAuth(authConfig);

export const proxy = auth;

export const config = {
  matcher: ["/dashboard/:path*", "/login", "/signup"],
};
