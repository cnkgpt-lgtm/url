import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { serializeCategory } from "@/lib/serialize";

export const dynamic = "force-dynamic";

export async function GET() {
  const userId = await requireUserId();
  if (!userId)
    return NextResponse.json({ error: "Silakan masuk terlebih dahulu." }, { status: 401 });
  const cats = await prisma.category.findMany({
    where: { userId },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ categories: cats.map(serializeCategory) });
}

export async function POST(req: Request) {
  const userId = await requireUserId();
  if (!userId)
    return NextResponse.json({ error: "Silakan masuk terlebih dahulu." }, { status: 401 });
  try {
    const body = (await req.json()) as { name?: string; color?: string };
    const name = String(body.name ?? "").trim();
    const color = String(body.color ?? "#64748b").trim() || "#64748b";
    if (!name)
      return NextResponse.json({ error: "Nama kategori wajib diisi." }, { status: 400 });
    const exists = await prisma.category.findUnique({
      where: { userId_name: { userId, name } },
    });
    if (exists)
      return NextResponse.json({ error: "Kategori dengan nama ini sudah ada." }, { status: 409 });
    const cat = await prisma.category.create({ data: { name, color, userId } });
    return NextResponse.json({ category: serializeCategory(cat) }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Gagal menambah kategori." }, { status: 500 });
  }
}
