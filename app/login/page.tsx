"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";

type Msg = { kind: "error" | "warn" | "ok"; text: string };

function LoginForm() {
  const router = useRouter();
  const sp = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<Msg | null>(null);
  const [busy, setBusy] = useState(false);

  // Pesan dari URL: ?notice=aktif (setelah pendaftaran berhasil dari
  // halaman /register — akun langsung aktif, tanpa persetujuan).
  const paramMsg = useMemo<Msg | null>(() => {
    if (sp.get("notice") === "aktif")
      return { kind: "ok", text: "Pendaftaran berhasil. Akun Anda langsung aktif — silakan masuk." };
    return null;
  }, [sp]);

  const shown = msg ?? paramMsg;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setBusy(true);
    const res = await signIn("credentials", { username, password, redirect: false });
    setBusy(false);
    if (res?.error) {
      setMsg({ kind: "error", text: "Username atau kata sandi salah. Silakan coba lagi." });
      return;
    }
    router.push(sp.get("callbackUrl") || "/");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-600 text-xl text-white">🔗</div>
          <div>
            <h1 className="text-lg font-bold leading-tight text-slate-900">Accank Arsip Link</h1>
            <p className="text-xs text-slate-500">Masuk untuk membuka arsip link Anda</p>
          </div>
        </div>

        <h2 className="mt-6 text-xl font-bold text-slate-900">Masuk</h2>
        <p className="mt-1 text-sm text-slate-500">
          Arsip Anda tersimpan per akun — bisa dibuka dari HP, laptop, atau perangkat apa pun.
        </p>

        {shown && (
          <div
            className={
              "mt-4 rounded-lg border px-3 py-2 text-sm " +
              (shown.kind === "error"
                ? "border-red-200 bg-red-50 text-red-700"
                : shown.kind === "warn"
                  ? "border-amber-300 bg-amber-50 text-amber-800"
                  : "border-emerald-200 bg-emerald-50 text-emerald-800")
            }
          >
            {shown.text}
          </div>
        )}

        <form onSubmit={submit} className="mt-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Username</label>
            <input
              type="text"
              name="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="username"
              placeholder="Username Anda"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Kata sandi</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              placeholder="Kata sandi Anda"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            />
          </div>
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {busy ? "Memeriksa…" : "Masuk"}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-slate-500">
          Belum punya akun?{" "}
          <Link href="/register" className="font-semibold text-emerald-700 hover:underline">
            Daftar di sini
          </Link>
        </p>
        <p className="mt-3 text-center text-xs text-slate-400">
          <Link href="/" className="hover:underline">← Kembali ke halaman utama</Link>
        </p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
