# Aplikasi Android TLINET

Aplikasi pelanggan untuk Portal Subnet. Isinya adalah portal web (`/subnet`) yang dibuka di WebView lewat
[Capacitor](https://capacitorjs.com), jadi setiap perubahan portal di situs langsung tampil di aplikasi tanpa build ulang.
Build ulang hanya perlu bila bagian native (ikon, nama, kode di `android/`) atau `capacitor.config.json` berubah.

Yang ditambahkan di sisi native (`android/app/src/main/java/.../MainActivity.java`):

- **Cetak / Simpan PDF invoice**: `window.print()` tidak berfungsi di WebView, jadi `PrintButton` memanggil
  `window.TLINETAndroid.print()` yang membuka dialog cetak Android.
- **Berkas unduhan** (PDF, dll.) dibuka di peramban / penampil PDF.
- **Tombol kembali**: mundur di riwayat; dari Beranda atau halaman masuk, aplikasi ditutup.
- **Halaman offline** (`www/offline.html`) saat portal tidak bisa dimuat.

Tautan ke domain lain (WhatsApp, berkas di R2) otomatis dibuka di aplikasi lain. Server mengenali aplikasi dari
penanda `TLINETApp` di user agent (`inAndroidApp()` di `lib/subnet.ts`).

## Build

Butuh Node 20+, Android SDK, dan JDK 21 (bisa memakai JBR Android Studio).

```bash
npm install
npx cap sync android
cd android
JAVA_HOME="D:/Android/androidstudio/jbr" ./gradlew bundleRelease assembleRelease
```

Hasilnya:

- `android/app/build/outputs/apk/release/app-release.apk`: dipasang langsung di HP (izinkan "Instal aplikasi tidak dikenal").
- `android/app/build/outputs/bundle/release/app-release.aab`: untuk diunggah ke Google Play Console.

Setiap build baru yang dibagikan: naikkan `versionCode` (dan `versionName`) di `android/app/build.gradle`.

## Kunci tanda tangan

Build rilis ditandatangani dengan `tlinet-release.jks`; kata sandinya ada di `keystore.properties`. Keduanya **tidak
di-commit**. Simpan cadangannya di tempat aman: tanpa kunci yang sama, versi baru tidak bisa dipasang di atas versi
lama dan tidak bisa diunggah sebagai pembaruan di Play Store.
