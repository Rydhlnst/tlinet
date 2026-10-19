# Aplikasi Android TLINET Admin (internal)

Aplikasi internal untuk dashboard admin. Isinya adalah dashboard web (`/admin`) yang dibuka di WebView lewat
[Capacitor](https://capacitorjs.com), jadi seluruh fitur dashboard (dan hak akses tiap pengguna dari menu Pengguna)
ikut berlaku tanpa build ulang. Build ulang hanya perlu bila bagian native (ikon, nama, kode di `android/`) atau
`capacitor.config.json` berubah.

Paket: `com.translinkinternasional.tlinet.admin` (terpisah dari aplikasi pelanggan di `android-app/`, jadi keduanya
bisa terpasang bersamaan). Ikonnya lambang TLINET di atas latar biru gelap.

Yang ditambahkan di sisi native (`android/app/src/main/java/.../admin/MainActivity.java`):

- **Cetak / Simpan PDF invoice** lewat dialog cetak Android (`window.TLINETAndroid.print()` dari `PrintButton`).
- **Unduhan dari dashboard** (mis. bukti transfer) diunduh di dalam aplikasi lewat DownloadManager dengan cookie
  sesi yang sama, ke folder Download HP. Tautan ke domain lain dibuka di peramban.
- **Tombol kembali**: mundur di riwayat; dari halaman awal atau halaman masuk, aplikasi ditutup.
- **Muat ulang otomatis** bila aplikasi dibuka lagi setelah lebih dari 5 menit di latar.
- **Halaman offline** (`www/offline.html`) saat dashboard tidak bisa dimuat.

Server mengenali aplikasi dari penanda `TLINETAdminApp` di user agent (`lib/admin-app.ts`), mis. untuk menyembunyikan
tombol unduh aplikasi di dalam aplikasinya sendiri.

## Distribusi

APK tidak ditaruh di `public/`. Berkasnya ada di `private/TLINET-Admin.apk` dan hanya bisa diunduh lewat
`/admin/app` oleh pengguna dashboard yang sudah masuk (tombol **Aplikasi Android** di bawah sidebar dashboard).

Merilis versi baru:

1. Naikkan `versionCode` dan `versionName` di `android/app/build.gradle`.
2. Build (lihat di bawah), lalu salin `android/app/build/outputs/apk/release/app-release.apk` ke
   `private/TLINET-Admin.apk` (di akar proyek situs).
3. Naikkan `version` di `lib/admin-app.ts`, commit, dan deploy.

## Build

Butuh Node 20+, Android SDK, dan JDK 21 (bisa memakai JBR Android Studio).

```bash
npm install
npx cap sync android
cd android
JAVA_HOME="D:/Android/androidstudio/jbr" ./gradlew assembleRelease bundleRelease
```

## Kunci tanda tangan

Memakai kunci yang sama dengan aplikasi pelanggan (`android-app/tlinet-release.jks`). `keystore.properties` di folder
ini menunjuk ke kunci itu dan berisi kata sandinya; keduanya **tidak di-commit**. Simpan cadangannya di tempat aman.

## Menguji dengan server lokal

Untuk mencoba di emulator dengan `next dev`, ganti sementara `server.url` di `capacitor.config.json` menjadi
`http://10.0.2.2:3000/admin`, tambahkan `"cleartext": true`, lalu `npx cap sync android` dan `./gradlew assembleDebug`.
Kembalikan sebelum build rilis. `next.config.ts` sudah mengizinkan origin `10.0.2.2` untuk mode dev.
