import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

/**
 * Daftar semua user untuk ditinjau Master.
 * Urutan: PENDING lebih dulu (urutan enum di Postgres mengikuti deklarasi:
 * PENDING, APPROVED, REJECTED), lalu tanggal daftar terbaru.
 */
export async function GET() {
  const me = await getSessionUser();
  if (!me)
    return NextResponse.json({ error: "Silakan masuk terlebih dahulu." }, { status: 401 });
  if (me.role !== "MASTER")
    return NextResponse.json({ error: "Halaman ini khusus Master." }, { status: 403 });

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      createdAt: true,
      _count: { select: { links: true } },
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({
    users: users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      status: u.status,
      createdAt: u.createdAt.toISOString(),
      linkCount: u._count.links,
    })),
  });
}
