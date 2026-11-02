import "server-only";

import mongoose, { Schema } from "mongoose";
import type { InferSchemaType, Model } from "mongoose";

export const HANDLE_PATTERN = /^[a-z0-9._]{3,30}$/;

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
    // Chosen later during onboarding, so it's optional at signup.
    handle: {
      type: String,
      trim: true,
      lowercase: true,
      match: HANDLE_PATTERN,
    },
  },
  { timestamps: true, strict: true },
);

userSchema.index({ email: 1 }, { unique: true });
// Unique only among users who have picked a handle.
userSchema.index(
  { handle: 1 },
  { unique: true, partialFilterExpression: { handle: { $type: "string" } } },
);

export type UserDocument = InferSchemaType<typeof userSchema>;

export const User: Model<UserDocument> =
  (mongoose.models.User as Model<UserDocument> | undefined) ??
  mongoose.model<UserDocument>("User", userSchema);
