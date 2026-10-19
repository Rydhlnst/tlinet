import { count, eq } from "drizzle-orm";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { AdminShell } from "@/components/admin/admin-shell";
import { adminAppUserAgent } from "@/lib/admin-app";
import { requireAdmin } from "@/lib/auth";
import { getContent } from "@/lib/data";
import { requireDb } from "@/lib/db";
import { leads } from "@/lib/db/schema";

export const metadata: Metadata = { title: { default: "Dashboard", template: "%s | Dashboard" }, robots: { index: false } };

export default async function PanelLayout({ children }: LayoutProps<"/admin">) {
  const admin = await requireAdmin();
  const [settings, [{ value: newLeads }], requestHeaders] = await Promise.all([
    getContent("settings"),
    requireDb().select({ value: count() }).from(leads).where(eq(leads.status, "new")),
    headers(),
  ]);
  // Di dalam aplikasi TLINET Admin sendiri tombol unduh aplikasinya tidak perlu tampil.
  const inAdminApp = (requestHeaders.get("user-agent") ?? "").includes(adminAppUserAgent);

  return (
    <AdminShell admin={admin} brandName={settings.brandName} newLeads={newLeads} showAppDownload={!inAdminApp}>
      {children}
    </AdminShell>
  );
}
