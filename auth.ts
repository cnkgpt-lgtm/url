import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { authConfig } from "./auth.config";

/**
 * Error login khusus agar halaman /login bisa membedakan alasan penolakan.
 * Auth.js meneruskan `code` ini ke klien (field `code` pada hasil signIn
 * redirect:false, atau parameter URL ?code= pada alur redirect).
 * CATATAN: melempar Error biasa di authorize() dianggap Auth.js sebagai
 * error "Configuration" — wajib memakai subclass CredentialsSignin ini.
 */
class PendingApprovalError extends CredentialsSignin {
  code = "PENDING_APPROVAL";
}

class AccountRejectedError extends CredentialsSignin {
  code = "ACCOUNT_REJECTED";
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Kata sandi", type: "password" },
      },
      async authorize(creds) {
        const email = String(creds?.email ?? "").toLowerCase().trim();
        const password = String(creds?.password ?? "");
        if (!email || !password) return null;
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return null;
        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;
        // Gerbang persetujuan: akun belum disetujui / ditolak Master tidak bisa
        // masuk. Kode error kustom ini diteruskan NextAuth ke klien (field
        // `code` pada hasil signIn / parameter URL) dan diterjemahkan halaman
        // /login menjadi pesan Bahasa Indonesia.
        if (user.status === "PENDING") throw new PendingApprovalError();
        if (user.status === "REJECTED") throw new AccountRejectedError();
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          status: user.status,
        };
      },
    }),
  ],
});
