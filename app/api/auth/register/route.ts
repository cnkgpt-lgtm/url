import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { SEED_CATEGORY_DEFS } from "@/lib/seed";

export const dynamic = "force-dynamic";

const USERNAME_RE = /^[a-z0-9._-]{3,30}$/;

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      username?: string;
      name?: string;
      password?: string;
    };
    const username = String(body.username ?? "").toLowerCase().trim();
    const name = String(body.name ?? "").trim();
    const password = String(body.password ?? "");

    if (!USERNAME_RE.test(username))
      return NextResponse.json(
        {
          error:
            "Username tidak valid. Gunakan 3–30 karakter: huruf kecil, angka, titik, garis bawah, atau tanda hubung.",
        },
        { status: 400 }
      );
    if (password.length < 6)
      return NextResponse.json({ error: "Kata sandi minimal 6 karakter." }, { status: 400 });

    const exists = await prisma.user.findUnique({ where: { username } });
    if (exists)
      return NextResponse.json(
        { error: "Username sudah dipakai. Pilih username lain." },
        { status: 409 }
      );

    // Tidak ada lagi sistem persetujuan: semua akun baru langsung aktif
    // (status APPROVED). Username yang sama dengan env MASTER_USERNAME
    // menjadi role MASTER, pendaftar lain role USER.
    const masterUsername = (process.env.MASTER_USERNAME ?? "ahsan").toLowerCase().trim();
    const isMaster = masterUsername !== "" && username === masterUsername;
    const role = isMaster ? "MASTER" : "USER";
    const status = "APPROVED";

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        username,
        // Kolom email hanya warisan skema lama: diisi nilai internal dan
        // tidak pernah dipakai untuk login maupun ditampilkan di UI.
        email: `${username}@user.local`,
        name: name || username,
        passwordHash,
        role,
        status,
        categories: {
          create: SEED_CATEGORY_DEFS.map((c) => ({ name: c.name, color: c.color })),
        },
      },
      select: { id: true, username: true, name: true, role: true, status: true },
    });

    const message = "Pendaftaran berhasil. Akun Anda langsung aktif — silakan masuk.";

    return NextResponse.json({ ok: true, user, status: user.status, message }, { status: 201 });
  } catch (e) {
    // Balapan pendaftaran: username keburu diambil pendaftar lain.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")
      return NextResponse.json(
        { error: "Username sudah dipakai. Pilih username lain." },
        { status: 409 }
      );
    return NextResponse.json({ error: "Gagal mendaftar. Silakan coba lagi." }, { status: 500 });
  }
}
