/**
 * Backfill username untuk akun lama (pra-login-username).
 *
 * Dijalankan saat build di Vercel (lihat vercel.json → buildCommand),
 * SETELAH `prisma db push` membuat kolom `username`.
 *
 * Idempoten: hanya mengisi user yang username-nya masih null, dicocokkan
 * lewat kolom email warisan akun lama. Kegagalan TIDAK menggagalkan build.
 */
import { PrismaClient } from "@prisma/client";

const BACKFILLS = [
  { email: "master@accank.id", username: "ahsan" },
  { email: "akademik@unibos.ac.id", username: "akademik" },
];

async function main() {
  const prisma = new PrismaClient();
  try {
    for (const { email, username } of BACKFILLS) {
      try {
        const res = await prisma.user.updateMany({
          where: { email, username: null },
          data: { username },
        });
        if (res.count > 0) {
          console.log(`[backfill-usernames] ${email} → username "${username}" (${res.count} baris)`);
        } else {
          console.log(`[backfill-usernames] ${email}: tidak ada yang diisi (sudah ada username / akun tidak ditemukan)`);
        }
      } catch (err) {
        // Mis. username sudah dipakai akun lain — catat saja, jangan gagalkan build.
        console.error(`[backfill-usernames] Gagal mengisi username untuk ${email}:`, err);
      }
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("[backfill-usernames] Gagal (diabaikan agar build tetap lanjut):", err);
  process.exit(0);
});
