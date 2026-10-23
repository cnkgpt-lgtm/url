import type { Category as DbCategory, LinkItem as DbLinkItem } from "@prisma/client";
import type { Category, LinkItem } from "./types";

/** Ubah baris Category dari database ke bentuk yang dipakai UI. */
export function serializeCategory(c: DbCategory): Category {
  return { id: c.id, name: c.name, color: c.color };
}

type DbLinkWithOwner = DbLinkItem & {
  user?: { name: string | null; username: string | null } | null;
};

/** Ubah baris LinkItem dari database ke bentuk yang dipakai UI (tanggal ISO string).
 *  Bila relasi `user` ikut dimuat, sertakan juga pemiliknya (ownerName/ownerUsername). */
export function serializeLink(l: DbLinkWithOwner): LinkItem {
  return {
    id: l.id,
    url: l.url,
    normalizedUrl: l.normalizedUrl,
    title: l.title,
    description: l.description,
    image: l.image || undefined,
    favicon: l.favicon,
    domain: l.domain,
    categoryId: l.categoryId,
    tags: l.tags,
    clicks: l.clicks,
    favorite: l.favorite,
    ownerName: l.user ? l.user.name : undefined,
    ownerUsername: l.user ? l.user.username : undefined,
    createdAt: l.createdAt.toISOString(),
    updatedAt: l.updatedAt.toISOString(),
  };
}
