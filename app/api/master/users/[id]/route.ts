import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

const ALLOWED_STATUS = ["APPROVED", "REJECTED", "PENDING"] as const;

/** Ubah status persetujuan user target (khusus Master). */
export async function PATCH(req: Request, { params }: Params) {
  const me = await getSessionUser();
  if (!me)
    return NextResponse.json({ error: "Silakan masuk terlebih dahulu." }, { status: 401 });
  if (me.role !== "MASTER")
    return NextResponse.json({ error: "Halaman ini khusus Master." }, { status: 403 });

  const { id } = await params;

  // Master tidak boleh mengubah status/role akunnya sendiri.
  if (id === me.id)
    return NextResponse.json(
      { error: "Anda tidak dapat mengubah status akun Anda sendiri." },
      { status: 400 }
    );

  try {
    const body = (await req.json()) as { status?: string };
    const status = String(body.status ?? "").toUpperCase();
    if (!ALLOWED_STATUS.includes(status as (typeof ALLOWED_STATUS)[number]))
      return NextResponse.json(
        { error: "Status tidak valid. Gunakan APPROVED, REJECTED, atau PENDING." },
        { status: 400 }
      );

    const target = await prisma.user.findUnique({ where: { id }, select: { id: true } });
    if (!target)
      return NextResponse.json({ error: "User tidak ditemukan." }, { status: 404 });

    const user = await prisma.user.update({
      where: { id },
      data: { status: status as (typeof ALLOWED_STATUS)[number] },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        _count: { select: { links: true } },
      },
    });

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        createdAt: user.createdAt.toISOString(),
        linkCount: user._count.links,
      },
    });
  } catch {
    return NextResponse.json({ error: "Gagal mengubah status user." }, { status: 500 });
  }
}
