"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

type Msg = { kind: "error" | "ok"; text: string };

export default function GantiSandiPage() {
  const router = useRouter();
  const { status } = useSession();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [msg, setMsg] = useState<Msg | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  // Halaman ini khusus user yang sudah masuk.
  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login?callbackUrl=/ganti-sandi");
  }, [status, router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (newPassword.length < 6) {
      setMsg({ kind: "error", text: "Kata sandi baru minimal 6 karakter." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setMsg({ kind: "error", text: "Konfirmasi kata sandi baru tidak sama." });
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/account/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = (await res.json().catch(() => ({}))) as { message?: string; error?: string };
      if (!res.ok) {
        setMsg({ kind: "error", text: data.error || "Gagal mengganti kata sandi. Silakan coba lagi." });
        return;
      }
      setDone(true);
      setMsg({ kind: "ok", text: data.message || "Kata sandi berhasil diganti." });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      setMsg({ kind: "error", text: "Tidak dapat menghubungi server. Periksa koneksi Anda lalu coba lagi." });
    } finally {
      setBusy(false);
    }
  }

  if (status === "loading" || status === "unauthenticated") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
        <p className="text-slate-500">Memuat…</p>
      </main>
    );
  }

  const inputCls =
    "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100";

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-600 text-xl text-white">🔗</div>
          <div>
            <h1 className="text-lg font-bold leading-tight text-slate-900">Accank Arsip Link</h1>
            <p className="text-xs text-slate-500">Ganti kata sandi akun Anda</p>
          </div>
        </div>

        <h2 className="mt-6 text-xl font-bold text-slate-900">Ganti Kata Sandi</h2>
        <p className="mt-1 text-sm text-slate-500">
          Masukkan kata sandi lama Anda, lalu kata sandi baru (minimal 6 karakter).
        </p>

        {msg && (
          <div
            className={
              "mt-4 rounded-lg border px-3 py-2 text-sm " +
              (msg.kind === "error"
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-emerald-200 bg-emerald-50 text-emerald-800")
            }
          >
            {msg.text}
          </div>
        )}

        {done ? (
          <div className="mt-6">
            <Link
              href="/"
              className="block w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-emerald-700"
            >
              Kembali ke Halaman Utama
            </Link>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-5 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">Kata sandi lama</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="Kata sandi Anda saat ini"
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Kata sandi baru (min. 6 karakter)</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
                placeholder="Kata sandi baru"
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Konfirmasi kata sandi baru</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
                placeholder="Ulangi kata sandi baru"
                className={inputCls}
              />
            </div>
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {busy ? "Menyimpan…" : "Simpan Kata Sandi Baru"}
            </button>
          </form>
        )}

        <p className="mt-5 text-center text-xs text-slate-400">
          <Link href="/" className="hover:underline">← Kembali ke halaman utama</Link>
        </p>
      </div>
    </main>
  );
}
