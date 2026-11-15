import type { ChartSpec } from "./types";

/** Format pesan ala OpenAI/MiMo — sumber kebenaran percakapan yang dikirim bolak-balik klien↔server tiap giliran. */
export type ApiMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content?: string | null;
  tool_calls?: { id: string; type: "function"; function: { name: string; arguments: string } }[];
  tool_call_id?: string;
};

/** Item yang dirender di linimasa chat untuk SATU giliran: teks asisten atau grafik dari sebuah tool. */
export type DisplayItem = { type: "text"; text: string } | { type: "chart"; chart: ChartSpec };

/** Tindakan tulis yang menunggu konfirmasi manusia sebelum dijalankan. */
export type PendingWrite = { tool: string; args: Record<string, unknown>; confirm: { title: string; detail: string; danger?: boolean } };

/** Balasan endpoint chat untuk satu giliran. `messages` menggantikan riwayat klien; `pending` bila ada tulis menunggu konfirmasi. */
export type ChatResponse = {
  messages: ApiMessage[];
  display: DisplayItem[];
  pending?: PendingWrite;
  configured: boolean;
  error?: string;
};

/**
 * Event yang dialirkan endpoint chat (SSE) selama satu giliran:
 * - `tool`  : sebuah tool mulai dijalankan (untuk indikator aktivitas).
 * - `chart` : grafik dari tool baca, untuk dirender.
 * - `delta` : potongan teks jawaban asisten (streaming).
 * - `pending`: tool penulis menunggu konfirmasi manusia.
 * - `done`  : akhir giliran; `messages` adalah riwayat baru untuk disimpan klien.
 * - `error` : kesalahan.
 */
export type StreamEvent =
  | { type: "tool"; label: string }
  | { type: "chart"; chart: import("./types").ChartSpec }
  | { type: "delta"; text: string }
  | { type: "pending"; pending: PendingWrite }
  | { type: "done"; messages: ApiMessage[] }
  | { type: "error"; error: string };
