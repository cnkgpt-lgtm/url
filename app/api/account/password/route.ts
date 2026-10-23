import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

export const dynamic = "force-dynamic";

/**
 * Ganti kata sandi user yang sedang masuk.
 * Body: { currentPassword, newPassword }
 * - Wajib sesi (401 bila belum masuk).
 * - Kata sandi lama diverifikasi dengan bcrypt compare.
 * - Kata sandi baru minimal 6 karakter.
 */
export async function POST(req: Request) {
  const userId = await requireUserId();
  if (!userId)
    return NextResponse.json({ error: "Silakan masuk terlebih dahulu." }, { status: 401 });

  try {
    const body = (await req.json()) as {
      currentPassword?: string;
      newPassword?: string;
    };
    const currentPassword = String(body.currentPassword ?? "");
    const newPassword = String(body.newPassword ?? "");

    if (newPassword.length < 6)
      return NextResponse.json({ error: "Kata sandi baru minimal 6 karakter." }, { status: 400 });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true },
    });
    if (!user)
      return NextResponse.json({ error: "Akun tidak ditemukan." }, { status: 404 });

    const ok = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok)
      return NextResponse.json({ error: "Kata sandi lama salah." }, { status: 400 });

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { id: userId }, data: { passwordHash } });

    return NextResponse.json({ ok: true, message: "Kata sandi berhasil diganti." });
  } catch {
    return NextResponse.json({ error: "Gagal mengganti kata sandi. Silakan coba lagi." }, { status: 500 });
  }
}
