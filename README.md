# ArsipLink — Aplikasi Pengarsipan URL/Link

Platform terpusat untuk menyimpan dan menemukan kembali URL/link yang pernah dibagikan secara cepat. Target: waktu pencarian < 5 detik (pencarian real-time di aplikasi ini umumnya < 10 ms, ditampilkan langsung di UI).

## Cara Jalan Lokal

```bash
npm install
npm run dev
# buka http://localhost:3000

# Build produksi
npm run build
npm run start
```

## Stack

- Next.js 15 + React 19 + TypeScript
- Tailwind CSS v4 (`@tailwindcss/postcss`)
- Persistensi: `localStorage` (kunci `arsip-link-v1`) — **tanpa login, tanpa database**

## Catatan Persistensi (Jujur)

Data tersimpan **per browser / per perangkat** di localStorage. Artinya:
- Data tidak sinkron antarperangkat / antar-browser.
- Membersihkan data browser akan menghapus arsip.
- Gunakan **Ekspor JSON** secara berkala sebagai cadangan, dan **Impor JSON** untuk memulihkan / memindahkan data.

## Data Contoh (Seed)

Saat pertama kali dibuka (localStorage kosong), aplikasi terisi 5 link contoh nyata yang aman & umum:

| URL | Kategori | Contoh Tag |
|-----|----------|------------|
| github.com | Pekerjaan | kode, git, kolaborasi |
| developer.mozilla.org | Referensi | dokumentasi, web, javascript |
| nextjs.org | Belajar | react, framework, tutorial |
| tailwindcss.com | Belajar | css, desain, frontend |
| kemdikbud.go.id | Umum | pemerintah, pendidikan, resmi |

Kategori awal: **Umum, Pekerjaan, Belajar, Referensi, Hiburan** (masing-masing berwarna berbeda).
Semua data contoh bisa dihapus per item (tombol Hapus), atau sekaligus lewat tombol "Hapus semua data" yang wajib konfirmasi dua langkah.

## Tabel Pemetaan Fitur PRD → Implementasi

| # | Fitur PRD | Prioritas | Implementasi di ArsipLink | Status |
|---|-----------|-----------|---------------------------|--------|
| 1 | Penyimpanan URL Cepat & Ekstraksi Metadata Otomatis | Must Have | `app/api/metadata/route.ts` — fetch server-side (timeout 8 dtk, User-Agent browser), parse `<title>`, meta description / `og:description`, `og:image`, favicon (`link rel=icon`, fallback Google S2 Favicons & `/favicon.ico`). Form: tempel URL → otomatis ambil info saat blur/paste + tombol "Ambil Info Otomatis" → pratinjau → bisa edit manual. Error ditangani anggun (tetap bisa simpan, judul = domain). | ✅ Selesai |
| 2 | Kategori & Tagging Terstruktur | Must Have | Kategori berlabel warna (palet 8 warna: Emerald, Biru, Ungu, Merah Muda, Oranye, Kuning, Teal, Abu), bisa tambah/edit/hapus via "Kelola Kategori". Tag kustom via input koma. Seed 5 kategori. Chip kategori berwarna + tag di kartu. | ✅ Selesai |
| 3 | Deteksi Tautan Duplikat | Should Have | Normalisasi URL di `lib/utils.ts` (`normalizeUrlStrict`: host lowercase, buang trailing slash, buang `utm_*`). Saat simpan, bila duplikat: peringatan jelas berisi link lama + pilihan **Batal / Tetap Simpan / Buka yang Lama**. Tidak pernah simpan diam-diam. | ✅ Selesai |
| 4 | Pencarian Cerdas Real-time | Must Have | Input pencarian instan (tanpa tombol), filter judul, URL, domain, deskripsi, tag, kategori. Menampilkan **jumlah hasil + waktu pencarian (ms)**. | ✅ Selesai |
| 5 | Filtering & Pengurutan Multi-Kriteria | Should Have | Filter: kategori, tag, domain, rentang waktu (Semua / Hari ini / 7 hari / 30 hari). Urutan: Terbaru, Terlama, Judul A–Z, Paling Sering Diakses. Plus filter Favorit. | ✅ Selesai |
| 6 | CRUD Lengkap | Must Have | Tambah, lihat (mode **Grid / Daftar**), edit, hapus (modal konfirmasi), salin URL (clipboard + feedback), buka link (counter `clicks` naik + tab baru), favorit/pin (toggle bintang ★). | ✅ Selesai |
| 7 | Dashboard Statistik Ringkas | Should Have | Kartu di atas: total link, total kategori, total tag unik, link paling sering diakses, domain terbanyak. | ✅ Selesai |
| 8 | Ekspor / Impor | Should Have | Ekspor **JSON** & **CSV** (tombol di header). Impor JSON dengan validasi sederhana, duplikat dilewati, laporan ringkasan (X ditambah, Y dilewati). | ✅ Selesai |

## Struktur Proyek

```
app/
  api/metadata/route.ts   # API ekstraksi metadata server-side
  globals.css
  layout.tsx
  page.tsx                # UI utama (dashboard, pencarian, CRUD, kategori, impor/ekspor)
lib/
  types.ts                # Tipe Category, LinkItem, palet warna, STORAGE_KEY
  utils.ts                # Normalisasi URL, domain, format tanggal ID/WITA
  seed.ts                 # 5 kategori + 5 link contoh
```

## Target Pengguna & Performa (dari PRD)

- Target waktu pencarian < 5 detik — tercapai jauh di bawahnya (pencarian client-side real-time, waktu terukur ditampilkan di UI).
- Target skala PRD: 1.000 MAU — arsitektur localStorage cocok untuk penggunaan personal / per perangkat; untuk multi-user tersinkron dibutuhkan backend & login (di luar scope versi ini, sesuai keputusan persistensi tanpa login).
