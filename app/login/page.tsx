"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";

type Msg = { kind: "error" | "warn" | "ok"; text: string };

/** Terjemahkan kode error kustom dari authorize() menjadi pesan Bahasa Indonesia. */
function messageForCode(code: string | null | undefined): Msg | null {
  if (code === "PENDING_APPROVAL")
    return { kind: "warn", text: "Akun Anda belum disetujui Master. Mohon tunggu persetujuan." };
  if (code === "ACCOUNT_REJECTED")
    return { kind: "error", text: "Pendaftaran Anda ditolak. Hubungi Master bila ada kekeliruan." };
  return null;
}

function LoginForm() {
  const router = useRouter();
  const sp = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<Msg | null>(null);
  const [busy, setBusy] = useState(false);

  // Pesan dari URL: ?code=... (alur redirect NextAuth) atau ?notice=...
  // (setelah pendaftaran berhasil dari halaman /register).
  const paramMsg = useMemo<Msg | null>(() => {
    const fromCode = messageForCode(sp.get("code"));
    if (fromCode) return fromCode;
    const notice = sp.get("notice");
    if (notice === "pending")
      return {
        kind: "warn",
        text: "Pendaftaran berhasil. Akun Anda menunggu persetujuan Master sebelum bisa masuk.",
      };
    if (notice === "master")
      return { kind: "ok", text: "Pendaftaran berhasil. Akun Master Anda sudah aktif — silakan masuk." };
    return null;
  }, [sp]);

  const shown = msg ?? paramMsg;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setBusy(true);
    const res = await signIn("credentials", { email, password, redirect: false });
    setBusy(false);
    if (res?.error) {
      const code = (res as unknown as { code?: string }).code;
      setMsg(
        messageForCode(code) ?? {
          kind: "error",
          text: "Email atau kata sandi salah. Silakan coba lagi.",
        }
      );
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
