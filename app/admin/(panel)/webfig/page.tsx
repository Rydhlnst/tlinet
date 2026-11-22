import { ExternalLink, Router, Settings } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/admin/page-hero";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth";
import { getContent } from "@/lib/data";

export const metadata: Metadata = { title: "Winbox" };

export default async function WebfigPage() {
  await requireAdmin();
  const settings = await getContent("settings");
  const routers = settings.routerLinks.filter((router) => router.label && router.href);

  return (
    <div className="space-y-6">
      <PageHero
        title="Winbox / WebFig"
        accent="WebFig"
        icon={Router}
        description="Pintasan ke WebFig MikroTik untuk mengelola router lewat browser. Dibuka di tab baru dan tetap meminta login RouterOS."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/pages/settings">
              <Settings />
              Kelola daftar router
            </Link>
          </Button>
        }
      />

      {routers.length ? (
        <>
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {routers.map((router) => (
              <li key={`${router.label}-${router.href}`}>
                <a
                  href={router.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex h-full items-center gap-3 rounded-2xl border bg-card p-4 transition-colors hover:border-brand hover:bg-muted/40"
                >
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-ink ring-1 ring-brand/10">
                    <Router className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{router.label}</span>
                    <span className="block truncate text-xs text-muted-foreground">{router.href}</span>
                  </span>
                  <ExternalLink className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-brand-ink" />
                </a>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">
            Catatan: WebFig biasanya berjalan lewat HTTP sehingga tab baru ditandai &ldquo;Not secure&rdquo;, dan umumnya hanya bisa diakses dari jaringan internal atau VPN
            router.
          </p>
        </>
      ) : (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed p-10 text-center">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
            <Router className="size-6" />
          </span>
          <div className="space-y-1">
            <p className="font-medium">Belum ada router</p>
            <p className="mx-auto max-w-md text-sm text-muted-foreground">
              Tambahkan router (nama + alamat WebFig, mis. <code className="rounded bg-muted px-1 py-0.5">http://192.168.88.1</code>) di Pengaturan Situs, lalu pintasannya
              muncul di sini.
            </p>
          </div>
          <Button asChild>
            <Link href="/admin/pages/settings">
              <Settings />
              Tambah router di Pengaturan Situs
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
