import "server-only";

import mongoose, { Schema } from "mongoose";
import type { InferSchemaType, Model } from "mongoose";

import { isHttpUrl, LINK_TITLE_MAX_LENGTH, LINK_URL_MAX_LENGTH } from "@/lib/validation/link";

/**
 * A link on a user's profile. Owned by `userId`: every query filters by it (Doc/database.md §7).
 * Rules match `src/lib/validation/link.ts`, which validates input first.
 */
const linkSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: LINK_TITLE_MAX_LENGTH,
    },
    url: {
      type: String,
      required: true,
      trim: true,
      maxlength: LINK_URL_MAX_LENGTH,
      validate: { validator: isHttpUrl, message: "URL must be an http or https address" },
    },
    // Shown on the profile only when true.
    isActive: { type: Boolean, required: true, default: true },
    // Click tracking isn't built yet; the dashboard shows the stored count.
    clicks: { type: Number, required: true, default: 0, min: 0 },
  },
  { timestamps: true, strict: true },
);

// The dashboard lists a user's links newest first.
linkSchema.index({ userId: 1, createdAt: -1 });

export type LinkDocument = InferSchemaType<typeof linkSchema>;

export const Link: Model<LinkDocument> =
  (mongoose.models.Link as Model<LinkDocument> | undefined) ?? mongoose.model<LinkDocument>("Link", linkSchema);
