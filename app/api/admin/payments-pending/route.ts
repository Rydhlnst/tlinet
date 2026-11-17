import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/auth";
import { pendingPaymentProofs } from "@/lib/payments";
import { can } from "@/lib/permissions";

export const dynamic = "force-dynamic";

/** Bukti transfer pelanggan yang menunggu verifikasi — untuk badge & notifikasi real-time admin. Butuh hak Invoice. */
export async function GET() {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ count: 0, items: [] }, { status: 401 });
  if (!can(admin, "billing")) return NextResponse.json({ count: 0, items: [] });
  return NextResponse.json(await pendingPaymentProofs());
}
