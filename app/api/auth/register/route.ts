import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { SEED_CATEGORY_DEFS } from "@/lib/seed";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      name?: string;
      email?: string;
      password?: string;
    };
    const email = String(body.email ?? "").toLowerCase().trim();
    const name = String(body.name ?? "").trim();
    const password = String(body.password ?? "");

    if (!email || !email.includes("@") || !email.includes("."))
      return NextResponse.json({ error: "Email tidak valid. Periksa lagi alamat email Anda." }, { status: 400 });
    if (password.length < 8)
      return NextResponse.json({ error: "Kata sandi minimal 8 karakter." }, { status: 400 });

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists)
      return NextResponse.json(
        { error: "Email ini sudah terdaftar. Silakan masuk dengan akun tersebut." },
        { status: 409 }
      );

    // Akun Master pertama: email yang sama persis (case-insensitive) dengan
    // env MASTER_EMAIL langsung menjadi MASTER + APPROVED. Semua pendaftar
    // lain menjadi USER + PENDING (menunggu persetujuan Master).
    const masterEmail = (process.env.MASTER_EMAIL ?? "").toLowerCase().trim();
    const isMaster = masterEmail !== "" && email === masterEmail;
    const role = isMaster ? "MASTER" : "USER";
    const status = isMaster ? "APPROVED" : "PENDING";

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email,
        name: name || null,
        passwordHash,
        role,
        status,
        categories: {
          create: SEED_CATEGORY_DEFS.map((c) => ({ name: c.name, color: c.color })),
        },
      },
      select: { id: true, email: true, name: true, role: true, status: true },
    });

    const message = isMaster
      ? "Pendaftaran berhasil. Akun Master Anda sudah aktif — silakan masuk."
      : "Pendaftaran berhasil. Akun Anda menunggu persetujuan Master sebelum bisa masuk.";

    return NextResponse.json({ ok: true, user, status: user.status, message }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Gagal mendaftar. Silakan coba lagi." }, { status: 500 });
  }
}
