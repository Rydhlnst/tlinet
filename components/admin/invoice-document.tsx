import { Globe, Headset, Info, Landmark, Mail, MapPin, Phone, ShieldCheck, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import type { InvoiceSettings } from "@/lib/content/types";
import type { invoices } from "@/lib/db/schema";
import { invoiceTotals } from "@/lib/invoices";

type Invoice = typeof invoices.$inferSelect;

// Warna lembar invoice: biru tua untuk bilah dan judul, biru pucat untuk panel.
const navy = "bg-[#12356b]";
const panel = "bg-[#eaf0f8]";
const line = "border-[#d3ddec]";

const dateFormat = new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
const numberFormat = new Intl.NumberFormat("id-ID");

/** "2026-04-10" → "10 Apr 2026" */
const shortDate = (value: string) => (value ? dateFormat.format(new Date(`${value}T00:00:00Z`)) : "-");
const money = (value: number) => `Rp ${numberFormat.format(value)}`;
/** 11 → "11", 11.5 → "11,5" */
const percent = (value: number) => String(value).replace(".", ",");

function ContactLine({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return (
    <li className="flex gap-2.5">
      <Icon className="mt-[1px] size-[13px] shrink-0 text-[#12356b]" strokeWidth={2.4} />
      <span className="min-w-0 break-words">{children}</span>
    </li>
  );
}

function Panel({ title, rows }: { title: string; rows: [label: string, value: string, strong?: boolean][] }) {
  return (
    <section className={`overflow-hidden rounded-[3px] border ${line}`}>
      <h2 className={`${panel} px-4 py-1.5 text-[13px] font-bold text-[#12305c]`}>{title}</h2>
      <dl className="grid grid-cols-[31mm_3mm_minmax(0,1fr)] gap-y-[5px] px-4 py-2.5 text-[11px] leading-snug">
        {rows.map(([label, value, strong]) => (
          <div key={label} className="contents">
            <dt>{label}</dt>
            <dd aria-hidden="true">:</dd>
            <dd className={`break-words whitespace-pre-line ${strong ? "font-bold" : ""}`}>{value || "-"}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function Badge({ icon: Icon, lines }: { icon: LucideIcon; lines: [string, string] }) {
  return (
    <div className="flex items-center gap-2.5">
      <Icon className="size-[30px] shrink-0 text-[#12356b]" strokeWidth={1.8} />
      <p className="text-[10.5px] leading-snug text-[#1d4f9c]">
        {lines[0]}
        <br />
        {lines[1]}
      </p>
    </div>
  );
}

/** Lembar invoice seukuran A4, dipakai untuk tampilan layar dan cetak/PDF. */
export function InvoiceDocument({ invoice, settings }: { invoice: Invoice; settings: InvoiceSettings }) {
  const { subtotal, tax, total } = invoiceTotals(invoice.items, invoice.taxRate);
  const notes = invoice.notes.length ? invoice.notes : settings.notes;
  const hasBank = Boolean(settings.bankName && settings.bankAccountNumber);
  const hasPayment = hasBank || Boolean(settings.qrUrl);
  const period = invoice.periodStart || invoice.periodEnd ? `${shortDate(invoice.periodStart)} – ${shortDate(invoice.periodEnd)}` : "";

  return (
    <article className="invoice-sheet mx-auto flex min-h-[297mm] w-[210mm] flex-col bg-white text-[#16243f] shadow-xl print:min-h-[296mm] print:shadow-none">
      <div className="flex flex-1 flex-col px-[13mm] pt-[8mm] pb-[3mm]">
        <header className="grid grid-cols-[minmax(0,1fr)_90mm] gap-x-[8mm]">
          <div className="flex flex-col justify-between gap-[5mm]">
            {settings.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={settings.logoUrl} alt={settings.companyName} className="h-auto w-[68mm]" />
            ) : (
              <p className="text-[26px] font-extrabold text-[#12356b]">{settings.companyName}</p>
            )}
            <div>
              <h1 className="text-[42px] leading-none font-extrabold tracking-tight text-[#12305c]">{settings.title}</h1>
              {settings.subtitle && <p className="mt-2.5 text-[15px] text-[#22375c]">{settings.subtitle}</p>}
            </div>
          </div>
          <div>
            <div className="text-[9.5px] leading-snug">
              <p className="text-[13px] font-bold text-[#1d4f9c]">{settings.companyName}</p>
              {settings.companyTagline && <p className="text-[9px]">{settings.companyTagline}</p>}
              <ul className="mt-1 flex flex-col gap-[3px]">
                {settings.address
                  .split("\n")
                  .filter((row) => row.trim())
                  .map((row) => (
                    <ContactLine key={row} icon={MapPin}>
                      {row.trim()}
                    </ContactLine>
                  ))}
              </ul>
              <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
                {settings.phone && <ContactLine icon={Phone}>{settings.phone}</ContactLine>}
                {settings.email && <ContactLine icon={Mail}>{settings.email}</ContactLine>}
                {settings.website && <ContactLine icon={Globe}>{settings.website}</ContactLine>}
              </ul>
            </div>
            <div className="mt-[4mm] overflow-hidden rounded-[3px]">
              <p className={`${navy} grid grid-cols-[30mm_3mm_minmax(0,1fr)] px-4 py-1.5 text-[13px] font-bold text-white`}>
                <span>No. Invoice</span>
                <span aria-hidden="true">:</span>
                <span className="break-words">{invoice.number}</span>
              </p>
              <dl className={`${panel} grid grid-cols-[30mm_3mm_minmax(0,1fr)] gap-y-1 px-4 py-1.5 text-[11.5px]`}>
                <dt className="font-bold">Tanggal Terbit</dt>
                <dd aria-hidden="true">:</dd>
                <dd>{shortDate(invoice.issueDate)}</dd>
                <dt className="font-bold">Jatuh Tempo</dt>
                <dd aria-hidden="true">:</dd>
                <dd>{shortDate(invoice.dueDate)}</dd>
              </dl>
            </div>
          </div>
        </header>

        <div className="mt-[5mm] grid grid-cols-[1.18fr_1fr] items-start gap-[7mm]">
          <Panel
            title="Informasi Pelanggan"
            rows={[
              ["Nama Perusahaan", invoice.companyName, true],
              ["Alamat", invoice.address],
              ["NPWP", invoice.npwp],
              ["PIC", invoice.pic],
              ["Email", invoice.email],
              ["No. Telepon", invoice.phone],
            ]}
          />
          <Panel
            title="Detail Layanan"
            rows={[
              ["ID Pelanggan", invoice.customerCode],
              ["No. Kontrak", invoice.contractNo],
              ["Jenis Layanan", invoice.serviceType],
              ["Bandwidth", invoice.bandwidth],
              ["Lokasi", invoice.location],
              ["Periode Tagihan", period],
            ]}
          />
        </div>

        <table className={`mt-[5mm] w-full border-collapse border text-[11.5px] ${line}`}>
          <thead>
            <tr className={`${navy} text-left text-[12px] text-white`}>
              <th className="w-[14mm] px-3 py-2 text-center font-bold">No.</th>
              <th className="px-4 py-2 font-bold">Deskripsi</th>
              <th className="w-[24mm] px-3 py-2 text-center font-bold">Qty</th>
              <th className="w-[36mm] px-3 py-2 text-center leading-tight font-bold">
                Harga Satuan
                <br />
                (IDR)
              </th>
              <th className="w-[36mm] px-3 py-2 text-center leading-tight font-bold">
                Jumlah
                <br />
                (IDR)
              </th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item, index) => (
              <tr key={index} className={`border-t align-top ${line}`}>
                <td className={`border-r px-3 py-2 text-center ${line}`}>{index + 1}</td>
                <td className={`border-r px-4 py-2 ${line}`}>
                  <span className="font-bold">{item.description}</span>
                  {item.note && <span className="mt-0.5 block text-[10.5px] text-[#4b5d7a]">({item.note})</span>}
                </td>
                <td className={`border-r px-3 py-2 text-center ${line}`}>{numberFormat.format(item.quantity)}</td>
                <td className={`border-r px-3 py-2 text-right whitespace-nowrap ${line}`}>{money(item.unitPrice)}</td>
                <td className="px-3 py-2 text-right whitespace-nowrap">{money(item.quantity * item.unitPrice)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-[3mm] ml-auto w-[92mm] overflow-hidden rounded-[3px] text-[12px]">
          <div className={`${panel} flex justify-between border-b border-white px-5 py-1`}>
            <span>Subtotal</span>
            <span>{money(subtotal)}</span>
          </div>
          {invoice.taxRate > 0 && (
            <div className={`${panel} flex justify-between px-5 py-1`}>
              <span>PPN {percent(invoice.taxRate)}%</span>
              <span>{money(tax)}</span>
            </div>
          )}
          <div className={`${navy} flex items-center justify-between px-5 py-2 text-[15px] font-bold text-white`}>
            <span>Total Tagihan</span>
            <span>{money(total)}</span>
          </div>
        </div>

        <div className={`mt-[5mm] grid items-start gap-[8mm] ${hasPayment ? "grid-cols-[0.9fr_1.1fr]" : ""}`}>
          {hasPayment && (
            <section className={`overflow-hidden rounded-[3px] border ${line} bg-[#f5f8fc]`}>
              <h2 className={`${panel} flex items-center gap-2 px-4 py-1.5 text-[13px] font-bold text-[#12305c]`}>
                <span className={`${navy} flex size-[15px] items-center justify-center rounded-full text-[9px] text-white`}>Rp</span>
                Informasi Pembayaran
              </h2>
              <div className="flex items-center justify-between gap-3 px-4 py-3 text-[11px]">
                {hasBank && (
                  <div className="flex min-w-0 gap-2.5">
                    <Landmark className="size-[20px] shrink-0 text-[#12356b]" strokeWidth={1.8} />
                    <div className="leading-relaxed">
                      <p className="font-bold">{settings.bankName}</p>
                      <p className="whitespace-nowrap">No. Rekening&nbsp;&nbsp;:&nbsp;&nbsp;{settings.bankAccountNumber}</p>
                      {settings.bankAccountHolder && <p>a.n. {settings.bankAccountHolder}</p>}
                    </div>
                  </div>
                )}
                {settings.qrUrl && (
                  <div className="flex shrink-0 flex-col items-center gap-1">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={settings.qrUrl} alt="QR pembayaran" className="size-[21mm] object-contain" />
                    {settings.qrCaption && <p className="max-w-[30mm] text-center text-[9px] leading-tight font-bold">{settings.qrCaption}</p>}
                  </div>
                )}
              </div>
            </section>
          )}
          {notes.length > 0 && (
            <section className="text-[10.5px]">
              <h2 className="flex items-center gap-2 text-[14px] font-bold text-[#12305c]">
                <Info className="size-[17px] fill-[#12356b] text-white" />
                Catatan
              </h2>
              <ol className="mt-2 flex list-decimal flex-col gap-1.5 pl-5 leading-snug marker:text-[#16243f]">
                {notes.map((note, index) => (
                  <li key={index} className="pl-1.5">
                    {note}
                  </li>
                ))}
              </ol>
            </section>
          )}
        </div>

        <footer className={`mt-auto flex items-center gap-[8mm] border-t pt-[4mm] ${line}`}>
          <div className="shrink-0 pr-[8mm]">
            <p className="text-[21px] leading-none text-[#12356b] italic" style={{ fontFamily: '"Segoe Script", "Brush Script MT", "Lucida Handwriting", cursive' }}>
              Terima Kasih
            </p>
            <p className="mt-1.5 text-[12px] text-[#12356b]">atas kepercayaan Anda.</p>
          </div>
          <div className={`flex flex-1 items-center justify-between gap-4 border-l pl-[8mm] ${line}`}>
            <Badge icon={Globe} lines={["Internet", "Cepat & Stabil"]} />
            <Badge icon={ShieldCheck} lines={["Jaringan", "Aman & Terpercaya"]} />
            <Badge icon={Headset} lines={["Dukungan Teknis", "24/7"]} />
          </div>
        </footer>
      </div>

      <p className={`${navy} flex justify-center gap-3 px-4 py-2.5 text-[10px] text-white`}>
        <span>{settings.companyName.replace(/\s*\(.*\)\s*$/, "")}</span>
        {settings.footerTagline && (
          <>
            <span aria-hidden="true">|</span>
            <span>{settings.footerTagline}</span>
          </>
        )}
      </p>
    </article>
  );
}
