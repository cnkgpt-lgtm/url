import { auth } from "@/auth";

export interface SessionUser {
  id: string;
  role: string;
  status: string;
}

/** Kembalikan id user bila sudah login, atau null. */
export async function requireUserId(): Promise<string | null> {
  const session = await auth();
  const id = (session?.user as { id?: string } | undefined)?.id;
  return id ?? null;
}

/** Kembalikan ringkasan user dari sesi (termasuk role & status), atau null bila belum login. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth();
  const u = session?.user as
    | { id?: string; role?: string; status?: string }
    | undefined;
  if (!u?.id) return null;
  return { id: u.id, role: u.role ?? "USER", status: u.status ?? "APPROVED" };
}

/** Kembalikan user sesi HANYA bila role-nya MASTER, selain itu null. */
export async function requireMaster(): Promise<SessionUser | null> {
  const me = await getSessionUser();
  if (!me || me.role !== "MASTER") return null;
  return me;
}
