import type { NextAuthConfig } from "next-auth";

/**
 * Konfigurasi auth yang AMAN UNTUK EDGE RUNTIME (dipakai middleware).
 * JANGAN import bcryptjs / prisma / modul Node.js di sini.
 * providers dikosongkan: middleware hanya membaca sesi JWT (tidak butuh provider).
 */
export const authConfig: NextAuthConfig = {
  providers: [],
  trustHost: true,
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  callbacks: {
    async jwt({ token, user }) {
      const t = token as unknown as Record<string, unknown>;
      if (user?.id) t.uid = user.id;
      if (user) {
        const u = user as { role?: string; status?: string };
        if (u.role) t.role = u.role;
        if (u.status) t.status = u.status;
      }
      return token;
    },
    async session({ session, token }) {
      const t = token as unknown as { uid?: string; role?: string; status?: string };
      if (session.user) {
        if (t.uid) session.user.id = t.uid;
        if (t.role) session.user.role = t.role;
        if (t.status) session.user.status = t.status;
      }
      return session;
    },
  },
  pages: { signIn: "/login" },
};
