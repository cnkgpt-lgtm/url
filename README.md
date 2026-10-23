# Accank Arsip Link — Aplikasi Pengarsipan URL/Link

Platform terpusat untuk menyimpan dan menemukan kembali URL/link yang pernah dibagikan secara cepat. Target: waktu pencarian < 5 detik (pencarian real-time di aplikasi ini umumnya < 10 ms, ditampilkan langsung di UI).

**Versi 2 — Akun + Database:** arsip kini tersimpan per akun di database (PostgreSQL/Neon) dan **sinkron antarperangkat**. Masuk dengan akun yang sama dari HP, laptop, atau perangkat apa pun — isinya selalu sama.

## Fitur Akun (v2)

- **Daftar / Masuk** dengan **username + kata sandi** (tanpa email — NextAuth v5, kata sandi di-hash bcrypt). Halaman: `/register` dan `/login`. Username: 3–30 karakter huruf kecil, angka, titik, garis bawah, atau tanda hubung; disimpan selalu dalam huruf kecil dan harus unik. Kata sandi **minimal 6 karakter**.
- **Ganti Kata Sandi:** user yang sudah masuk bisa mengganti sandinya sendiri lewat halaman `/ganti-sandi` (tautan "Ganti Sandi" di header, di samping tombol Keluar). Wajib mengisi kata sandi lama dengan benar — diverifikasi di server dengan bcrypt (`POST /api/account/password`, 401 tanpa sesi, 400 bila sandi lama salah atau sandi baru < 6 karakter).
- Akun baru langsung mendapat **5 kategori awal**: Umum, Pekerjaan, Belajar, Referensi, Hiburan (warna sama seperti v1).
- Semua data (link & kategori) terikat ke akun pemiliknya — API menolak akses tanpa sesi (401) dan tidak pernah mencampur data antar akun. Satu-satunya pengecualian: role **Master dapat MELIHAT link semua user** (lihat bagian Role di bawah) — melihat saja, tanpa bisa mengubah atau menghapus link orang lain.
- **Migrasi arsip lokal v1:** bila di browser masih ada arsip dari versi localStorage lama (kunci `arsip-link-v1`), setelah masuk akan muncul banner *"Ada arsip lokal di perangkat ini — Impor ke akun"*. Sekali klik, arsip terunggah ke server (duplikat dilewati), lalu Anda ditawari menghapus salinan lokalnya.
- Mode tamu (belum masuk) hanya menampilkan halaman sambutan + tombol Masuk/Daftar — tidak ada lagi penyimpanan localStorage agar sumber data tidak membingungkan.

## Role (Master & User) — Tanpa Persetujuan

Aplikasi memiliki dua role:

- **Master** — pemilik/pengelola. Bisa membuka halaman **Kelola User** (`/master`) untuk melihat semua akun terdaftar dan **menghapus akun** (beserta seluruh arsip link & kategorinya).
- **User** — pengguna biasa dengan arsip link miliknya sendiri.

**Tidak ada lagi sistem persetujuan (approval):** pendaftaran di `/register` membuat akun dengan role `USER` yang **langsung aktif** — user bisa langsung masuk setelah daftar, tanpa menunggu disetujui Master. Login hanya memeriksa username + kata sandi; nilai `status` lama di database tidak lagi dipakai untuk memblokir siapa pun (akun yang dulu terlanjur berstatus `PENDING` tetap bisa masuk).

Master tidak dapat menghapus akunnya sendiri (tombol Hapus tidak tampil untuk baris dirinya, dan API menolaknya dengan 400).

**Master melihat arsip link semua user (v2.5):** di halaman utama, Master melihat arsip link dari **semua user**, bukan hanya miliknya sendiri — `GET /api/links` mengembalikan seluruh link (urut terbaru) khusus untuk role `MASTER`, dan tiap link dilengkapi data pemiliknya (`ownerName` + `ownerUsername` dari relasi user). Di UI, link milik orang lain tampil dengan **lencana pemilik** "👤 Nama (@username)", dan bila ada lebih dari satu pemilik muncul filter tambahan **Pemilik** (Semua Pemilik / per username) yang bekerja bersama pencarian serta filter kategori/tag/domain/rentang waktu yang sudah ada; statistik dashboard Master pun dihitung dari seluruh link. **User biasa tidak berubah:** hanya melihat arsip miliknya sendiri (field pemilik pada responnya berisi dirinya sendiri).

Melihat bukan berarti bisa mengubah: **tambah link tetap untuk akun sendiri, dan edit/hapus/favorit/counter klik tetap hanya berlaku untuk link milik sendiri** — tombol Edit/Hapus/bintang tidak tampil pada link orang lain, dan API `PATCH`/`DELETE /api/links/[id]` tetap menolak link bukan milik pemanggil dengan 404.

**Akun Master:** ditentukan lewat environment variable **`MASTER_USERNAME`** (bawaan: `ahsan`). Pendaftar yang mendaftar dengan username yang sama dengan nilai env ini otomatis menjadi role `MASTER`.

**Akun bawaan yang sudah dibuat:**

| Username | Nama | Role |
|----------|------|------|
| `ahsan` | Ahsan | MASTER |
| `akademik` | Akademik | USER |

Akun lama dari era login-email diberi username secara otomatis saat build oleh `scripts/backfill-usernames.mjs` (idempoten; memetakan akun lama `master@accank.id` → `ahsan` dan `akademik@unibos.ac.id` → `akademik`). Kolom `email` masih ada di database hanya sebagai warisan internal (akun baru diisi `${username}@user.local`) — tidak dipakai untuk login dan tidak ditampilkan di UI mana pun.

Di database: `User.username` (unik) + `User.role` (`MASTER` | `USER`). Kolom `User.status` masih ada di skema (warisan versi persetujuan) tetapi tidak lagi dipakai untuk memblokir login. Username & role ikut terbawa di sesi JWT, dan semua endpoint `/api/master/*` memeriksa role di server (403 untuk bukan Master).

## Cara Jalan Lokal

```bash
npm install

# Siapkan env (lihat .env.example — isi nilai asli hanya di .env.local / dashboard Vercel, JANGAN commit)
#   DATABASE_URL  = connection string PostgreSQL (pooled)
#   DIRECT_URL    = connection string langsung (non-pooled, untuk migrate/db push Prisma)
#   AUTH_SECRET   = string acak kuat untuk NextAuth
#   NEXTAUTH_URL  = URL aplikasi, mis. http://localhost:3000
#   MASTER_USERNAME = username akun Master (pendaftar username ini = role MASTER; bawaan: ahsan)

npx prisma generate
npx prisma db push   # hanya bila database bisa dijangkau dari mesin ini
npm run dev
# buka http://localhost:3000

# Build produksi
npm run build
npm run start
```

Di Vercel, migrasi skema dijalankan otomatis saat build (`vercel.json` → `buildCommand: npx prisma generate && npx prisma db push && node scripts/backfill-usernames.mjs && next build`), karena tidak semua lingkungan bisa menjangkau database secara langsung. Langkah `backfill-usernames` mengisi username akun lama dan tidak pernah menggagalkan build bila gagal.

## Stack

- Next.js 15 + React 19 + TypeScript
- Tailwind CSS v4 (`@tailwindcss/postcss`)
- Auth: NextAuth v5 (Credentials, sesi JWT) + bcryptjs
- Database: PostgreSQL (Neon) via Prisma ORM
- Persistensi v1 (localStorage) digantikan penuh oleh database untuk pengguna yang masuk.

## Tabel Pemetaan Fitur PRD → Implementasi

| # | Fitur PRD | Prioritas | Implementasi di Accank Arsip Link | Status |
|---|-----------|-----------|---------------------------|--------|
| 1 | Penyimpanan URL Cepat & Ekstraksi Metadata Otomatis | Must Have | `app/api/metadata/route.ts` — fetch server-side (timeout 8 dtk, User-Agent browser), parse `<title>`, meta description / `og:description`, `og:image`, favicon (`link rel=icon`, fallback Google S2 Favicons & `/favicon.ico`). Form: tempel URL → otomatis ambil info saat blur/paste + tombol "Ambil Info Otomatis" → pratinjau → bisa edit manual. Error ditangani anggun (tetap bisa simpan, judul = domain). | ✅ Selesai |
| 2 | Kategori & Tagging Terstruktur | Must Have | Kategori berlabel warna (palet 8 warna: Emerald, Biru, Ungu, Merah Muda, Oranye, Kuning, Teal, Abu), bisa tambah/edit/hapus via "Kelola Kategori" (tersimpan di server per akun; menghapus kategori membuat link di dalamnya menjadi tanpa kategori). Tag kustom via input koma. Seed 5 kategori per akun baru. Chip kategori berwarna + tag di kartu. | ✅ Selesai |
| 3 | Deteksi Tautan Duplikat | Should Have | Normalisasi URL di `lib/utils.ts` (`normalizeUrlStrict`: host lowercase, buang trailing slash, buang `utm_*`). Pemeriksaan duplikat kini ditegakkan **di server** per akun (respon 409 berisi link lama, kecuali `force=true`): peringatan jelas + pilihan **Batal / Tetap Simpan / Buka yang Lama**. Tidak pernah simpan diam-diam. | ✅ Selesai |
| 4 | Pencarian Cerdas Real-time | Must Have | Input pencarian instan (tanpa tombol) di atas data akun yang dimuat dari server, filter judul, URL, domain, deskripsi, tag, kategori. Menampilkan **jumlah hasil + waktu pencarian (ms)**. | ✅ Selesai |
| 5 | Filtering & Pengurutan Multi-Kriteria | Should Have | Filter: kategori (termasuk "Tanpa Kategori"), tag, domain, rentang waktu (Semua / Hari ini / 7 hari / 30 hari). Urutan: Terbaru, Terlama, Judul A–Z, Paling Sering Diakses. Plus filter Favorit. | ✅ Selesai |
| 6 | CRUD Lengkap | Must Have | Tambah, lihat (mode **Grid / Daftar**), edit, hapus (modal konfirmasi), salin URL (clipboard + feedback), buka link (counter `clicks` naik di server + tab baru), favorit/pin (toggle bintang ★). Semua lewat API per akun. | ✅ Selesai |
| 7 | Dashboard Statistik Ringkas | Should Have | Kartu di atas: total link, total kategori, total tag unik, link paling sering diakses, domain terbanyak. | ✅ Selesai |
| 8 | Ekspor / Impor | Should Have | Ekspor **JSON** & **CSV** dari data akun (tombol di header). Impor JSON lewat endpoint server `/api/links/import` — kategori dicocokkan per nama, duplikat dilewati, laporan ringkasan (X ditambah, Y dilewati). Endpoint yang sama dipakai untuk migrasi arsip lokal v1. | ✅ Selesai |
| 9 | Akun & Sinkronisasi Antarperangkat (v2) | — | NextAuth v5 + Prisma + PostgreSQL (Neon). Model `User`, `Category`, `LinkItem` per user. API links/categories wajib sesi (401 tanpa login). | ✅ Selesai |
| 10 | Role Master & User (v2.1, disederhanakan v2.3) | — | `User.role` (`MASTER`/`USER`). **Tanpa persetujuan:** register baru langsung aktif & bisa langsung masuk (kecuali username = env `MASTER_USERNAME` → role MASTER). Halaman `/master` (**Kelola User**) + API `/api/master/users` untuk melihat dan menghapus akun beserta datanya. | ✅ Selesai |
| 12 | Login Username (v2.4) | — | Login & daftar hanya memakai **username** (tanpa email): kolom `User.username` unik (lowercase), Credentials NextAuth by username, UI login/register/header/Kelola User menampilkan username. Akun lama di-backfill username saat build (`scripts/backfill-usernames.mjs`): `ahsan` (Master) & `akademik` (User). | ✅ Selesai |
| 13 | Master Melihat Arsip Semua User (v2.5) | — | `GET /api/links` bercabang per role sesi: `MASTER` → semua link semua user + `ownerName`/`ownerUsername`; `USER` → hanya miliknya. UI: lencana pemilik 👤 Nama (@username) pada link orang lain, filter **Pemilik** khusus Master bila pemilik > 1, statistik mengikuti seluruh data. POST/PATCH/DELETE tetap per pemilik (404 untuk link orang lain). | ✅ Selesai |
| 11 | Ganti Kata Sandi (v2.2) | — | Halaman `/ganti-sandi` + `POST /api/account/password`. Wajib sesi (401), sandi lama diverifikasi bcrypt, sandi baru min. 6 karakter. Tautan "Ganti Sandi" di header halaman utama & `/master`. | ✅ Selesai |

## Struktur Proyek

```
app/
  api/auth/[...nextauth]/route.ts  # Handler NextAuth
  api/auth/register/route.ts       # Registrasi (+ seed 5 kategori per akun)
  api/categories/route.ts          # GET/POST kategori milik user
  api/categories/[id]/route.ts     # PATCH/DELETE kategori
  api/links/route.ts               # GET link (Master: semua user + info pemilik; User: milik sendiri) / POST link (cek duplikat 409 di server)
  api/links/[id]/route.ts          # PATCH (termasuk {click:true}) / DELETE link
  api/links/import/route.ts        # Impor & migrasi arsip lokal → akun
  api/metadata/route.ts            # API ekstraksi metadata server-side
  api/master/users/route.ts        # GET daftar user (khusus Master)
  api/master/users/[id]/route.ts   # DELETE akun user + datanya (khusus Master)
  api/account/password/route.ts    # POST ganti kata sandi (wajib sesi, verifikasi sandi lama)
  ganti-sandi/page.tsx             # Halaman ganti kata sandi (khusus user yang sudah masuk)
  login/page.tsx                   # Halaman masuk
  master/page.tsx                  # Halaman Kelola User (khusus Master)
  register/page.tsx                # Halaman daftar (akun baru langsung aktif)
  globals.css
  layout.tsx
  page.tsx                         # Sambutan (tamu) + UI utama berbasis API (sudah masuk)
  providers.tsx                    # SessionProvider NextAuth
auth.ts                            # NextAuth + provider Credentials (bcrypt)
auth.config.ts                     # Konfigurasi edge-safe untuk middleware
middleware.ts                      # Middleware sesi (edge-safe)
prisma/schema.prisma               # User (username + role + status), Category, LinkItem
scripts/backfill-usernames.mjs     # Backfill username akun lama saat build (idempoten, non-fatal)
lib/
  prisma.ts                        # Singleton PrismaClient
  session.ts                       # Helper requireUserId() / getSessionUser() / requireMaster() untuk API
  serialize.ts                     # Serialisasi model DB → bentuk UI
  types.ts                         # Tipe Category, LinkItem, palet warna, STORAGE_KEY
  utils.ts                         # Normalisasi URL, domain, format tanggal ID/WITA
  seed.ts                          # Definisi 5 kategori awal per akun
```

## Target Pengguna & Performa (dari PRD)

- Target waktu pencarian < 5 detik — tercapai jauh di bawahnya (pencarian client-side real-time atas data akun, waktu terukur ditampilkan di UI).
- Target skala PRD: 1.000 MAU — v2 dengan database terpusat per akun mendukung penggunaan multi-perangkat dan multi-pengguna; tiap akun terisolasi datanya.

<!-- Redeploy v2 dipicu 22 Okt 2026 setelah env var database terpasang. -->
