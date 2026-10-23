import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId, getSessionUser } from "@/lib/session";
import { serializeLink } from "@/lib/serialize";
import { ensureUrl, extractDomain, faviconForDomain, normalizeUrlStrict } from "@/lib/utils";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const userId = await requireUserId();
  if (!userId)
    return NextResponse.json({ error: "Silakan masuk terlebih dahulu." }, { status: 401 });
  const { id } = await params;
  const existing = await prisma.linkItem.findFirst({ where: { id, userId } });
  if (!existing)
    return NextResponse.json({ error: "Link tidak ditemukan." }, { status: 404 });
  try {
    const body = (await req.json()) as {
      click?: boolean;
      url?: string;
      title?: string;
      description?: string;
      image?: string;
      favicon?: string;
      categoryId?: string | null;
      tags?: string[];
      favorite?: boolean;
      force?: boolean;
    };

    // Mode khusus: naikkan counter akses
    if (body.click) {
      const link = await prisma.linkItem.update({
        where: { id },
        data: { clicks: { increment: 1 } },
      });
      return NextResponse.json({ link: serializeLink(link) });
    }

    const data: Record<string, unknown> = {};

    if (typeof body.url === "string" && body.url.trim()) {
      const url = ensureUrl(body.url);
      const normalizedUrl = normalizeUrlStrict(url);
      if (normalizedUrl !== existing.normalizedUrl && !body.force) {
        const dup = await prisma.linkItem.findFirst({
          where: { userId, normalizedUrl, NOT: { id } },
        });
        if (dup)
          return NextResponse.json(
            { error: "Link ini sudah pernah disimpan.", existing: serializeLink(dup) },
            { status: 409 }
          );
      }
      data.url = url;
      data.normalizedUrl = normalizedUrl;
      data.domain = extractDomain(url);
    }
    if (typeof body.title === "string") data.title = body.title.trim() || (data.domain as string) || existing.domain;
    if (typeof body.description === "string") data.description = body.description.trim();
    if (typeof body.image === "string") data.image = body.image;
    if (typeof body.favicon === "string" && body.favicon) data.favicon = body.favicon;
    if (!data.favicon && data.domain) data.favicon = faviconForDomain(data.domain as string);
    if (body.categoryId === null) data.categoryId = null;
    else if (typeof body.categoryId === "string" && body.categoryId) {
      const cat = await prisma.category.findFirst({ where: { id: body.categoryId, userId } });
      data.categoryId = cat ? cat.id : null;
    }
    if (Array.isArray(body.tags))
      data.tags = body.tags.map((t) => String(t).trim().toLowerCase()).filter(Boolean);
    if (typeof body.favorite === "boolean") data.favorite = body.favorite;

    const link = await prisma.linkItem.update({ where: { id }, data });
    return NextResponse.json({ link: serializeLink(link) });
  } catch {
    return NextResponse.json({ error: "Gagal mengubah link." }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  const me = await getSessionUser();
  if (!me)
    return NextResponse.json({ error: "Silakan masuk terlebih dahulu." }, { status: 401 });
  const { id } = await params;
  // Master boleh menghapus link milik user mana pun; user biasa hanya miliknya.
  const existing =
    me.role === "MASTER"
      ? await prisma.linkItem.findUnique({ where: { id } })
      : await prisma.linkItem.findFirst({ where: { id, userId: me.id } });
  if (!existing)
    return NextResponse.json({ error: "Link tidak ditemukan." }, { status: 404 });
  await prisma.linkItem.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
