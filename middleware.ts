import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

// Middleware berjalan di Edge Runtime -> pakai config yang edge-safe.
// Tidak ada rute halaman yang dikunci paksa di sini: halaman utama terbuka
// dan menampilkan ajakan masuk bila belum login. Perlindungan data
// ditegakkan di API (401 tanpa sesi).
export const { auth: middleware } = NextAuth(authConfig);

export const config = {
  matcher: ["/", "/login", "/register"],
};
