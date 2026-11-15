import type { AdminUser, Permission } from "@/lib/permissions";

/** Warna deret grafik, selaras dengan palet dashboard. */
export type ChartTone = "blue" | "green" | "red" | "amber" | "purple";

/**
 * Spesifikasi grafik yang dikembalikan sebuah tool AI lalu dirender panel chat. Sengaja kecil dan deklaratif: AI cukup
 * menghasilkan datanya, komponen `ChatChart` yang menggambar. Dua bentuk cukup untuk analitik keuangan: batang dan donat.
 */
export type ChartSpec =
  | {
      kind: "bar";
      title?: string;
      /** Format nilai pada label/tooltip. */
      unit?: "rupiah" | "number";
      /** Label sumbu-X, mis. ["Sep 2026", "Okt 2026", ...]. */
      categories: string[];
      series: { label: string; tone?: ChartTone; values: number[] }[];
    }
  | {
      kind: "donut";
      title?: string;
      unit?: "rupiah" | "number";
      segments: { label: string; value: number; tone?: ChartTone }[];
    };

/** Hasil pemanggilan sebuah tool oleh AI. */
export type ToolResult = {
  ok: boolean;
  /** Ringkasan bahasa manusia untuk dirangkai AI dalam jawabannya. */
  summary: string;
  /** Data terstruktur opsional agar AI bisa menjawab tindak lanjut tanpa memanggil ulang. */
  data?: unknown;
  /** Grafik opsional yang dirender di panel chat. */
  chart?: ChartSpec;
  /**
   * Diisi oleh tool PENULIS saat dipanggil tanpa `commit` (pratayang). Panel menampilkan kartu konfirmasi dari sini;
   * perubahan baru dijalankan setelah manusia menekan "Konfirmasi", lalu runtime memanggil ulang tool dengan `commit`.
   */
  confirm?: { title: string; detail: string; danger?: boolean };
  error?: string;
};

export type ToolContext = {
  admin: AdminUser;
  /**
   * Dikendalikan RUNTIME, bukan model. Untuk tool penulis: `false`/kosong = hanya pratayang + minta konfirmasi;
   * `true` = jalankan perubahan sungguhan (hanya diset setelah manusia mengonfirmasi). Model tak pernah mengisi ini.
   */
  commit?: boolean;
};

/**
 * Definisi satu tool yang bisa dipanggil AI. `parameters` memakai JSON Schema (kompatibel dengan format tool-calling
 * OpenAI/MiMo). `readOnly` menandai tool yang hanya membaca — tool penulis (nanti) akan meminta konfirmasi dulu.
 */
export type ToolDef = {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  readOnly: boolean;
  /** Izin minimal pemanggil; `null`/tak diisi = boleh semua admin. */
  permission?: Permission | null;
  handler: (args: Record<string, unknown>, ctx: ToolContext) => Promise<ToolResult>;
};
