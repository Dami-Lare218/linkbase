import "server-only";

import { connectToDatabase } from "@/lib/db/connect";
import { Link } from "@/lib/db/models/link";
import { User } from "@/lib/db/models/user";
import type { CreateLinkInput } from "@/lib/validation/link";
import { isBlobAvatarUrl } from "@/lib/validation/profile-picture";

import type { DashboardLink } from "./display";

/**
 * Link data access. Every function takes the session user's id and puts it in the query
 * filter, so a user can only ever read or change their own links (Doc/database.md §7).
 * Pass validated input only (`src/lib/validation/link.ts`).
 */

export type LinkWriteResult = "ok" | "not-found";

export type DashboardData = {
  links: DashboardLink[];
  showFooter: boolean;
  /** Profile picture URL, or null. */
  image: string | null;
};

/** The user's links (newest first), footer setting and picture URL, as plain objects. */
export async function getDashboardData(userId: string): Promise<DashboardData> {
  await connectToDatabase();
  const [links, user] = await Promise.all([
    Link.find({ userId }).sort({ createdAt: -1 }).select("title url isActive clicks").lean(),
    User.findById(userId).select("showFooter image").lean(),
  ]);

  return {
    links: links.map((link) => ({
      id: link._id.toString(),
      title: link.title,
      url: link.url,
      isActive: link.isActive,
      clicks: link.clicks,
    })),
    showFooter: user?.showFooter ?? true,
    image: isBlobAvatarUrl(user?.image) ? user.image : null,
  };
}

/** Creates the link and returns it as the dashboard shows it. */
export async function createLink(userId: string, input: CreateLinkInput): Promise<DashboardLink> {
  await connectToDatabase();
  // Built from validated fields only; userId comes from the session, never from input.
  const link = await Link.create({ userId, title: input.title, url: input.url });
  return { id: link._id.toString(), title: link.title, url: link.url, isActive: link.isActive, clicks: link.clicks };
}

export async function updateLink(userId: string, id: string, input: CreateLinkInput): Promise<LinkWriteResult> {
  await connectToDatabase();
  const result = await Link.updateOne(
    { _id: id, userId },
    { $set: { title: input.title, url: input.url } },
    { runValidators: true },
  );
  return result.matchedCount === 0 ? "not-found" : "ok";
}

export async function deleteLink(userId: string, id: string): Promise<LinkWriteResult> {
  await connectToDatabase();
  const result = await Link.deleteOne({ _id: id, userId });
  return result.deletedCount === 0 ? "not-found" : "ok";
}

export async function setLinkActive(userId: string, id: string, isActive: boolean): Promise<LinkWriteResult> {
  await connectToDatabase();
  const result = await Link.updateOne({ _id: id, userId }, { $set: { isActive } });
  return result.matchedCount === 0 ? "not-found" : "ok";
}

export async function setShowFooter(userId: string, showFooter: boolean): Promise<void> {
  await connectToDatabase();
  await User.updateOne({ _id: userId }, { $set: { showFooter } });
}
