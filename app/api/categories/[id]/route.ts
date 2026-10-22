import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { serializeCategory } from "@/lib/serialize";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const userId = await requireUserId();
  if (!userId)
    return NextResponse.json({ error: "Silakan masuk terlebih dahulu." }, { status: 401 });
  const { id } = await params;
  const existing = await prisma.category.findFirst({ where: { id, userId } });
  if (!existing)
    return NextResponse.json({ error: "Kategori tidak ditemukan." }, { status: 404 });
  try {
    const body = (await req.json()) as { name?: string; color?: string };
    const data: { name?: string; color?: string } = {};
    if (typeof body.name === "string") {
      const name = body.name.trim();
      if (!name)
        return NextResponse.json({ error: "Nama kategori tidak boleh kosong." }, { status: 400 });
      const dup = await prisma.category.findUnique({
        where: { userId_name: { userId, name } },
      });
      if (dup && dup.id !== id)
        return NextResponse.json({ error: "Kategori dengan nama ini sudah ada." }, { status: 409 });
      data.name = name;
    }
    if (typeof body.color === "string" && body.color.trim()) data.color = body.color.trim();
    const cat = await prisma.category.update({ where: { id }, data });
    return NextResponse.json({ category: serializeCategory(cat) });
  } catch {
    return NextResponse.json({ error: "Gagal mengubah kategori." }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  const userId = await requireUserId();
  if (!userId)
    return NextResponse.json({ error: "Silakan masuk terlebih dahulu." }, { status: 401 });
  const { id } = await params;
  const existing = await prisma.category.findFirst({ where: { id, userId } });
  if (!existing)
    return NextResponse.json({ error: "Kategori tidak ditemukan." }, { status: 404 });
  // Link di dalam kategori ini otomatis menjadi tanpa kategori (onDelete: SetNull di skema).
  await prisma.category.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
