"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getAdminWith } from "@/lib/auth";
import type { SaveResult } from "@/lib/cms/store";
import { requireDb } from "@/lib/db";
import { moveToTrash, snapshotRows } from "@/lib/trash";
import { customers, metroOrders, type MetroStepRecord } from "@/lib/db/schema";
import { fromWitaInput, isMetroKind, metroProgress, metroSteps, type MetroKind } from "@/lib/metro";

const expired: SaveResult = { ok: false, message: "Sesi berakhir. Silakan masuk kembali." };
const clean = (value: unknown, max: number) => String(value ?? "").trim().slice(0, max);

function refresh() {
  revalidatePath("/admin/metro");
  revalidatePath("/subnet", "layout");
}

/** Waktu dari isian datetime-local (WITA); kosong berarti sekarang. Waktu di masa depan ditolak. */
function stepTime(value: string): Date | null {
  if (!value) return new Date();
  const date = fromWitaInput(value);
  return date && date.getTime() <= Date.now() + 5 * 60_000 ? date : null;
}

async function loadOrder(id: string) {
  const [order] = await requireDb().select().from(metroOrders).where(eq(metroOrders.id, id)).limit(1);
  return order && isMetroKind(order.kind) ? { ...order, kind: order.kind as MetroKind } : null;
}

/** Membuat progres baru untuk pelanggan; langkah pertama (Registrasi / Permintaan Upgrade) langsung dicatat. */
export async function createMetroOrderAction(input: { customerId: string; kind: string; capacity: string; at: string; note: string }): Promise<SaveResult> {
  const admin = await getAdminWith("metro");
  if (!admin) return expired;
  if (!isMetroKind(input.kind)) return { ok: false, message: "Jenis progres tidak dikenal." };
  const db = requireDb();
  const [customer] = await db.select({ id: customers.id, capacity: customers.capacity }).from(customers).where(eq(customers.id, String(input.customerId))).limit(1);
  if (!customer) return { ok: false, message: "Pilih pelanggan." };
  const capacity = clean(input.capacity, 40);
  if (input.kind === "upgrade" && !capacity) return { ok: false, message: "Isi kapasitas tujuan upgrade." };
  const at = stepTime(clean(input.at, 20));
  if (!at) return { ok: false, message: "Waktu tidak valid atau masih di masa depan." };

  const first = metroSteps[input.kind][0];
  await db.insert(metroOrders).values({
    id: crypto.randomUUID(),
    customerId: customer.id,
    kind: input.kind,
    capacity: capacity || customer.capacity,
    previousCapacity: input.kind === "upgrade" ? customer.capacity : "",
    steps: { [first.key]: { at: at.toISOString(), by: admin.name, ...(clean(input.note, 300) ? { note: clean(input.note, 300) } : {}) } },
  });
  refresh();
  return { ok: true, message: "Progres dibuat." };
}

/**
 * Menandai langkah berikutnya selesai. Saat upgrade selesai, kapasitas di Data Pelanggan ikut diganti dengan kapasitas
 * baru supaya portal dan invoice berikutnya memakai angka yang benar.
 */
export async function advanceMetroStepAction(id: string, input: { at: string; note: string }): Promise<SaveResult> {
  const admin = await getAdminWith("metro");
  if (!admin) return expired;
  const order = await loadOrder(id);
  if (!order) return { ok: false, message: "Progres tidak ditemukan." };
  if (order.status === "rejected") return { ok: false, message: "Progres ini sudah ditolak." };
  const { next, last } = metroProgress(order.kind, order.steps);
  if (!next) return { ok: false, message: "Semua langkah sudah selesai." };
  const at = stepTime(clean(input.at, 20));
  if (!at) return { ok: false, message: "Waktu tidak valid atau masih di masa depan." };
  if (last && at.getTime() < new Date(order.steps[last.key].at).getTime()) return { ok: false, message: `Waktu tidak boleh sebelum langkah "${last.label}".` };

  const note = clean(input.note, 300);
  const record: MetroStepRecord = { at: at.toISOString(), by: admin.name, ...(note ? { note } : {}) };
  const finished = next.key === "done";
  const db = requireDb();
  await db
    .update(metroOrders)
    .set({ steps: { ...order.steps, [next.key]: record }, status: finished ? "done" : "active", updatedAt: new Date() })
    .where(eq(metroOrders.id, id));
  if (finished && order.kind === "upgrade" && order.capacity) {
    await db.update(customers).set({ capacity: order.capacity, updatedAt: new Date() }).where(eq(customers.id, order.customerId));
  }
  refresh();
  return { ok: true, message: `${next.label} ditandai selesai.` };
}

/** Membatalkan langkah terakhir yang ditandai (mis. salah klik). Upgrade yang dibatalkan dari "Selesai" mengembalikan kapasitas lama. */
export async function undoMetroStepAction(id: string): Promise<SaveResult> {
  if (!(await getAdminWith("metro"))) return expired;
  const order = await loadOrder(id);
  if (!order) return { ok: false, message: "Progres tidak ditemukan." };
  const { last, completed } = metroProgress(order.kind, order.steps);
  if (!last || completed <= 1) return { ok: false, message: "Langkah pertama tidak bisa dibatalkan; hapus progresnya bila perlu." };

  const steps = { ...order.steps };
  delete steps[last.key];
  const db = requireDb();
  await db.update(metroOrders).set({ steps, status: "active", rejectReason: "", updatedAt: new Date() }).where(eq(metroOrders.id, id));
  if (last.key === "done" && order.kind === "upgrade" && order.previousCapacity) {
    await db.update(customers).set({ capacity: order.previousCapacity, updatedAt: new Date() }).where(eq(customers.id, order.customerId));
  }
  refresh();
  return { ok: true, message: `${last.label} dibatalkan.` };
}

/** Menolak pengajuan (pelanggan melihat alasannya di portal). */
export async function rejectMetroOrderAction(id: string, reason: string): Promise<SaveResult> {
  if (!(await getAdminWith("metro"))) return expired;
  const order = await loadOrder(id);
  if (!order) return { ok: false, message: "Progres tidak ditemukan." };
  if (order.status === "done") return { ok: false, message: "Progres yang sudah selesai tidak bisa ditolak." };
  const text = clean(reason, 300);
  if (!text) return { ok: false, message: "Isi alasan penolakan." };
  await requireDb().update(metroOrders).set({ status: "rejected", rejectReason: text, updatedAt: new Date() }).where(eq(metroOrders.id, id));
  refresh();
  return { ok: true, message: "Pengajuan ditolak." };
}

export async function reopenMetroOrderAction(id: string): Promise<SaveResult> {
  if (!(await getAdminWith("metro"))) return expired;
  await requireDb().update(metroOrders).set({ status: "active", rejectReason: "", updatedAt: new Date() }).where(eq(metroOrders.id, id));
  refresh();
  return { ok: true, message: "Pengajuan dibuka kembali." };
}

export async function deleteMetroOrderAction(id: string): Promise<SaveResult> {
  const admin = await getAdminWith("metro");
  if (!admin) return expired;
  const saved = await snapshotRows("metroOrders", eq(metroOrders.id, id));
  const order = saved.rows[0] as { customerId?: string; kind?: string } | undefined;
  if (!order) return { ok: false, message: "Progres tidak ditemukan." };
  const [customer] = await requireDb().select({ company: customers.company, name: customers.name }).from(customers).where(eq(customers.id, String(order.customerId ?? ""))).limit(1);
  await moveToTrash({
    kind: "metro",
    label: "Progres Metro",
    title: [customer?.company || customer?.name, order.kind === "upgrade" ? "Upgrade kapasitas" : "Pemasangan baru"].filter(Boolean).join(" · "),
    permission: "metro",
    deletedBy: admin.name || admin.email,
    tables: [saved],
  });
  await requireDb().delete(metroOrders).where(eq(metroOrders.id, id));
  refresh();
  return { ok: true, message: "Progres dihapus." };
}
