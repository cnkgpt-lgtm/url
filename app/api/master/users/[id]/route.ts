import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/**
 * Hapus akun user beserta seluruh datanya (khusus Master).
 * Relasi Category & LinkItem ke User sudah onDelete: Cascade di schema,
 * tetapi penghapusan dilakukan eksplisit dalam transaksi agar urutannya
 * pasti: link → kategori → user.
 */
export async function DELETE(_req: Request, { params }: Params) {
  const me = await getSessionUser();
  if (!me)
    return NextResponse.json({ error: "Silakan masuk terlebih dahulu." }, { status: 401 });
  if (me.role !== "MASTER")
    return NextResponse.json({ error: "Halaman ini khusus Master." }, { status: 403 });

  const { id } = await params;

  // Master tidak boleh menghapus akunnya sendiri.
  if (id === me.id)
    return NextResponse.json(
      { error: "Anda tidak dapat menghapus akun Anda sendiri." },
      { status: 400 }
    );

  try {
    const target = await prisma.user.findUnique({ where: { id }, select: { id: true, email: true } });
    if (!target)
      return NextResponse.json({ error: "User tidak ditemukan." }, { status: 404 });

    await prisma.$transaction([
      prisma.linkItem.deleteMany({ where: { userId: id } }),
      prisma.category.deleteMany({ where: { userId: id } }),
      prisma.user.delete({ where: { id } }),
    ]);

    return NextResponse.json({ ok: true, deletedEmail: target.email });
  } catch {
    return NextResponse.json({ error: "Gagal menghapus user." }, { status: 500 });
  }
}
