import { entityDefs } from "@/lib/cms/entities";
import { pageDefs } from "@/lib/cms/pages";
import { currentMonth } from "@/lib/finance-analytics";
import { can, type AdminUser } from "@/lib/permissions";
import type { ApiMessage, StreamEvent } from "./chat-types";
import { getTool, runTool, toolsFor } from "./registry";
import type { ToolDef } from "./types";

/** Konfigurasi model MiMo (OpenAI-compatible). Isi di .env. `MIMO_API_URL` = base atau URL chat completions penuh. */
export const aiConfig = {
  url: process.env.MIMO_API_URL ?? "",
  model: process.env.MIMO_MODEL ?? "",
  key: process.env.MIMO_API_KEY ?? "",
};

export const isAiConfigured = () => Boolean(aiConfig.url && aiConfig.model && aiConfig.key);

function completionsUrl() {
  const url = aiConfig.url.replace(/\/+$/, "");
  return /\/(chat\/)?completions$/.test(url) ? aiConfig.url : `${url}/chat/completions`;
}

const MAX_STEPS = 6;
/** Buku besar keuangan — hanya-baca bagi AI (selaras dengan tools/data.ts). */
const FINANCE_READONLY = new Set(["invoices", "customer-payments", "customer-purchases", "salaries", "data-center-payments"]);

/** Label aktivitas singkat untuk indikator panel saat sebuah tool berjalan. */
function toolLabel(name: string): string {
  if (name.startsWith("finance_")) return "Menganalisa keuangan…";
  if (name === "data_create" || name === "data_update" || name === "data_delete") return "Menyiapkan perubahan…";
  if (name.startsWith("data_")) return "Mengecek data…";
  if (name === "content_update" || name === "content_publish" || name === "content_discard") return "Menyiapkan perubahan konten…";
  if (name.startsWith("content_")) return "Mengecek konten…";
  return "Memproses…";
}

/** Katalog ringkas jenis data + halaman, supaya model jarang perlu memanggil data_catalog/content_catalog dulu. */
function catalog(): string {
  const entities = entityDefs
    .map((entity) => {
      if (FINANCE_READONLY.has(entity.key)) return `• ${entity.key} (${entity.label}) [KEUANGAN — hanya-baca]`;
      return `• ${entity.key} (${entity.label}) — field: ${entity.fields.map((field) => field.name).join(", ")}`;
    })
    .join("\n");
  const pages = pageDefs.map((page) => `${page.key} (${page.label})`).join("; ");
  return `Jenis data:\n${entities}\n\nHalaman konten yang bisa diubah: ${pages}`;
}

function systemPrompt(admin: AdminUser): string {
  const now = new Date();
  const tanggal = new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Makassar" }).format(now);
  const role = admin.role === "owner" ? "owner (akses penuh ke semua menu)" : `staf — hak akses: ${admin.permissions.join(", ") || "terbatas"}`;
  return [
    `Kamu adalah asisten admin untuk dashboard PT Trans Link Internasional (TLINET), sebuah ISP.`,
    `Pengguna: ${admin.name} — ${role}.`,
    `Sekarang: ${tanggal} WITA. Bulan berjalan: ${currentMonth()}. Gunakan ini saat pengguna menyebut "bulan ini", "hari ini", dll.`,
    "",
    "Kemampuanmu lewat tool:",
    "- Analisa keuangan + grafik (hanya-baca): finance_overview, finance_cashflow, finance_invoices, finance_receivables, finance_payables.",
    "- Kelola data: data_catalog, data_list, data_get, data_create, data_update, data_delete.",
    "- Ubah tampilan/isi halaman situs: content_catalog, content_get, content_update, content_publish, content_discard.",
    "",
    catalog(),
    "",
    "Aturan penting:",
    "- Data KEUANGAN (invoice, pembayaran, pembelian, gaji) hanya boleh DIBACA. Jangan coba mengubahnya.",
    "- Katalog field di atas sudah cukup untuk sebagian besar create/update — panggil data_catalog hanya bila perlu detail/pilihan. Untuk mengisi field pilihan ber-id (pelanggan, kategori, dll.), cari id-nya dengan data_list.",
    "- Perubahan data/konten BUTUH konfirmasi pengguna. Sistem menampilkan tombol konfirmasi otomatis saat kamu memanggil tool penulis. JANGAN mengaku perubahan sudah selesai sebelum sistem memberi tahu hasilnya.",
    "- Panggil satu tool penulis CUKUP SEKALI per permintaan. Setelah sistem menyatakan berhasil, jangan memanggilnya lagi untuk permintaan yang sama.",
    "- Perubahan konten/tampilan masuk ke DRAF dulu (tidak langsung tampil). Setelah pengguna puas, tawarkan content_publish.",
    "- Bila permintaan ambigu (terutama untuk mengubah/menghapus), tanyakan dulu satu hal singkat sebelum bertindak.",
    "- Selalu pakai tool untuk angka/data nyata; jangan mengarang.",
    "- Tulis jawaban dengan Markdown (tebal, daftar berpoin/bernomor) agar mudah dibaca, dan ringkas.",
  ].join("\n");
}

function toOpenAiTool(tool: ToolDef) {
  return { type: "function" as const, function: { name: tool.name, description: tool.description, parameters: tool.parameters } };
}

/** Isi pesan tool yang dikirim kembali ke model: ringkasan + data ringkas, tanpa JSON grafik. */
function toolMessageContent(summary: string, data: unknown, hasChart: boolean, error?: string) {
  if (error) return `GAGAL: ${error}`;
  const parts = [summary || "(berhasil)"];
  if (data !== undefined) parts.push(`[data]: ${JSON.stringify(data).slice(0, 3000)}`);
  if (hasChart) parts.push("(grafik sudah ditampilkan ke pengguna)");
  return parts.join("\n");
}

type Accum = { content: string; toolCalls: { id: string; name: string; args: string }[] };

/** Mengalirkan satu respons model (stream:true), mengisi `out`, dan meng-`yield` tiap potongan teks. */
async function* streamModel(history: ApiMessage[], tools: ReturnType<typeof toOpenAiTool>[], out: Accum): AsyncGenerator<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 120_000);
  let response: Response;
  try {
    response = await fetch(completionsUrl(), {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${aiConfig.key}` },
      body: JSON.stringify({ model: aiConfig.model, messages: history, tools, tool_choice: "auto", temperature: 0.2, stream: true }),
      signal: controller.signal,
    });
  } catch (error) {
    clearTimeout(timer);
    throw new Error(controller.signal.aborted ? "AI tidak merespons (waktu habis). Coba lagi." : `Gagal menghubungi AI: ${error instanceof Error ? error.message : "kesalahan jaringan"}.`);
  }
  if (!response.ok || !response.body) {
    clearTimeout(timer);
    throw new Error(`Model menjawab ${response.status}: ${(await response.text().catch(() => "")).slice(0, 300)}`);
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let index: number;
      while ((index = buffer.indexOf("\n\n")) >= 0) {
        const part = buffer.slice(0, index);
        buffer = buffer.slice(index + 2);
        const line = part.split("\n").find((item) => item.startsWith("data:"));
        if (!line) continue;
        const data = line.slice(5).trim();
        if (data === "[DONE]") return;
        let json: { choices?: { delta?: { content?: string; tool_calls?: { index?: number; id?: string; function?: { name?: string; arguments?: string } }[] } }[] };
        try {
          json = JSON.parse(data);
        } catch {
          continue;
        }
        const delta = json.choices?.[0]?.delta;
        if (!delta) continue;
        if (delta.content) {
          out.content += delta.content;
          yield delta.content;
        }
        if (Array.isArray(delta.tool_calls)) {
          for (const fragment of delta.tool_calls) {
            const i = fragment.index ?? 0;
            const current = out.toolCalls[i] ?? (out.toolCalls[i] = { id: "", name: "", args: "" });
            if (fragment.id) current.id = fragment.id;
            if (fragment.function?.name) current.name += fragment.function.name;
            if (fragment.function?.arguments) current.args += fragment.function.arguments;
          }
        }
      }
    }
  } finally {
    clearTimeout(timer);
    reader.releaseLock();
  }
}

const strip = (history: ApiMessage[]) => history.filter((message) => message.role !== "system");

/**
 * Menjalankan satu giliran percakapan dan MENGALIRKAN event-nya. Tool HANYA-BACA dijalankan langsung; tool penulis
 * BERHENTI untuk konfirmasi (tidak dijalankan di sini). Semua tool_call tetap dijawab agar riwayat valid.
 */
export async function* streamChatTurn(messages: ApiMessage[], admin: AdminUser): AsyncGenerator<StreamEvent> {
  if (!isAiConfigured()) {
    yield { type: "error", error: "AI belum dikonfigurasi. Isi MIMO_API_URL, MIMO_MODEL, dan MIMO_API_KEY di server." };
    return;
  }
  const tools = toolsFor(admin).map(toOpenAiTool);
  const history: ApiMessage[] = [{ role: "system", content: systemPrompt(admin) }, ...messages.filter((message) => message.role !== "system")];

  try {
    for (let step = 0; step < MAX_STEPS; step++) {
      const out: Accum = { content: "", toolCalls: [] };
      for await (const piece of streamModel(history, tools, out)) yield { type: "delta", text: piece };

      const calls = out.toolCalls.filter(Boolean);
      const assistant: ApiMessage = { role: "assistant", content: out.content || null };
      if (calls.length) assistant.tool_calls = calls.map((call) => ({ id: call.id || `call_${Math.random().toString(36).slice(2)}`, type: "function", function: { name: call.name, arguments: call.args } }));
      history.push(assistant);

      if (!calls.length) {
        if (!out.content.trim()) yield { type: "delta", text: "Maaf, saya belum bisa menjawab itu. Coba perjelas permintaannya." };
        break;
      }

      let pending = false;
      for (const call of assistant.tool_calls!) {
        const tool = getTool(call.function.name);
        let args: Record<string, unknown> = {};
        try {
          args = call.function.arguments ? JSON.parse(call.function.arguments) : {};
        } catch {
          /* argumen rusak → kosong */
        }
        yield { type: "tool", label: toolLabel(call.function.name) };
        if (tool && !tool.readOnly) {
          const preview = await runTool(tool.name, args, { admin, commit: false });
          if (!pending && preview.ok && preview.confirm) {
            pending = true;
            yield { type: "pending", pending: { tool: tool.name, args, confirm: preview.confirm } };
          }
          history.push({ role: "tool", tool_call_id: call.id, content: preview.ok ? "Perubahan ini sedang ditangani sistem konfirmasi pengguna. JANGAN panggil tool penulis lagi untuk permintaan ini; tunggu hasil dari sistem." : `GAGAL: ${preview.error}` });
          continue;
        }
        const result = await runTool(call.function.name, args, { admin });
        if (result.chart) yield { type: "chart", chart: result.chart };
        history.push({ role: "tool", tool_call_id: call.id, content: toolMessageContent(result.summary, result.data, Boolean(result.chart), result.ok ? undefined : result.error) });
      }
      if (pending) break;
    }
  } catch (error) {
    yield { type: "error", error: error instanceof Error ? error.message : "Gagal menghubungi AI." };
    return;
  }
  yield { type: "done", messages: strip(history) };
}
