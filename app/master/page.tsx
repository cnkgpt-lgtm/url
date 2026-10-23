"use client";

import { useCallback, useEffect, useState } from "react";
import NextLink from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { formatDateID } from "@/lib/utils";

interface MasterUser {
  id: string;
  name: string | null;
  email: string;
  role: "MASTER" | "USER";
  status?: string;
  createdAt: string;
  linkCount: number;
}

export default function MasterPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const role = (session?.user as { role?: string } | undefined)?.role;
  const myId = (session?.user as { id?: string } | undefined)?.id;

  const [users, setUsers] = useState<MasterUser[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login?callbackUrl=/master");
  }, [status, router]);

  const loadUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/master/users");
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Gagal memuat daftar user.");
      setUsers(Array.isArray(j.users) ? j.users : []);
      setLoadError("");
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Gagal memuat daftar user.");
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (role === "MASTER") loadUsers();
  }, [role, loadUsers]);

  async function deleteUser(u: MasterUser) {
    const ok = window.confirm(
      `Hapus akun ${u.name || u.email} (${u.email})?\n\n` +
        `Seluruh arsip link (${u.linkCount} link) dan kategori milik akun ini akan ikut terhapus dan tidak bisa dikembalikan.`
    );
    if (!ok) return;
    setBusyId(u.id);
    setActionMsg("");
    try {
      const res = await fetch(`/api/master/users/${u.id}`, { method: "DELETE" });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Gagal menghapus user.");
      setUsers((prev) => prev.filter((x) => x.id !== u.id));
      setActionMsg(`🗑️ Akun ${u.email} beserta datanya sudah dihapus.`);
    } catch (e) {
      setActionMsg(e instanceof Error ? e.message : "Gagal menghapus user.");
    } finally {
      setBusyId(null);
    }
  }

  if (status === "loading") {
    return (
      <main className="mx-auto max-w-5xl px-4 py-10">
        <p className="text-slate-500">Memuat halaman Master…</p>
      </main>
    );
  }

  if (!session?.user) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-10">
        <p className="text-slate-500">Anda belum masuk. Mengalihkan ke halaman masuk…</p>
      </main>
    );
  }

  if (role !== "MASTER") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
        <div className="w-full max-w-md rounded-2xl border border-red-200 bg-white p-6 text-center shadow-sm">
          <div className="text-4xl">⛔</div>
          <h1 className="mt-3 text-lg font-bold text-slate-900">Akses Ditolak</h1>
          <p className="mt-2 text-sm text-slate-600">
            Halaman Kelola User hanya bisa dibuka oleh akun <strong>Master</strong>.
          </p>
          <NextLink
            href="/"
            className="mt-5 inline-block rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            ← Kembali ke Arsip
          </NextLink>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white/90">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-xl text-white">🛡️</div>
            <div>
              <h1 className="text-lg font-bold leading-tight text-slate-900">Kelola User</h1>
              <p className="text-xs text-slate-500">Daftar akun terdaftar di Accank Arsip Link</p>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <NextLink href="/ganti-sandi" className="rounded-lg px-2 py-2 text-sm font-medium text-slate-500 hover:text-emerald-700 hover:underline">
              Ganti Sandi
            </NextLink>
            <NextLink href="/" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50">
              ← Kembali ke Arsip
            </NextLink>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        {loadError && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{loadError}</div>
        )}
        {actionMsg && (
          <div className="mb-4 flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            <span>{actionMsg}</span>
            <button onClick={() => setActionMsg("")} className="font-bold">✕</button>
          </div>
        )}

        {/* Ringkasan */}
        <section className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Total User</p>
            <p className="mt-1 text-3xl font-bold text-slate-900">{users.length}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Master</p>
            <p className="mt-1 text-3xl font-bold text-slate-900">{users.filter((u) => u.role === "MASTER").length}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">User Biasa</p>
            <p className="mt-1 text-3xl font-bold text-slate-900">{users.filter((u) => u.role === "USER").length}</p>
          </div>
        </section>

        {/* Daftar user */}
        {!loaded ? (
          <p className="text-slate-500">Memuat daftar user…</p>
        ) : users.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
            <div className="text-4xl">👥</div>
            <p className="mt-3 font-semibold text-slate-900">Belum ada user terdaftar</p>
            <p className="mt-1 text-sm text-slate-500">Akun yang mendaftar akan muncul di sini.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white shadow-sm">
            {users.map((u) => {
              const isSelf = u.id === myId;
              return (
                <div key={u.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-slate-900">{u.name || "(tanpa nama)"}</p>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          u.role === "MASTER"
                            ? "border border-amber-300 bg-amber-100 text-amber-800"
                            : "border border-slate-200 bg-slate-100 text-slate-600"
                        }`}
                      >
                        {u.role === "MASTER" ? "Master" : "User"}
                      </span>
                      {isSelf && <span className="text-[11px] font-medium text-slate-400">(akun Anda)</span>}
                    </div>
                    <p className="truncate text-sm text-slate-600">{u.email}</p>
                    <p className="text-xs text-slate-400">
                      Daftar: {formatDateID(u.createdAt)} • {u.linkCount} link tersimpan
                    </p>
                  </div>
                  {!isSelf && (
                    <div className="flex shrink-0 gap-2">
                      <button
                        onClick={() => deleteUser(u)}
                        disabled={busyId === u.id}
                        className="rounded-lg border border-red-300 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
                      >
                        {busyId === u.id ? "Menghapus…" : "Hapus"}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <p className="mt-6 text-center text-xs text-slate-400">
          Pendaftaran akun baru langsung aktif — tidak ada lagi persetujuan. Gunakan tombol <strong>Hapus</strong> untuk
          menghapus akun beserta seluruh arsipnya.
        </p>
      </div>
    </main>
  );
}
