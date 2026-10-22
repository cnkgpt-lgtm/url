import type { Metadata } from "next";
import "./globals.css";
import Providers from "./providers";

export const metadata: Metadata = {
  title: "Accank Arsip Link — Aplikasi Pengarsipan URL/Link",
  description:
    "Accank Arsip Link — Aplikasi Pengarsipan URL/Link. Platform terpusat untuk menyimpan, mengkategorikan, dan menemukan kembali URL/link yang pernah dibagikan secara cepat. Arsip tersimpan per akun dan sinkron di semua perangkat.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className="bg-slate-50 text-slate-900 antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
