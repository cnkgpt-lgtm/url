import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { ensureUrl, extractDomain, faviconForDomain, normalizeUrlStrict } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface ImportCategory {
  id?: string;
  name?: string;
  color?: string;
}

interface ImportLink {
  url?: string;
  title?: string;
  description?: string;
  image?: string;
  favicon?: string;
  categoryId?: string | null;
  categoryName?: string;
  tags?: string[];
  clicks?: number;
  favorite?: boolean;
  createdAt?: string;
}

/**
 * Migrasi arsip lokal (v1 localStorage / file ekspor JSON) ke akun user.
 * - Kategori dicocokkan berdasarkan nama; yang belum ada dibuat baru.
 * - Link duplikat (normalizedUrl sama untuk user ini) dilewati.
 */
export async function POST(req: Request) {
  const userId = await requireUserId();
  if (!userId)
    return NextResponse.json({ error: "Silakan masuk terlebih dahulu." }, { status: 401 });
  try {
    const body = (await req.json()) as {
      categories?: ImportCategory[];
      links?: ImportLink[];
    };
    const inCats = Array.isArray(body.categories) ? body.categories : [];
    const inLinks = Array.isArray(body.links) ? body.links : [];

    // Peta kategori yang sudah ada (nama lowercase -> id)
    const existingCats = await prisma.category.findMany({ where: { userId } });
    const catByName = new Map<string, string>();
    for (const c of existingCats) catByName.set(c.name.toLowerCase(), c.id);
    // Peta id lama (dari ekspor lokal) -> id server, lewat nama
    const oldIdToNewId = new Map<string, string>();

    let kategoriBaru = 0;
    for (const c of inCats) {
      const name = String(c.name ?? "").trim();
      if (!name) continue;
      const key = name.toLowerCase();
      let id = catByName.get(key);
      if (!id) {
        const created = await prisma.category.create({
          data: { name, color: String(c.color ?? "#64748b") || "#64748b", userId },
        });
        id = created.id;
        catByName.set(key, id);
        kategoriBaru++;
      }
      if (c.id) oldIdToNewId.set(String(c.id), id);
    }

    const existingLinks = await prisma.linkItem.findMany({
      where: { userId },
      select: { normalizedUrl: true },
    });
    const seen = new Set(existingLinks.map((l) => l.normalizedUrl));

    let ditambahkan = 0;
    let dilewati = 0;

    for (const raw of inLinks) {
      const rawUrl = String(raw.url ?? "").trim();
      if (!rawUrl) {
        dilewati++;
        continue;
      }
      const url = ensureUrl(rawUrl);
      const normalizedUrl = normalizeUrlStrict(url);
      if (seen.has(normalizedUrl)) {
        dilewati++;
        continue;
      }
      seen.add(normalizedUrl);
      const domain = extractDomain(url);

      let categoryId: string | null = null;
      if (raw.categoryName) {
        categoryId = catByName.get(String(raw.categoryName).toLowerCase()) ?? null;
      } else if (raw.categoryId) {
        categoryId = oldIdToNewId.get(String(raw.categoryId)) ?? null;
      }

      const createdAt = raw.createdAt && !isNaN(Date.parse(raw.createdAt)) ? new Date(raw.createdAt) : undefined;

      await prisma.linkItem.create({
        data: {
          userId,
          categoryId,
          url,
          normalizedUrl,
          title: String(raw.title ?? "").trim() || domain,
          description: String(raw.description ?? ""),
          image: String(raw.image ?? ""),
          favicon: String(raw.favicon ?? "") || faviconForDomain(domain),
          domain,
          tags: Array.isArray(raw.tags) ? raw.tags.map((t) => String(t).trim().toLowerCase()).filter(Boolean) : [],
          clicks: typeof raw.clicks === "number" ? raw.clicks : 0,
          favorite: !!raw.favorite,
          ...(createdAt ? { createdAt } : {}),
        },
      });
      ditambahkan++;
    }

    return NextResponse.json({ ok: true, ditambahkan, dilewati, kategoriBaru });
  } catch {
    return NextResponse.json({ error: "Gagal mengimpor data." }, { status: 500 });
  }
}
