# Accank Arsip Link — Aplikasi Pengarsipan URL/Link

Platform terpusat untuk menyimpan dan menemukan kembali URL/link yang pernah dibagikan secara cepat. Target: waktu pencarian < 5 detik (pencarian real-time di aplikasi ini umumnya < 10 ms, ditampilkan langsung di UI).

**Versi 2 — Akun + Database:** arsip kini tersimpan per akun di database (PostgreSQL/Neon) dan **sinkron antarperangkat**. Masuk dengan akun yang sama dari HP, laptop, atau perangkat apa pun — isinya selalu sama.

## Fitur Akun (v2)

- **Daftar / Masuk** dengan email + kata sandi (NextAuth v5, kata sandi di-hash bcrypt). Halaman: `/register` dan `/login`.
- Akun baru langsung mendapat **5 kategori awal**: Umum, Pekerjaan, Belajar, Referensi, Hiburan (warna sama seperti v1).
- Semua data (link & kategori) terikat ke akun pemiliknya — API menolak akses tanpa sesi (401) dan tidak pernah mencampur data antar akun.
- **Migrasi arsip lokal v1:** bila di browser masih ada arsip dari versi localStorage lama (kunci `arsip-link-v1`), setelah masuk akan muncul banner *"Ada arsip lokal di perangkat ini — Impor ke akun"*. Sekali klik, arsip terunggah ke server (duplikat dilewati), lalu Anda ditawari menghapus salinan lokalnya.
- Mode tamu (belum masuk) hanya menampilkan halaman sambutan + tombol Masuk/Daftar — tidak ada lagi penyimpanan localStorage agar sumber data tidak membingungkan.

## Role & Persetujuan (Master & User)

Aplikasi memiliki dua role:

- **Master** — pemilik/pengelola. Bisa membuka halaman **Persetujuan User** (`/master`) untuk menyetujui atau menolak pendaftaran akun baru, dan mencabut akses user yang sudah disetujui.
- **User** — pengguna biasa dengan arsip link miliknya sendiri.

**Alur pendaftaran:**

1. User mendaftar di `/register` → akun dibuat dengan role `USER` dan status **`PENDING`**.
2. Selama status `PENDING` (atau `REJECTED`), user **tidak bisa masuk** — halaman masuk menampilkan pesan: *"Akun Anda belum disetujui Master. Mohon tunggu persetujuan."* (atau pesan ditolak).
3. Master masuk → klik **Persetujuan User** di header (ada badge jumlah yang menunggu) → **Setujui** untuk mengaktifkan akun, atau **Tolak** untuk menolak. User yang sudah disetujui juga bisa dicabut aksesnya (**Tolak/Cabut** → status `REJECTED`).
4. Master tidak dapat mengubah status akunnya sendiri.

**Akun Master pertama:** ditentukan lewat environment variable **`MASTER_EMAIL`**. Pendaftar yang mendaftar dengan email yang sama persis (tidak peka huruf besar/kecil) dengan nilai env ini otomatis menjadi role `MASTER` + status `APPROVED` — tidak perlu persetujuan siapa pun. User lama yang terdaftar sebelum fitur ini ada tetap berstatus `APPROVED` (default kolom), jadi tidak ada yang terkunci saat migrasi skema berjalan.

Di database: `User.role` (`MASTER` | `USER`) dan `User.status` (`PENDING` | `APPROVED` | `REJECTED`). Role & status ikut terbawa di sesi JWT, dan semua endpoint `/api/master/*` memeriksa role di server (403 untuk bukan Master).

## Cara Jalan Lokal

```bash
npm install

# Siapkan env (lihat .env.example — isi nilai asli hanya di .env.local / dashboard Vercel, JANGAN commit)
#   DATABASE_URL  = connection string PostgreSQL (pooled)
#   DIRECT_URL    = connection string langsung (non-pooled, untuk migrate/db push Prisma)
#   AUTH_SECRET   = string acak kuat untuk NextAuth
#   NEXTAUTH_URL  = URL aplikasi, mis. http://localhost:3000
#   MASTER_EMAIL  = email akun Master pertama (pendaftar email ini = MASTER + APPROVED)

npx prisma generate
npx prisma db push   # hanya bila database bisa dijangkau dari mesin ini
npm run dev
# buka http://localhost:3000

# Build produksi
npm run build
npm run start
```

Di Vercel, migrasi skema dijalankan otomatis saat build (`vercel.json` → `buildCommand: npx prisma generate && npx prisma db push && next build`), karena tidak semua lingkungan bisa menjangkau database secara langsung.

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
| 10 | Role Master & User + Persetujuan Pendaftaran (v2.1) | — | `User.role` (`MASTER`/`USER`) + `User.status` (`PENDING`/`APPROVED`/`REJECTED`). Register baru = USER + PENDING (kecuali email = env `MASTER_EMAIL` → MASTER + APPROVED). Login menolak akun PENDING/REJECTED dengan pesan khusus. Halaman `/master` + API `/api/master/users` untuk setujui/tolak/cabut akses. | ✅ Selesai |

## Struktur Proyek

```
app/
  api/auth/[...nextauth]/route.ts  # Handler NextAuth
  api/auth/register/route.ts       # Registrasi (+ seed 5 kategori per akun)
  api/categories/route.ts          # GET/POST kategori milik user
  api/categories/[id]/route.ts     # PATCH/DELETE kategori
  api/links/route.ts               # GET/POST link (cek duplikat 409 di server)
  api/links/[id]/route.ts          # PATCH (termasuk {click:true}) / DELETE link
  api/links/import/route.ts        # Impor & migrasi arsip lokal → akun
  api/metadata/route.ts            # API ekstraksi metadata server-side
  api/master/users/route.ts        # GET daftar user (khusus Master)
  api/master/users/[id]/route.ts   # PATCH status persetujuan user (khusus Master)
  login/page.tsx                   # Halaman masuk (pesan khusus akun PENDING/REJECTED)
  master/page.tsx                  # Halaman Persetujuan User (khusus Master)
  register/page.tsx                # Halaman daftar (akun baru = PENDING, tanpa auto-login)
  globals.css
  layout.tsx
  page.tsx                         # Sambutan (tamu) + UI utama berbasis API (sudah masuk)
  providers.tsx                    # SessionProvider NextAuth
auth.ts                            # NextAuth + provider Credentials (bcrypt)
auth.config.ts                     # Konfigurasi edge-safe untuk middleware
middleware.ts                      # Middleware sesi (edge-safe)
prisma/schema.prisma               # User (role + status), Category, LinkItem
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
