import "server-only";

import mongoose, { Schema } from "mongoose";
import type { InferSchemaType, Model } from "mongoose";

import { HANDLE_MAX_LENGTH, HANDLE_MIN_LENGTH, HANDLE_PATTERN } from "@/lib/validation/handle-rules";

// Basic shape check only. Zod validates emails properly at the Server Action boundary.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const userSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 50,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 254,
      match: EMAIL_PATTERN,
    },
    // Never selected by default, so it can't leak through ordinary queries.
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
    // Chosen during onboarding, so it's optional at signup. Identifies the public
    // profile (/user/[handle]). Rules live in `handle-rules.ts`.
    handle: {
      type: String,
      trim: true,
      lowercase: true,
      minlength: HANDLE_MIN_LENGTH,
      maxlength: HANDLE_MAX_LENGTH,
      match: HANDLE_PATTERN,
    },
  },
  { timestamps: true, strict: true },
);

userSchema.index({ email: 1 }, { unique: true });
// Unique only among users who have picked a handle, so users without one don't collide.
// Also serves public profile lookups by handle.
userSchema.index(
  { handle: 1 },
  { unique: true, partialFilterExpression: { handle: { $type: "string" } } },
);

export type UserDocument = InferSchemaType<typeof userSchema>;

export const User: Model<UserDocument> =
  (mongoose.models.User as Model<UserDocument> | undefined) ??
  mongoose.model<UserDocument>("User", userSchema);
