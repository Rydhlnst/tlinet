import { can, type AdminUser } from "@/lib/permissions";
import { contentTools } from "./tools/content";
import { dataTools } from "./tools/data";
import { financeTools } from "./tools/finance";
import type { ToolContext, ToolDef, ToolResult } from "./types";

/** Semua tool yang bisa dipanggil AI: analitik keuangan (baca), CRUD data (non-keuangan), dan penyunting konten (draf). */
export const allTools: ToolDef[] = [...financeTools, ...dataTools, ...contentTools];

const byName = new Map(allTools.map((tool) => [tool.name, tool]));

const allowed = (admin: AdminUser, tool: ToolDef) => !tool.permission || tool.permission === "any" || can(admin, tool.permission);

export function getTool(name: string): ToolDef | undefined {
  return byName.get(name);
}

/** Tool yang boleh dipakai admin ini sesuai izinnya — inilah daftar yang dikirim ke model. */
export function toolsFor(admin: AdminUser): ToolDef[] {
  return allTools.filter((tool) => allowed(admin, tool));
}

/** Menjalankan sebuah tool dengan pengecekan izin dan penangkap error. Selalu mengembalikan ToolResult, tak pernah melempar. */
export async function runTool(name: string, args: Record<string, unknown>, ctx: ToolContext): Promise<ToolResult> {
  const tool = byName.get(name);
  if (!tool) return { ok: false, summary: "", error: `Tool tidak dikenal: ${name}.` };
  if (!allowed(ctx.admin, tool)) return { ok: false, summary: "", error: "Anda tidak punya akses ke data ini." };
  try {
    return await tool.handler(args ?? {}, ctx);
  } catch (error) {
    return { ok: false, summary: "", error: error instanceof Error ? error.message : "Terjadi kesalahan saat menjalankan tool." };
  }
}
