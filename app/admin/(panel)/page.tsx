import { count, desc, eq } from "drizzle-orm";
import { ArrowRight, CircleAlert, CircleCheck, Inbox, MapPin, Newspaper, Package, type LucideIcon } from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { accurateMode } from "@/lib/accurate";
import { adminAppUserAgent } from "@/lib/admin-app";
import { requireAdmin } from "@/lib/auth";
import { leadStatusLabels, leadTypeLabels } from "@/lib/cms/entities";
import { pageDefs } from "@/lib/cms/pages";
import { requireDb } from "@/lib/db";
import { articles, coverageAreas, leads, packages } from "@/lib/db/schema";
import { formatDateTime, whatsappUrl } from "@/lib/format";
import { pingR2, storageMode } from "@/lib/storage";

function Stat({ label, value, hint, icon: Icon, href }: { label: string; value: number; hint: string; icon: LucideIcon; href: string }) {
  return (
    <Link href={href} className="group rounded-xl bg-card p-5 ring-1 ring-foreground/10 transition-shadow hover:shadow-md">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>
        <span className="flex size-8 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
          <Icon className="size-4" />
        </span>
      </div>
      <p className="mt-3 text-3xl font-semibold tracking-tight tabular-nums">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </Link>
  );
}

function StatusRow({ ok, title, detail }: { ok: boolean; title: string; detail: string }) {
  return (
    <li className="flex gap-3">
      {ok ? <CircleCheck className="mt-0.5 size-4 shrink-0 text-brand-ink" /> : <CircleAlert className="mt-0.5 size-4 shrink-0 text-amber-600" />}
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs leading-relaxed text-muted-foreground">{detail}</p>
      </div>
    </li>
  );
}

export default async function DashboardPage() {
  const admin = await requireAdmin("dashboard");
  // Aplikasi TLINET Admin hanya untuk menu operasional; halaman awalnya Data Pelanggan.
  if (((await headers()).get("user-agent") ?? "").includes(adminAppUserAgent)) redirect("/admin/data/customers");
  const db = requireDb();
  const [[newLeads], [allLeads], [packageCount], [areaCount], [articleCount], recent, r2Online] = await Promise.all([
    db.select({ value: count() }).from(leads).where(eq(leads.status, "new")),
    db.select({ value: count() }).from(leads),
    db.select({ value: count() }).from(packages).where(eq(packages.active, true)),
    db.select({ value: count() }).from(coverageAreas).where(eq(coverageAreas.active, true)),
    db.select({ value: count() }).from(articles).where(eq(articles.status, "published")),
    db.select().from(leads).orderBy(desc(leads.createdAt)).limit(6),
    storageMode === "r2" ? pingR2() : Promise.resolve(false),
  ]);

  const storage =
    storageMode === "r2"
      ? r2Online
        ? { ok: true, detail: "Cloudflare R2 terhubung. Gambar unggahan disimpan di bucket." }
        : { ok: false, detail: "Cloudflare R2 sudah diatur tetapi bucket tidak dapat dijangkau. Periksa kredensial R2." }
      : storageMode === "incomplete"
        ? { ok: false, detail: "Variabel R2 belum lengkap. Unggahan ditolak sampai semua R2_* terisi atau dikosongkan." }
        : { ok: true, detail: "Cloudflare R2 belum diatur. Gambar unggahan disimpan di database Neon." };

  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Ringkasan</h1>
        <p className="mt-1 text-sm text-muted-foreground">Selamat datang, {admin.name}. Semua isi situs publik diatur dari sini.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Prospek baru" value={newLeads.value} hint={`${allLeads.value} total kiriman formulir`} icon={Inbox} href="/admin/data/leads" />
        <Stat label="Paket aktif" value={packageCount.value} hint="Tampil di beranda" icon={Package} href="/admin/data/packages" />
        <Stat label="Titik jangkauan" value={areaCount.value} hint="Tampil di peta" icon={MapPin} href="/admin/data/coverage-areas" />
        <Stat label="Artikel terbit" value={articleCount.value} hint="Tampil di halaman berita" icon={Newspaper} href="/admin/data/articles" />
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Prospek terbaru</CardTitle>
            <CardDescription>Kiriman formulir pendaftaran dan pengecekan area.</CardDescription>
            <CardAction>
              <Button asChild variant="outline" size="sm">
                <Link href="/admin/data/leads">
                  Lihat semua
                  <ArrowRight />
                </Link>
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            {recent.length ? (
              <ul className="divide-y">
                {recent.map((lead) => (
                  <li key={lead.id} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{lead.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {leadTypeLabels[lead.type as keyof typeof leadTypeLabels] ?? lead.type}
                        {lead.city && ` · ${lead.city}`} · {formatDateTime(lead.createdAt)}
                      </p>
                    </div>
                    <Badge variant={lead.status === "new" ? "default" : "secondary"}>
                      {leadStatusLabels[lead.status as keyof typeof leadStatusLabels] ?? lead.status}
                    </Badge>
                    <Button asChild variant="outline" size="sm">
                      <a href={whatsappUrl(lead.phone)} target="_blank" rel="noopener noreferrer">
                        WhatsApp
                      </a>
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">Belum ada kiriman formulir dari pengunjung.</p>
            )}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Status sistem</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="flex flex-col gap-4">
                <StatusRow ok title="Database" detail="Neon Postgres terhubung." />
                <StatusRow ok={storage.ok} title="Penyimpanan media" detail={storage.detail} />
                <StatusRow
                  ok={accurateMode === "ready"}
                  title="Pencatatan Accurate"
                  detail={accurateMode === "ready" ? "Kredensial Accurate Online terpasang." : "Accurate Online belum dihubungkan."}
                />
              </ul>
              <Button asChild variant="outline" size="sm" className="mt-4">
                <Link href="/admin/accurate">
                  Buka Pencatatan Accurate
                  <ArrowRight />
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Ubah isi halaman</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="-mx-2 flex flex-col">
                {pageDefs.map((page) => (
                  <li key={page.key}>
                    <Link href={`/admin/pages/${page.key}`} className="flex items-center justify-between rounded-lg px-2 py-2 text-sm hover:bg-muted">
                      {page.label}
                      <ArrowRight className="size-4 text-muted-foreground" />
                    </Link>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
