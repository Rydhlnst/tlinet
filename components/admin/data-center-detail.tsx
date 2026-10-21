"use client";

import { ArrowLeft, ChartLine, ChevronRight, Ellipsis, Network, Pencil, Plus, ReceiptText, Server, StickyNote, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { mrtgSourceOptionsAction } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { dataCenterStatusLabels, getEntityDef, paymentStatusLabels } from "@/lib/cms/entities";
import type { dataCenterPayments, dataCenters } from "@/lib/db/schema";
import { formatDate, formatMonth, formatRupiah } from "@/lib/format";
import { cn } from "@/lib/utils";
import { AmountSummary } from "./amount-summary";
import { DataCenterLive } from "./data-center-live";
import { InfoList, Panel, StatusPill } from "./detail-panels";
import { EditableAvatar } from "./editable-avatar";
import { PageHero } from "./page-hero";
import { ProofViewer } from "./proof-viewer";
import { DeleteRecordDialog, RecordDetailDialog, RecordSheet, type Row } from "./record-dialogs";
import { StatusToggle } from "./status-toggle";

type DataCenter = typeof dataCenters.$inferSelect;
type Payment = typeof dataCenterPayments.$inferSelect;

const listPath = "/admin/data/data-centers";
const paymentsKey = "data-center-payments";

/** Tanggal hari ini menurut jam perangkat, "YYYY-MM-DD". */
function today() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

/** Halaman detail satu Data Center: informasi layanan dan jaringan, grafik MRTG, dan riwayat pembayarannya. */
export function DataCenterDetail({
  dataCenter,
  payments,
  range,
  ranges,
  sourceLabel,
  live,
}: {
  dataCenter: DataCenter;
  payments: Payment[];
  range: string;
  /** Rentang grafik MRTG (1 hari, 1 minggu, 1 bulan); yang pertama adalah bawaan. */
  ranges: { key: string; label: string }[];
  /** Nama singkat sumber grafik ("Port #2533"); `null` bila belum diatur. Nama lengkapnya dimuat dari LibreNMS. */
  sourceLabel: string | null;
  /** MRTG Real time: tersedia untuk sumber port; `note` menjelaskan bila tidak. */
  live: { available: boolean; capacityBps: number; note: string };
}) {
  const [sourceName, setSourceName] = useState<string | null>(null);
  const source = dataCenter.mrtgSource;
  useEffect(() => {
    if (!source) return;
    mrtgSourceOptionsAction().then((list) => setSourceName(list.find((option) => option.value === source)?.label ?? null));
  }, [source]);
  const sourceText = sourceName ?? sourceLabel;
  const [editing, setEditing] = useState<Row | null>(null);
  const [editingPayment, setEditingPayment] = useState<Row | null>(null);
  const [viewing, setViewing] = useState<Row | null>(null);
  const [removing, setRemoving] = useState<Row | null>(null);
  const summary = getEntityDef(paymentsKey)?.summary;
  const basePath = `${listPath}/${dataCenter.id}`;
  const graphSrc = `/admin/data-centers/${dataCenter.id}/traffic?range=${range}`;

  const statusPill = (
    <StatusPill tone={dataCenter.status === "active" ? "good" : "muted"}>{dataCenterStatusLabels[dataCenter.status] ?? dataCenter.status}</StatusPill>
  );
  const edit = () => setEditing({ ...dataCenter, mrtgSource: dataCenter.mrtgSource || "-" });

  return (
    <>
      <nav className="flex items-center gap-2 text-sm" aria-label="Jejak halaman">
        <Link href={listPath} className="font-medium text-brand-ink underline-offset-4 hover:underline">
          Data Center
        </Link>
        <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />
        <span className="text-muted-foreground">Detail Data Center</span>
      </nav>

      <PageHero
        title="Detail Data Center"
        icon={Server}
        description={<>Informasi layanan, jaringan, grafik MRTG, dan riwayat pembayaran ke Data Center ini.</>}
        actions={
          <>
            <Button asChild variant="outline" size="lg">
              <Link href={listPath}>
                <ArrowLeft />
                Kembali ke Data Center
              </Link>
            </Button>
            <Button size="lg" onClick={edit}>
              <Pencil />
              Edit Data
            </Button>
          </>
        }
      />

      <section className="flex flex-col gap-6 rounded-xl border bg-card p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-5">
          <EditableAvatar kind="data-centers" id={dataCenter.id} name={dataCenter.company} photo={dataCenter.photoUrl} />
          <div className="flex min-w-0 flex-col items-start gap-1.5">
            <p className="max-w-full truncate text-xl font-semibold">{dataCenter.company}</p>
            {dataCenter.service && <p className="max-w-full truncate text-sm text-muted-foreground">{dataCenter.service}</p>}
            {statusPill}
            {dataCenter.startDate && <p className="text-sm text-muted-foreground">Layanan sejak {formatDate(dataCenter.startDate)}</p>}
          </div>
        </div>
        <dl className="grid grid-cols-3 gap-x-8 gap-y-2 text-sm lg:shrink-0">
          {[
            ["Interkoneksi", dataCenter.interconnection],
            ["Kapasitas", dataCenter.capacity],
            ["VLAN", dataCenter.vlan],
          ].map(([label, value]) => (
            <div key={label} className="flex min-w-0 flex-col gap-1.5">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="font-semibold break-words">{value || "—"}</dd>
            </div>
          ))}
        </dl>
      </section>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <Panel icon={Server} title="Informasi Layanan">
          <InfoList
            items={[
              ["PT", dataCenter.company],
              ["Interkoneksi", dataCenter.interconnection],
              ["Service Layanan", dataCenter.service],
              ["Tanggal", dataCenter.startDate ? formatDate(dataCenter.startDate) : ""],
              ["Kapasitas Bandwidth", dataCenter.capacity],
              ["Biaya Bulanan", dataCenter.monthlyFee ? formatRupiah(dataCenter.monthlyFee) : ""],
              ["Status", statusPill],
            ]}
          />
        </Panel>
        <Panel icon={Network} title="Jaringan">
          <InfoList
            items={[
              ["IPv4", dataCenter.ipv4],
              ["IPv6", dataCenter.ipv6],
              ["VLAN", dataCenter.vlan],
              ["Grafik MRTG", sourceText ?? ""],
            ]}
          />
        </Panel>
      </div>

      <DataCenterLive id={dataCenter.id} available={live.available} capacityBps={live.capacityBps} note={live.note} />

      <Panel
        icon={ChartLine}
        title="Grafik MRTG"
        action={
          sourceLabel ? (
            <nav className="flex rounded-full bg-muted p-1 text-xs" aria-label="Rentang grafik">
              {ranges.map(({ key, label }, index) => (
                <Link
                  key={key}
                  href={index === 0 ? basePath : `${basePath}?rentang=${key}`}
                  scroll={false}
                  replace
                  aria-current={key === range ? "page" : undefined}
                  className={cn("rounded-full px-3 py-1 font-semibold whitespace-nowrap", key === range ? "bg-background text-foreground shadow-sm" : "text-muted-foreground")}
                >
                  {label}
                </Link>
              ))}
            </nav>
          ) : undefined
        }
      >
        {sourceLabel ? (
          <div className="flex flex-col gap-3 p-4 sm:p-5">
            <a href={graphSrc} target="_blank" rel="noopener" title="Buka grafik ukuran penuh" className="overflow-hidden rounded-xl border bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={graphSrc} alt={`Grafik trafik ${dataCenter.company} ${ranges.find((item) => item.key === range)?.label ?? ""} terakhir`} width={1000} height={300} className="h-auto w-full" />
            </a>
            <p className="text-xs text-muted-foreground">Klik grafik untuk ukuran penuh. {sourceText} · sumber MRTG (LibreNMS).</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 px-5 py-12 text-center text-sm text-muted-foreground">
            <p>Grafik MRTG belum diatur. Pilih port atau antrean QoS Data Center ini di LibreNMS.</p>
            <Button variant="outline" onClick={edit}>
              <Pencil />
              Atur Grafik MRTG
            </Button>
          </div>
        )}
      </Panel>

      {dataCenter.note && (
        <Panel icon={StickyNote} title="Keterangan">
          <p className="p-5 text-sm leading-relaxed whitespace-pre-line">{dataCenter.note}</p>
        </Panel>
      )}

      <Panel
        icon={ReceiptText}
        title="Riwayat Pembayaran"
        action={
          <Button
            variant="outline"
            onClick={() =>
              setEditingPayment({
                dataCenterId: dataCenter.id,
                period: today().slice(0, 7),
                paidDate: today(),
                status: "paid",
                amount: dataCenter.monthlyFee || "",
                method: payments[0]?.method ?? "",
              })
            }
          >
            <Plus />
            Tambah Pembayaran
          </Button>
        }
      >
        {summary && payments.length > 0 && <AmountSummary summary={summary} rows={payments} variant="strip" />}
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-12 pl-5">No</TableHead>
              <TableHead>Bulan</TableHead>
              <TableHead>No. Invoice</TableHead>
              <TableHead>Tanggal Bayar</TableHead>
              <TableHead>Nominal</TableHead>
              <TableHead>Metode</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Invoice</TableHead>
              <TableHead>Bukti</TableHead>
              <TableHead className="w-32 pr-5 text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.map((item, index) => (
              <TableRow key={item.id}>
                <TableCell className="pl-5 text-muted-foreground tabular-nums">{index + 1}</TableCell>
                <TableCell className="font-medium whitespace-nowrap">
                  {formatMonth(item.period)}
                  {item.note && <span className="block max-w-56 truncate text-xs font-normal text-muted-foreground">{item.note}</span>}
                </TableCell>
                <TableCell className="whitespace-nowrap">{item.invoiceNumber || "—"}</TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground">{item.paidDate ? formatDate(item.paidDate) : "—"}</TableCell>
                <TableCell className="font-medium whitespace-nowrap tabular-nums">{formatRupiah(item.amount)}</TableCell>
                <TableCell>{item.method || "—"}</TableCell>
                <TableCell>
                  <StatusToggle entityKey={paymentsKey} id={item.id} status={item.status}>
                    <StatusPill tone={item.status === "paid" ? "good" : "warn"}>{paymentStatusLabels[item.status] ?? item.status}</StatusPill>
                  </StatusToggle>
                </TableCell>
                <TableCell>
                  {item.invoiceUrl ? (
                    <ProofViewer entityKey={paymentsKey} id={item.id} url={item.invoiceUrl} field="invoiceUrl" name="Invoice Data Center" label={formatMonth(item.period)} />
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  {item.proofUrl ? <ProofViewer entityKey={paymentsKey} id={item.id} url={item.proofUrl} label={formatMonth(item.period)} /> : <span className="text-muted-foreground">—</span>}
                </TableCell>
                <TableCell className="pr-4 text-right whitespace-nowrap">
                  <Button variant="ghost" size="icon-sm" onClick={() => setViewing({ ...item })} aria-label={`Lihat detail pembayaran ${formatMonth(item.period)}`}>
                    <Ellipsis />
                  </Button>
                  <Button variant="ghost" size="icon-sm" onClick={() => setEditingPayment({ ...item })} aria-label={`Ubah pembayaran ${formatMonth(item.period)}`}>
                    <Pencil />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setRemoving({ ...item })}
                    aria-label={`Hapus pembayaran ${formatMonth(item.period)}`}
                  >
                    <Trash2 />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {payments.length === 0 && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={10} className="h-28 text-center text-muted-foreground">
                  Belum ada pembayaran yang dicatat.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Panel>

      <RecordSheet entityKey="data-centers" value={editing} setValue={setEditing} />
      <RecordSheet entityKey={paymentsKey} value={editingPayment} setValue={setEditingPayment} hiddenFields={["dataCenterId"]} />
      <RecordDetailDialog entityKey={paymentsKey} row={viewing} onClose={() => setViewing(null)} onEdit={(row) => setEditingPayment({ ...row })} hiddenFields={["dataCenterId"]} />
      <DeleteRecordDialog entityKey={paymentsKey} row={removing} title={removing ? `pembayaran ${formatMonth(String(removing.period))}` : ""} onClose={() => setRemoving(null)} />
    </>
  );
}
