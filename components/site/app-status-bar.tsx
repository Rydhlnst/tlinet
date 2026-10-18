"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    /** Jembatan Capacitor; hanya ada di aplikasi Android TLINET. */
    Capacitor?: { nativePromise?: (plugin: string, method: string, options?: Record<string, unknown>) => Promise<unknown> };
  }
}

/**
 * Warna ikon status bar di aplikasi Android: "DARK" berarti ikon putih (untuk bilah atas biru), "LIGHT" ikon gelap
 * (untuk halaman terang). Di peramban biasa tidak melakukan apa-apa.
 */
export function AppStatusBar({ style }: { style: "DARK" | "LIGHT" }) {
  useEffect(() => {
    window.Capacitor?.nativePromise?.("SystemBars", "setStyle", { style })?.catch(() => {});
  }, [style]);
  return null;
}
