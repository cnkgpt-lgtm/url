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
      if (user?.id) (token as unknown as Record<string, unknown>).uid = user.id;
      return token;
    },
    async session({ session, token }) {
      const uid = (token as unknown as Record<string, unknown>).uid as string | undefined;
      if (uid) (session.user as unknown as Record<string, unknown>).id = uid;
      return session;
    },
  },
  pages: { signIn: "/login" },
};
