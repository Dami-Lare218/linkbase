import type { DefaultSession } from "next-auth";

// Adds the user's database id to the Auth.js session type.
// The JWT keeps `id` as an untyped claim; `config.ts` checks it is a string before use.
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}
