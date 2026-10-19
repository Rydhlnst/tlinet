import type { NextConfig } from "next";

/**
 * Asal gambar unggahan di Cloudflare R2. Hanya alamat ini yang boleh diperkecil oleh pengoptimal gambar Next,
 * supaya pengoptimal tidak bisa dipakai untuk gambar dari tempat lain.
 */
const cmsImageOrigin = (process.env.R2_PUBLIC_URL || "https://pub-7755b913f9b14072967cbd0b06d0415e.r2.dev").replace(/\/$/, "");

const nextConfig: NextConfig = {
  // Folder induk punya lockfile sendiri; tanpa ini Turbopack salah menebak akar proyek.
  turbopack: { root: process.cwd() },
  // Dibaca CmsImage untuk memutuskan gambar mana yang dilewatkan ke pengoptimal.
  env: { CMS_IMAGE_ORIGIN: cmsImageOrigin },
  // Hanya untuk next dev: emulator Android memanggil server lokal lewat 10.0.2.2 saat menguji aplikasi.
  allowedDevOrigins: ["10.0.2.2"],
  // APK aplikasi admin tidak ada di public/; berkasnya ikut dibundel hanya untuk rute unduhannya.
  outputFileTracingIncludes: { "/admin/app": ["./private/**/*"] },
  // APK diunduh sebagai berkas (bukan dibuka) dan dikenali Android sebagai paket aplikasi.
  async headers() {
    return [
      {
        source: "/downloads/:file*.apk",
        headers: [
          { key: "Content-Type", value: "application/vnd.android.package-archive" },
          { key: "Content-Disposition", value: "attachment" },
          { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
        ],
      },
    ];
  },
  images: {
    remotePatterns: [new URL(`${cmsImageOrigin}/uploads/**`)],
    // Gambar yang disimpan di database (/media/<id>) dan aset di public/images.
    localPatterns: [
      { pathname: "/media/**", search: "" },
      { pathname: "/images/**", search: "" },
    ],
    formats: ["image/avif", "image/webp"],
    qualities: [75],
    // Nama berkas unggahan selalu baru, jadi hasil olahannya aman disimpan lama.
    minimumCacheTTL: 2_678_400,
  },
};

export default nextConfig;
