import { count, eq } from "drizzle-orm";
import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/admin-shell";
import { requireAdmin } from "@/lib/auth";
import { getContent } from "@/lib/data";
import { requireDb } from "@/lib/db";
import { leads } from "@/lib/db/schema";

export const metadata: Metadata = { title: { default: "Dashboard", template: "%s | Dashboard" }, robots: { index: false } };

export default async function PanelLayout({ children }: LayoutProps<"/admin">) {
  const admin = await requireAdmin();
  const [settings, [{ value: newLeads }]] = await Promise.all([
    getContent("settings"),
    requireDb().select({ value: count() }).from(leads).where(eq(leads.status, "new")),
  ]);

  return (
    <AdminShell admin={admin} brandName={settings.brandName} newLeads={newLeads}>
      {children}
    </AdminShell>
  );
}
