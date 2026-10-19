"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

declare global {
  interface Window {
    /**
     * Disediakan aplikasi Android TLINET: WebView tidak mendukung window.print() maupun Notification API, jadi cetak dan
     * notifikasi lewat Android. `notify` baru ada sejak aplikasi pelanggan 1.0.2.
     */
    TLINETAndroid?: { print(title: string): void; notify?(title: string, body: string): void };
  }
}

/** Membuka dialog cetak peramban (atau Android); dari sana halaman bisa dicetak atau disimpan sebagai PDF. */
export function PrintButton() {
  return (
    <Button size="lg" onClick={() => (window.TLINETAndroid ? window.TLINETAndroid.print(document.title) : window.print())}>
      <Printer />
      Cetak / Simpan PDF
    </Button>
  );
}
