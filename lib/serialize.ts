import type { Category as DbCategory, LinkItem as DbLinkItem } from "@prisma/client";
import type { Category, LinkItem } from "./types";

/** Ubah baris Category dari database ke bentuk yang dipakai UI. */
export function serializeCategory(c: DbCategory): Category {
  return { id: c.id, name: c.name, color: c.color };
}

/** Ubah baris LinkItem dari database ke bentuk yang dipakai UI (tanggal ISO string). */
export function serializeLink(l: DbLinkItem): LinkItem {
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
    createdAt: l.createdAt.toISOString(),
    updatedAt: l.updatedAt.toISOString(),
  };
}
