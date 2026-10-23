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
    if (password.length < 6)
      return NextResponse.json({ error: "Kata sandi minimal 6 karakter." }, { status: 400 });

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists)
      return NextResponse.json(
        { error: "Email ini sudah terdaftar. Silakan masuk dengan akun tersebut." },
        { status: 409 }
      );

    // Tidak ada lagi sistem persetujuan: semua akun baru langsung aktif
    // (status APPROVED). Email yang sama persis (case-insensitive) dengan
    // env MASTER_EMAIL menjadi role MASTER, pendaftar lain role USER.
    const masterEmail = (process.env.MASTER_EMAIL ?? "").toLowerCase().trim();
    const isMaster = masterEmail !== "" && email === masterEmail;
    const role = isMaster ? "MASTER" : "USER";
    const status = "APPROVED";

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

    const message = "Pendaftaran berhasil. Akun Anda langsung aktif — silakan masuk.";

    return NextResponse.json({ ok: true, user, status: user.status, message }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Gagal mendaftar. Silakan coba lagi." }, { status: 500 });
  }
}
