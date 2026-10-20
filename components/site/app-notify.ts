"use client";

/**
 * Notifikasi sistem untuk portal Subnet: lewat aplikasi Android TLINET (1.0.2 ke atas, `TLINETAndroid.notify`), atau
 * Notification API peramban bila pengguna sudah mengizinkan. Di tempat lain tidak terjadi apa-apa.
 */
export function showNotification(title: string, body: string, tag = "tlinet") {
  if (typeof window.TLINETAndroid?.notify === "function") return window.TLINETAndroid.notify(title, body);
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  try {
    new Notification(title, { body, tag });
  } catch {
    // Chrome di Android hanya mengizinkan notifikasi lewat service worker.
  }
}
