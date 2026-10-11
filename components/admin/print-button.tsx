"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Membuka dialog cetak peramban; dari sana halaman bisa dicetak atau disimpan sebagai PDF. */
export function PrintButton() {
  return (
    <Button size="lg" onClick={() => window.print()}>
      <Printer />
      Cetak / Simpan PDF
    </Button>
  );
}
