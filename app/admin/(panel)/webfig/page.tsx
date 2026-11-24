import { Router } from "lucide-react";
import type { Metadata } from "next";
import { PageHero } from "@/components/admin/page-hero";
import { RouterManager } from "@/components/admin/router-manager";
import { requireAdmin } from "@/lib/auth";
import { getContent } from "@/lib/data";
import { can } from "@/lib/permissions";

export const metadata: Metadata = { title: "Winbox" };

export default async function WebfigPage() {
  const admin = await requireAdmin();
  const { links } = await getContent("routers");
  const routers = links.filter((router) => router.label && router.href);

  return (
    <div className="space-y-6">
      <PageHero
        title="Winbox / WebFig"
        accent="WebFig"
        icon={Router}
        description="Pintasan ke WebFig MikroTik untuk mengelola router lewat browser. Dibuka di tab baru dan tetap meminta login RouterOS."
      />
      <RouterManager routers={routers} canEdit={can(admin, "settings")} />
    </div>
  );
}
