# TLINET

Situs penyedia internet fiber beserta dashboard CMS. Next.js (App Router) + shadcn/ui +
Neon Postgres (Drizzle) + Cloudflare R2 untuk gambar.

## Menjalankan secara lokal

1. Salin `.env.example` menjadi `.env.local` dan isi nilainya.
2. `npm install`
3. `npm run db:push` — membuat tabel di database.
4. `npm run db:seed` — mengisi konten awal dan akun admin (tabel yang sudah berisi dilewati).
5. `npm run dev`, lalu buka `http://localhost:3000`. Dashboard ada di `/admin`.

## Environment variable

| Nama | Dipakai untuk |
| --- | --- |
| `DATABASE_URL` | Koneksi Neon Postgres (juga dibaca saat build) |
| `SESSION_SECRET` | Menandatangani cookie sesi admin (wajib di produksi) |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Hanya dibaca `npm run db:seed` untuk membuat akun admin pertama |
| `R2_*` | Cloudflare R2 untuk gambar unggahan (opsional, lihat di bawah) |

## Struktur

- `app/(site)` — halaman publik: beranda, area jangkauan, bantuan, tentang kami, berita, formulir registrasi.
- `app/admin` — dashboard. `pages/[key]` mengedit teks satu halaman, `data/[entity]` mengelola satu koleksi.
- `lib/cms/pages.ts` — definisi field tiap halaman. `lib/cms/entities.ts` — definisi field tiap koleksi.
  Form dashboard dan validasi server dibentuk dari definisi ini, jadi menambah field cukup di satu tempat
  (ditambah `lib/content/types.ts` + `defaults.ts` untuk halaman, atau `lib/db/schema.ts` untuk koleksi).
- `lib/data.ts` — pembacaan data untuk halaman publik.

Halaman publik dibuat statis. Setiap simpan dari dashboard memanggil `revalidatePath("/", "layout")`,
sehingga perubahan langsung tampil tanpa build ulang.

## Penyimpanan gambar

- **Cloudflare R2**, jika `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, dan
  `R2_PUBLIC_URL` semuanya terisi. Bucket harus bisa diakses publik (domain `r2.dev` atau domain kustom)
  dan token API-nya punya izin Object Read & Write.
- **Database** (tabel `media_assets`, disajikan lewat `/media/<id>`), jika R2 belum diatur.

Halaman Ringkasan di dashboard menampilkan penyimpanan mana yang sedang aktif. Gambar lama tetap tampil
setelah berpindah penyimpanan, karena konten menyimpan URL lengkapnya.

## Deploy

Tambahkan `DATABASE_URL` dan `SESSION_SECRET` (serta `R2_*` bila dipakai) di environment hosting.
Database harus sudah di-push dan di-seed sebelum build pertama, karena halaman publik dibuat saat build.
