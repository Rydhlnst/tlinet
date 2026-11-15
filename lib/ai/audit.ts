import { desc } from "drizzle-orm";
import { requireDb } from "@/lib/db";
import { aiAuditLog } from "@/lib/db/schema";
import type { AdminUser } from "@/lib/permissions";

/** Mencatat satu tindakan tulis AI ke jejak audit. Dipanggil hanya SETELAH perubahan berhasil dijalankan. */
export async function recordAudit(input: { admin: AdminUser; tool: string; entity?: string; recordId?: string; summary: string; detail?: unknown }) {
  try {
    await requireDb()
      .insert(aiAuditLog)
      .values({
        id: crypto.randomUUID(),
        actorEmail: input.admin.email,
        actorName: input.admin.name,
        tool: input.tool,
        entity: input.entity ?? "",
        recordId: input.recordId ?? "",
        summary: input.summary,
        detail: (input.detail ?? null) as object | null,
      });
  } catch {
    // Jejak audit tidak boleh menggagalkan tindakan utama yang sudah berhasil.
  }
}

/** Riwayat audit AI terbaru, untuk ditinjau admin. */
export async function recentAudit(limit = 50) {
  return requireDb().select().from(aiAuditLog).orderBy(desc(aiAuditLog.createdAt)).limit(limit);
}
