import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AppDownloadCard } from "@/components/site/app-download";
import { TlinetLogo } from "@/components/site/brand";
import { SubnetLoginForm } from "@/components/site/subnet-login-form";
import { getSubnetUser, inAndroidApp } from "@/lib/subnet";

export const metadata: Metadata = { title: "Masuk Portal Subnet", robots: { index: false } };

export default async function SubnetLoginPage() {
  if (await getSubnetUser()) redirect("/subnet");
  const inApp = await inAndroidApp();

  return (
    <main className="pt-safe relative flex flex-1 items-center justify-center overflow-hidden bg-muted px-5 py-16">
      <div className="bg-grid absolute inset-0" aria-hidden="true" />
      <div className="relative w-full max-w-sm">
        <div className="rounded-3xl border bg-card p-8 shadow-xl shadow-ink/5">
          <TlinetLogo variant="full" priority className="h-12" />
          <h1 className="mt-8 text-xl font-semibold tracking-tight">Portal Subnet</h1>
          <p className="mt-1.5 mb-7 text-sm text-muted-foreground">Masuk untuk memantau koneksi, tagihan, dan layanan internet Anda. Akun diberikan oleh admin TLINET.</p>
          <SubnetLoginForm />
        </div>
        {/* Di aplikasi Android hanya portal yang dibuka; situs publik tetap di peramban. */}
        {!inApp && <AppDownloadCard className="mt-4" />}
        {!inApp && (
          <Link href="/" className="mt-6 flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" />
            Kembali ke situs
          </Link>
        )}
      </div>
    </main>
  );
}
