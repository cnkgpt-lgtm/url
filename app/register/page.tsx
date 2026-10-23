"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      const r = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Gagal mendaftar.");
      // Akun baru TIDAK langsung masuk: user biasa berstatus PENDING dan harus
      // disetujui Master dulu. Arahkan ke /login dengan pesan yang sesuai.
      const isMaster = j.user?.role === "MASTER";
      router.push(`/login?notice=${isMaster ? "master" : "pending"}`);
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Gagal mendaftar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-600 text-xl text-white">🔗</div>
          <div>
            <h1 className="text-lg font-bold leading-tight text-slate-900">Accank Arsip Link</h1>
            <p className="text-xs text-slate-500">Buat akun, arsip sinkron di semua perangkat</p>
          </div>
        </div>

        <h2 className="mt-6 text-xl font-bold text-slate-900">Daftar Akun Baru</h2>
        <p className="mt-1 text-sm text-slate-500">
          Gratis. Anda mendapat 5 kategori awal (Umum, Pekerjaan, Belajar, Referensi, Hiburan).
          Akun baru <strong>menunggu persetujuan Master</strong> sebelum bisa masuk.
        </p>

        {err && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>
        )}

        <form onSubmit={submit} className="mt-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Nama</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              placeholder="Nama Anda"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="nama@email.com"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Kata sandi (min. 8 karakter)</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              placeholder="Buat kata sandi yang kuat"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            />
          </div>
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {busy ? "Mendaftar…" : "Daftar"}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-slate-500">
          Sudah punya akun?{" "}
          <Link href="/login" className="font-semibold text-emerald-700 hover:underline">
            Masuk di sini
          </Link>
        </p>
        <p className="mt-3 text-center text-xs text-slate-400">
          <Link href="/" className="hover:underline">← Kembali ke halaman utama</Link>
        </p>
      </div>
    </main>
  );
}
