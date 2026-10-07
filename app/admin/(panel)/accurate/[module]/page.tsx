import { ChevronLeft, ChevronRight, CircleAlert, ExternalLink, Search } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AccurateFormButton } from "@/components/admin/accurate-form";
import { AccurateReport } from "@/components/admin/accurate-report";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { accurateMode, accurateWriteEnabled, getAccountBalances, getAccurateDatabase, isoDate, listAccurate } from "@/lib/accurate";
import { getAccurateForm } from "@/lib/accurate-forms";
import { accurateWebUrl, getAccurateModule, type AccurateColumn, type AccurateModule, type AccurateResource } from "@/lib/accurate-features";
import { requireAdmin } from "@/lib/auth";
import { formatDate, formatRupiah } from "@/lib/format";
import { cn } from "@/lib/utils";

const pageSize = 25;

export async function generateMetadata({ params }: PageProps<"/admin/accurate/[module]">): Promise<Metadata> {
  return { title: getAccurateModule((await params).module)?.label };
}

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? "";
const errorText = (error: unknown) => (error instanceof Error ? error.message : "Accurate tidak dapat dijangkau.");

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex gap-3 rounded-xl border bg-card p-5 text-sm leading-relaxed text-muted-foreground">
      <CircleAlert className="mt-0.5 size-4 shrink-0 text-amber-600" />
      <span>{children}</span>
    </p>
  );
}

function Cell({ column, row }: { column: AccurateColumn; row: Record<string, unknown> }) {
  const value = column.key.split(".").reduce<unknown>((current, key) => (current as Record<string, unknown> | null)?.[key], row);
  if (column.type === "flag") return value === true ? "Ya" : <span className="text-muted-foreground">—</span>;
  if (value == null || value === "") return <span className="text-muted-foreground">—</span>;
  if (column.type === "currency") return <span className="whitespace-nowrap tabular-nums">{formatRupiah(Number(value) || 0)}</span>;
  if (column.type === "date") return <span className="whitespace-nowrap text-muted-foreground">{formatDate(isoDate(value)) || String(value)}</span>;
  const text = column.labels?.[String(value)] ?? String(value);
  if (column.key === "statusName") return <Badge variant={text === "Lunas" ? "default" : "secondary"}>{text}</Badge>;
  return text;
}

async function ResourceList({ feature, resource, keywords, page }: { feature: AccurateModule; resource: AccurateResource; keywords: string; page: number }) {
  const href = (next: { tab?: string; q?: string; page?: number }) => {
    const query = new URLSearchParams();
    const tab = next.tab ?? resource.key;
    if (tab !== feature.resources[0].key) query.set("tab", tab);
    if (next.q) query.set("q", next.q);
    if (next.page && next.page > 1) query.set("page", String(next.page));
    return `/admin/accurate/${feature.key}${query.size ? `?${query}` : ""}`;
  };

  const fields = [...new Set(["id", ...resource.columns.map((column) => column.key.split(".")[0])])].join(",");
  const data = await listAccurate(resource.path, { fields, page, pageSize, keywords, sort: resource.sort, filter: resource.filter }).catch((error: unknown) => ({ error: errorText(error) }));

  return (
    <>
      {feature.resources.length > 1 && (
        <nav className="flex flex-wrap gap-1.5" aria-label={`Data ${feature.label}`}>
          {feature.resources.map((item) => (
            <Link
              key={item.key}
              href={href({ tab: item.key })}
              aria-current={item.key === resource.key ? "page" : undefined}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
                item.key === resource.key ? "border-primary bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      )}

      {"error" in data ? (
        <Notice>Data {resource.label} tidak dapat dimuat: {data.error}</Notice>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          <div className="flex items-center justify-between gap-3 border-b p-3">
            <form className="relative w-full max-w-xs" role="search">
              {resource.key !== feature.resources[0].key && <input type="hidden" name="tab" value={resource.key} />}
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input name="q" defaultValue={keywords} placeholder={`Cari ${resource.label.toLowerCase()}…`} aria-label={`Cari ${resource.label}`} className="pl-8" />
            </form>
            <div className="flex shrink-0 items-center gap-3">
              <p className="text-xs text-muted-foreground">{data.rowCount} data</p>
              {accurateWriteEnabled && getAccurateForm(resource.path) && <AccurateFormButton path={resource.path} />}
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                {resource.columns.map((column) => (
                  <TableHead key={column.key} className="first:pl-4 last:pr-4">
                    {column.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.rows.map((row) => (
                <TableRow key={String(row.id)}>
                  {resource.columns.map((column, index) => (
                    <TableCell key={column.key} className={cn("first:pl-4 last:pr-4", index === 0 && "font-medium whitespace-nowrap")}>
                      <Cell column={column} row={row} />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
              {data.rows.length === 0 && (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={resource.columns.length} className="h-32 text-center text-muted-foreground">
                    {keywords ? "Tidak ada data yang cocok dengan pencarian." : `Belum ada data ${resource.label.toLowerCase()} di Accurate.`}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          {data.pageCount > 1 && (
            <div className="flex items-center justify-between gap-3 border-t p-3">
              <p className="text-xs text-muted-foreground">
                Halaman {page} dari {data.pageCount}
              </p>
              <div className="flex gap-2">
                {page > 1 && (
                  <Button asChild variant="outline" size="sm">
                    <Link href={href({ q: keywords, page: page - 1 })}>
                      <ChevronLeft />
                      Sebelumnya
                    </Link>
                  </Button>
                )}
                {page < data.pageCount && (
                  <Button asChild variant="outline" size="sm">
                    <Link href={href({ q: keywords, page: page + 1 })}>
                      Berikutnya
                      <ChevronRight />
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}

async function Report() {
  const accounts = await getAccountBalances().catch((error: unknown) => ({ error: errorText(error) }));
  return "error" in accounts ? <Notice>Saldo akun tidak dapat dimuat: {accounts.error}</Notice> : <AccurateReport accounts={accounts} />;
}

export default async function AccurateModulePage({ params, searchParams }: PageProps<"/admin/accurate/[module]">) {
  await requireAdmin();
  const feature = getAccurateModule((await params).module);
  if (!feature) notFound();
  const query = await searchParams;
  const resource = feature.resources.find((item) => item.key === first(query.tab)) ?? feature.resources[0];
  const openUrl = accurateMode === "ready" ? await getAccurateDatabase().then((database) => database.host, () => accurateWebUrl) : accurateWebUrl;
  const Icon = feature.icon;

  return (
    <>
      <nav className="flex items-center gap-2 text-sm" aria-label="Jejak halaman">
        <Link href="/admin/accurate" className="font-medium text-brand-ink underline-offset-4 hover:underline">
          Pencatatan Accurate
        </Link>
        <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />
        <span className="text-muted-foreground">{feature.label}</span>
      </nav>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand-ink">
            <Icon className="size-5" />
          </span>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{feature.label}</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{feature.description}</p>
          </div>
        </div>
        <Button asChild variant="outline" size="lg" className="shrink-0">
          <a href={openUrl} target="_blank" rel="noopener noreferrer">
            Buka di Accurate
            <ExternalLink />
          </a>
        </Button>
      </div>

      {accurateMode !== "ready" ? (
        <Notice>Accurate belum dihubungkan, jadi datanya belum bisa ditampilkan. Lihat status koneksi di halaman Pencatatan Accurate.</Notice>
      ) : feature.report ? (
        <Report />
      ) : resource ? (
        <ResourceList feature={feature} resource={resource} keywords={first(query.q).trim().slice(0, 80)} page={Math.max(1, Math.floor(Number(first(query.page))) || 1)} />
      ) : (
        <Notice>Modul ini belum punya data yang bisa ditampilkan di dashboard. Buka langsung di Accurate lewat tombol di atas.</Notice>
      )}
    </>
  );
}
