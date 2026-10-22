import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Accank Arsip Link — Aplikasi Pengarsipan URL/Link",
  description:
    "Accank Arsip Link — Aplikasi Pengarsipan URL/Link. Platform terpusat untuk menyimpan, mengkategorikan, dan menemukan kembali URL/link yang pernah dibagikan secara cepat.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className="bg-slate-50 text-slate-900 antialiased">{children}</body>
    </html>
  );
}
