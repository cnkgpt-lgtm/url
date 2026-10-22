import { auth } from "@/auth";

/** Kembalikan id user bila sudah login, atau null. */
export async function requireUserId(): Promise<string | null> {
  const session = await auth();
  const id = (session?.user as { id?: string } | undefined)?.id;
  return id ?? null;
}
