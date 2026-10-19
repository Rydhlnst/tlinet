/**
 * Aplikasi Android internal TLINET Admin (android-admin/). APK-nya di private/ (bukan public/) dan hanya diunduh lewat
 * /admin/app oleh pengguna dashboard yang sudah masuk. Saat merilis versi baru, salin hasil build ke
 * private/TLINET-Admin.apk dan naikkan versinya di sini.
 */
export const adminApk = { path: "/admin/app", file: "private/TLINET-Admin.apk", version: "1.0.0", size: "3 MB" };

/** Penanda user agent WebView aplikasi admin (appendUserAgent di android-admin/capacitor.config.json). */
export const adminAppUserAgent = "TLINETAdminApp";
