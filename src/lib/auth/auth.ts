import "server-only";

import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";

import { connectToDatabase } from "@/lib/db/connect";
import { User } from "@/lib/db/models/user";
import { logInSchema } from "@/lib/validation/auth";

import { authConfig } from "./config";
import { verifyPassword } from "./password";
import { consumeRateLimit, getClientIp, resetRateLimit } from "./rate-limit";

// Codes appear in URLs for direct POSTs to the Auth.js route, so they stay generic.
export const INVALID_CREDENTIALS_CODE = "invalid_credentials";
export const RATE_LIMITED_CODE = "rate_limited";

class InvalidCredentials extends CredentialsSignin {
  code = INVALID_CREDENTIALS_CODE;
}

class RateLimited extends CredentialsSignin {
  code = RATE_LIMITED_CODE;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      // Runs for the logIn action and for direct POSTs to /api/auth/callback/credentials.
      async authorize(credentials, request) {
        const parsed = logInSchema.safeParse(credentials);
        if (!parsed.success) throw new InvalidCredentials();
        const { email, password } = parsed.data;

        await connectToDatabase();

        const ip = getClientIp(request.headers);
        const [ipAllowed, emailAllowed] = await Promise.all([
          consumeRateLimit("logInIp", ip),
          consumeRateLimit("logInEmail", email),
        ]);
        if (!ipAllowed || !emailAllowed) throw new RateLimited();

        const user = await User.findOne({ email }).select("+passwordHash").lean();
        // Always runs bcrypt, so response time doesn't reveal whether the email exists.
        const passwordMatches = await verifyPassword(password, user?.passwordHash ?? null);
        if (!user || !passwordMatches) throw new InvalidCredentials();

        await resetRateLimit("logInEmail", email);

        return { id: user._id.toString(), name: user.name, email: user.email };
      },
    }),
  ],
});
