import { ArrowLeft } from "lucide-react";
import { LinkButton } from "./ui";

export function NotFoundView() {
  return (
    <section className="relative flex flex-1 items-center overflow-hidden">
      <div className="bg-grid absolute inset-0" aria-hidden="true" />
      <div className="container-page relative flex flex-col items-center gap-5 py-28 text-center">
        <p className="font-mono text-sm font-medium text-brand-ink">404</p>
        <h1 className="max-w-xl text-4xl leading-[1.1] font-semibold sm:text-5xl">Halaman tidak ditemukan</h1>
        <p className="max-w-md text-base leading-relaxed text-muted-foreground">
          Alamat yang Anda buka tidak tersedia atau sudah dipindahkan. Kembali ke beranda untuk melanjutkan.
        </p>
        <LinkButton href="/" className="mt-2">
          <ArrowLeft />
          Kembali ke beranda
        </LinkButton>
      </div>
    </section>
  );
}
