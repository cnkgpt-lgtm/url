import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser, requireUserId } from "@/lib/session";
import { serializeLink } from "@/lib/serialize";
import { ensureUrl, extractDomain, faviconForDomain, normalizeUrlStrict } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET() {
  const me = await getSessionUser();
  if (!me)
    return NextResponse.json({ error: "Silakan masuk terlebih dahulu." }, { status: 401 });
  // Master melihat link SEMUA user; User biasa hanya miliknya sendiri.
  // Keduanya menyertakan pemilik tiap link (ownerName/ownerUsername).
  const include = { user: { select: { name: true, username: true } } } as const;
  const orderBy = { createdAt: "desc" } as const;
  const links =
    me.role === "MASTER"
      ? await prisma.linkItem.findMany({ orderBy, include })
      : await prisma.linkItem.findMany({ where: { userId: me.id }, orderBy, include });
  return NextResponse.json({ links: links.map(serializeLink) });
}

interface LinkBody {
  url?: string;
  title?: string;
  description?: string;
  image?: string;
  favicon?: string;
  categoryId?: string | null;
  tags?: string[];
  force?: boolean;
}

export async function POST(req: Request) {
  const userId = await requireUserId();
  if (!userId)
    return NextResponse.json({ error: "Silakan masuk terlebih dahulu." }, { status: 401 });
  try {
    const body = (await req.json()) as LinkBody;
    const rawUrl = String(body.url ?? "").trim();
    if (!rawUrl)
      return NextResponse.json({ error: "URL wajib diisi." }, { status: 400 });
    const url = ensureUrl(rawUrl);
    const normalizedUrl = normalizeUrlStrict(url);
    const domain = extractDomain(url);

    if (!body.force) {
      const dup = await prisma.linkItem.findFirst({ where: { userId, normalizedUrl } });
      if (dup)
        return NextResponse.json(
          {
            error: "Link ini sudah pernah disimpan.",
            existing: serializeLink(dup),
          },
          { status: 409 }
        );
    }

    let categoryId: string | null = null;
    if (body.categoryId) {
      const cat = await prisma.category.findFirst({ where: { id: body.categoryId, userId } });
      if (cat) categoryId = cat.id;
    }

    const tags = Array.isArray(body.tags)
      ? body.tags.map((t) => String(t).trim().toLowerCase()).filter(Boolean)
      : [];

    const link = await prisma.linkItem.create({
      data: {
        userId,
        categoryId,
        url,
        normalizedUrl,
        title: String(body.title ?? "").trim() || domain,
        description: String(body.description ?? "").trim(),
        image: String(body.image ?? ""),
        favicon: String(body.favicon ?? "") || faviconForDomain(domain),
        domain,
        tags,
      },
    });
    return NextResponse.json({ link: serializeLink(link) }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Gagal menyimpan link." }, { status: 500 });
  }
}
