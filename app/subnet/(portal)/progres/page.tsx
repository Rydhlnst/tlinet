import { desc, eq } from "drizzle-orm";
import { ArrowUpCircle, ChevronDown, Route } from "lucide-react";
import type { Metadata } from "next";
import { MetroSummary, MetroTimeline, type MetroTimelineOrder } from "@/components/site/metro-timeline";
import { PageHeading, SectionCard } from "@/components/site/subnet-ui";
import { UpgradeRequestForm } from "@/components/site/upgrade-request";
import { WhatsAppIcon } from "@/components/site/whatsapp-float";
import { getContent } from "@/lib/data";
import { requireDb } from "@/lib/db";
import { customers, metroOrders } from "@/lib/db/schema";
import { localPhone, whatsappUrl } from "@/lib/format";
import { isMetroKind, metroKindLabels, metroProgress, upgradeOptions, type MetroStatus } from "@/lib/metro";
import { requireSubnetUser } from "@/lib/subnet";

export const metadata: Metadata = { title: "Progres Metro · Portal Subnet" };

/** Progres pemasangan baru dan upgrade kapasitas pelanggan, serta form pengajuan upgrade. */
export default async function SubnetProgressPage() {
  const user = await requireSubnetUser();
  const db = requireDb();
  const [settings, [customer], rows] = await Promise.all([
    getContent("settings"),
    db.select({ name: customers.name, siteId: customers.siteId, capacity: customers.capacity }).from(customers).where(eq(customers.id, user.customerId)).limit(1),
    db.select().from(metroOrders).where(eq(metroOrders.customerId, user.customerId)).orderBy(desc(metroOrders.createdAt)),
  ]);
  const orders = rows.flatMap((row) => (isMetroKind(row.kind) ? [{ ...row, kind: row.kind, status: row.status as MetroStatus } satisfies MetroTimelineOrder & { id: string }] : []));
  const active = orders.filter((order) => order.status === "active");
  const history = orders.filter((order) => order.status !== "active");
  const installing = active.some((order) => order.kind === "install");
  const upgrading = active.some((order) => order.kind === "upgrade");
  const options = upgradeOptions(customer?.capacity ?? "");
  // Pesan WhatsApp ke IT Support menyebut progres yang sedang berjalan supaya tim langsung tahu konteksnya.
  const current = active[0];
  const currentStep = current ? metroProgress(current.kind, current.steps).next : null;
  const itChat = settings.itSupportWhatsapp
    ? whatsappUrl(
        settings.itSupportWhatsapp,
        [
          `Halo IT Support ${settings.brandName}, saya ${customer?.name ?? ""}${customer?.siteId ? ` (Site ID ${customer.siteId})` : ""}.`,
          current && `Saya ingin menanyakan progres ${metroKindLabels[current.kind].toLowerCase()} ${current.capacity}${currentStep ? ` (sekarang: ${currentStep.label})` : ""}.`,
        ]
          .filter(Boolean)
          .join("\n"),
      )
    : "";

  return (
    <>
      <PageHeading title="Progres Metro" description="Pantau pemasangan dan upgrade layanan Anda, langkah demi langkah." />

      <div className="grid grid-cols-1 items-start gap-4 sm:gap-5 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <div className="flex flex-col gap-4 sm:gap-5">
          {active.length ? (
            active.map((order) => (
              <SectionCard key={order.id}>
                <div className="flex flex-col gap-5 p-5">
                  <MetroSummary order={order} />
                  <MetroTimeline order={order} />
                </div>
              </SectionCard>
            ))
          ) : (
            <SectionCard>
              <div className="flex flex-col items-center px-6 py-10 text-center">
                <span className="flex size-12 items-center justify-center rounded-2xl bg-secondary text-secondary-foreground">
                  <Route className="size-6" />
                </span>
                <p className="mt-4 font-semibold">Tidak ada proses yang sedang berjalan</p>
                <p className="mt-1 max-w-sm text-sm text-muted-foreground">Progres pemasangan atau upgrade layanan Anda akan tampil di sini, lengkap dengan waktu setiap langkah.</p>
              </div>
            </SectionCard>
          )}

          {history.length > 0 && (
            <SectionCard title="Riwayat">
              <ul className="flex flex-col gap-2 px-3 pb-3">
                {history.map((order) => (
                  <li key={order.id}>
                    <details className="group rounded-2xl border bg-background">
                      <summary className="flex cursor-pointer list-none items-center gap-3 p-4 [&::-webkit-details-marker]:hidden">
                        <div className="min-w-0 flex-1">
                          <MetroSummary order={order} />
                        </div>
                        <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
                      </summary>
                      <div className="border-t p-4">
                        <MetroTimeline order={order} />
                      </div>
                    </details>
                  </li>
                ))}
              </ul>
            </SectionCard>
          )}
        </div>

        <div className="flex flex-col gap-4 sm:gap-5">
        <SectionCard title="Ajukan Upgrade" icon={ArrowUpCircle}>
          {installing ? (
            <p className="px-5 pb-5 text-sm text-muted-foreground">Upgrade bisa diajukan setelah pemasangan selesai.</p>
          ) : upgrading ? (
            <p className="px-5 pb-5 text-sm text-muted-foreground">Permintaan upgrade Anda sedang diproses. Pantau langkahnya di halaman ini.</p>
          ) : options.length ? (
            <UpgradeRequestForm options={options} current={customer?.capacity ?? ""} />
          ) : (
            <p className="px-5 pb-5 text-sm text-muted-foreground">Kapasitas Anda sudah yang tertinggi di pilihan kami. Hubungi NOC untuk kebutuhan lebih besar.</p>
          )}
        </SectionCard>

        {itChat && (
          <SectionCard>
            <div className="flex flex-col gap-4 p-5">
              <div>
                <p className="font-semibold">Ada pertanyaan soal progres?</p>
                <p className="mt-1 text-sm text-muted-foreground">Tim IT Support kami siap membantu, {localPhone(settings.itSupportWhatsapp)}.</p>
              </div>
              <a href={itChat} target="_blank" rel="noopener noreferrer" className="flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#1fa855] text-sm font-semibold text-white transition-colors hover:bg-[#1b974c]">
                <WhatsAppIcon className="size-4" />
                Chat WhatsApp IT Support
              </a>
            </div>
          </SectionCard>
        )}
        </div>
      </div>
    </>
  );
}
