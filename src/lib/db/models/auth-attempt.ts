import "server-only";

import mongoose, { Schema } from "mongoose";
import type { InferSchemaType, Model } from "mongoose";

/**
 * Rate-limit counter for sign-in and sign-up attempts.
 * `key` is a SHA-256 hash, so no raw emails or IP addresses are stored.
 */
const authAttemptSchema = new Schema(
  {
    key: { type: String, required: true },
    count: { type: Number, required: true, min: 0 },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true, strict: true },
);

authAttemptSchema.index({ key: 1 }, { unique: true });
// MongoDB deletes each document once its window has ended.
authAttemptSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type AuthAttemptDocument = InferSchemaType<typeof authAttemptSchema>;

export const AuthAttempt: Model<AuthAttemptDocument> =
  (mongoose.models.AuthAttempt as Model<AuthAttemptDocument> | undefined) ??
  mongoose.model<AuthAttemptDocument>("AuthAttempt", authAttemptSchema);
