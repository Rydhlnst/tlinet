import { count, eq } from "drizzle-orm";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { AdminShell } from "@/components/admin/admin-shell";
import { ChatPanel } from "@/components/admin/ai/chat-panel";
import { adminAppUserAgent } from "@/lib/admin-app";
import { requireAdmin } from "@/lib/auth";
import { getContent } from "@/lib/data";
import { pendingPaymentProofs } from "@/lib/payments";
import { can } from "@/lib/permissions";
import { requireDb } from "@/lib/db";
import { leads } from "@/lib/db/schema";

export const metadata: Metadata = { title: { default: "Dashboard", template: "%s | Dashboard" }, robots: { index: false } };

export default async function PanelLayout({ children }: LayoutProps<"/admin">) {
  const admin = await requireAdmin();
  const billing = can(admin, "billing");
  const [settings, [{ value: newLeads }], proofs, requestHeaders] = await Promise.all([
    getContent("settings"),
    requireDb().select({ value: count() }).from(leads).where(eq(leads.status, "new")),
    billing ? pendingPaymentProofs() : Promise.resolve({ count: 0, items: [] }),
    headers(),
  ]);
  // Di aplikasi TLINET Admin: hanya Ringkasan dan menu operasional, dan tombol unduh aplikasinya tidak tampil.
  const inAdminApp = (requestHeaders.get("user-agent") ?? "").includes(adminAppUserAgent);

  return (
    <>
      <AdminShell admin={admin} brandName={settings.brandName} newLeads={newLeads} pendingProofs={proofs} appMode={inAdminApp}>
        {children}
      </AdminShell>
      <ChatPanel />
    </>
  );
}
