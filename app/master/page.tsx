"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import NextLink from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { formatDateID } from "@/lib/utils";

interface MasterUser {
  id: string;
  name: string | null;
  email: string;
  role: "MASTER" | "USER";
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
  linkCount: number;
}

type TabKey = "all" | "PENDING" | "APPROVED" | "REJECTED";

const STATUS_LABEL: Record<MasterUser["status"], string> = {
  PENDING: "Menunggu",
  APPROVED: "Disetujui",
  REJECTED: "Ditolak",
};

const STATUS_BADGE: Record<MasterUser["status"], string> = {
  PENDING: "bg-amber-100 text-amber-800 border border-amber-300",
  APPROVED: "bg-emerald-100 text-emerald-800 border border-emerald-300",
  REJECTED: "bg-red-100 text-red-700 border border-red-300",
};

const TABS: { key: TabKey; label: string }[] = [
  { key: "all", label: "Semua" },
  { key: "PENDING", label: "Menunggu" },
  { key: "APPROVED", label: "Disetujui" },
  { key: "REJECTED", label: "Ditolak" },
];

export default function MasterPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const role = (session?.user as { role?: string } | undefined)?.role;
  const myId = (session?.user as { id?: string } | undefined)?.id;

  const [users, setUsers] = useState<MasterUser[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [tab, setTab] = useState<TabKey>("all");
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

  const stats = useMemo(() => {
    return {
      total: users.length,
      pending: users.filter((u) => u.status === "PENDING").length,
      approved: users.filter((u) => u.status === "APPROVED").length,
      rejected: users.filter((u) => u.status === "REJECTED").length,
    };
  }, [users]);

  const visible = useMemo(
    () => (tab === "all" ? users : users.filter((u) => u.status === tab)),
    [users, tab]
  );

  async function setStatus(u: MasterUser, next: MasterUser["status"]) {
    if (next === "REJECTED") {
      const label = u.status === "APPROVED" ? "Cabut akses" : "Tolak pendaftaran";
      const ok = window.confirm(
        `${label} untuk ${u.name || u.email} (${u.email})?\n\n` +
          (u.status === "APPROVED"
            ? "User ini tidak akan bisa masuk lagi sampai Anda menyetujuinya kembali."
            : "User ini tidak akan bisa masuk.")
      );
      if (!ok) return;
    }
    setBusyId(u.id);
    setActionMsg("");
    try {
      const res = await fetch(`/api/master/users/${u.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Gagal mengubah status.");
      setUsers((prev) => prev.map((x) => (x.id === u.id ? (j.user as MasterUser) : x)));
      setActionMsg(
        next === "APPROVED"
          ? `✅ ${u.email} disetujui — sekarang bisa masuk.`
          : next === "REJECTED"
            ? `🚫 ${u.email} ditolak/dicabut aksesnya.`
            : `↩️ ${u.email} dikembalikan ke status menunggu.`
      );
    } catch (e) {
      setActionMsg(e instanceof Error ? e.message : "Gagal mengubah status.");
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
            Halaman Persetujuan User hanya bisa dibuka oleh akun <strong>Master</strong>.
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
              <h1 className="text-lg font-bold leading-tight text-slate-900">Persetujuan User</h1>
              <p className="text-xs text-slate-500">Kelola pendaftaran akun Accank Arsip Link</p>
            </div>
          </div>
          <div className="ml-auto">
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
        <section className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Total User</p>
            <p className="mt-1 text-3xl font-bold text-slate-900">{stats.total}</p>
          </div>
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-amber-700">Menunggu Persetujuan</p>
            <p className="mt-1 text-3xl font-bold text-amber-900">{stats.pending}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Disetujui</p>
            <p className="mt-1 text-3xl font-bold text-slate-900">{stats.approved}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Ditolak</p>
            <p className="mt-1 text-3xl font-bold text-slate-900">{stats.rejected}</p>
          </div>
        </section>

        {/* Filter tab */}
        <div className="mb-4 flex flex-wrap gap-2">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium ${
                tab === t.key ? "bg-slate-900 text-white" : "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50"
              }`}
            >
              {t.label}
              {t.key === "PENDING" && stats.pending > 0 ? ` (${stats.pending})` : ""}
            </button>
          ))}
        </div>

        {/* Daftar user */}
        {!loaded ? (
          <p className="text-slate-500">Memuat daftar user…</p>
        ) : visible.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
            <div className="text-4xl">👥</div>
            <p className="mt-3 font-semibold text-slate-900">
              {tab === "all" ? "Belum ada user terdaftar" : `Tidak ada user dengan status "${STATUS_LABEL[tab as MasterUser["status"]]}"`}
            </p>
            <p className="mt-1 text-sm text-slate-500">Pendaftar baru akan muncul di sini untuk disetujui.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white shadow-sm">
            {visible.map((u) => {
              const isSelf = u.id === myId;
              return (
                <div key={u.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-slate-900">{u.name || "(tanpa nama)"}</p>
                      {u.role === "MASTER" && (
                        <span className="rounded-full border border-amber-300 bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">Master</span>
                      )}
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_BADGE[u.status]}`}>
                        {STATUS_LABEL[u.status]}
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
                      {(u.status === "PENDING" || u.status === "REJECTED") && (
                        <button
                          onClick={() => setStatus(u, "APPROVED")}
                          disabled={busyId === u.id}
                          className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                        >
                          {busyId === u.id ? "…" : "Setujui"}
                        </button>
                      )}
                      {u.status === "PENDING" && (
                        <button
                          onClick={() => setStatus(u, "REJECTED")}
                          disabled={busyId === u.id}
                          className="rounded-lg border border-red-300 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
                        >
                          Tolak
                        </button>
                      )}
                      {u.status === "APPROVED" && (
                        <button
                          onClick={() => setStatus(u, "REJECTED")}
                          disabled={busyId === u.id}
                          className="rounded-lg border border-red-300 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
                        >
                          Tolak/Cabut
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <p className="mt-6 text-center text-xs text-slate-400">
          User berstatus <strong>Menunggu</strong> dan <strong>Ditolak</strong> tidak bisa masuk sampai Anda menyetujuinya.
        </p>
      </div>
    </main>
  );
}
