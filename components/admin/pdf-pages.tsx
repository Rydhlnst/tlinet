"use client";

import { LoaderCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";

/**
 * Build legacy PDF.js (juga jalan di WebView Android yang belum diperbarui). Worker-nya disalin ke public/pdfjs dari
 * node_modules/pdfjs-dist/legacy/build; salin ulang setiap kali versi pdfjs-dist di package.json berubah.
 */
const workerSrc = "/pdfjs/pdf.worker.min.mjs";
/** Dokumen sangat panjang cukup ditampilkan sebagian; selebihnya lewat tombol Unduh. */
const maxPages = 30;

/**
 * Apakah peramban bisa menampilkan PDF di dalam halaman. WebView aplikasi Android dan peramban HP (Chrome Android,
 * Safari iOS) tidak bisa, jadi di sana PDF digambar sendiri dengan PDF.js.
 */
export function canShowPdfInline() {
  if (typeof navigator === "undefined") return true;
  if (/TLINETAdminApp|TLINETApp|Android|iPhone|iPad/i.test(navigator.userAgent)) return false;
  return navigator.pdfViewerEnabled !== false;
}

/** Halaman-halaman PDF sebagai gambar, selebar wadahnya. Sesi masuk ikut terkirim karena alamatnya di situs sendiri. */
export function PdfPages({ src, title }: { src: string; title: string }) {
  const container = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<{ status: "loading" | "ready" | "error"; pages: number; shown: number }>({ status: "loading", pages: 0, shown: 0 });

  useEffect(() => {
    let cancelled = false;
    let destroy = () => {};
    const host = container.current;
    (async () => {
      try {
        const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
        pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;
        const task = pdfjs.getDocument({ url: src, withCredentials: true });
        destroy = () => void task.destroy();
        const pdf = await task.promise;
        if (cancelled || !host) return;
        const count = Math.min(pdf.numPages, maxPages);
        const ratio = Math.min(window.devicePixelRatio || 1, 2);
        const width = host.clientWidth || 360;
        for (let number = 1; number <= count; number++) {
          const page = await pdf.getPage(number);
          if (cancelled) return;
          const base = page.getViewport({ scale: 1 });
          const viewport = page.getViewport({ scale: (width / base.width) * ratio });
          const canvas = document.createElement("canvas");
          canvas.width = Math.floor(viewport.width);
          canvas.height = Math.floor(viewport.height);
          canvas.className = "block h-auto w-full rounded-md bg-white shadow";
          canvas.setAttribute("aria-label", `${title}, halaman ${number}`);
          host.appendChild(canvas);
          await page.render({ canvas, viewport }).promise;
          if (!cancelled) setState({ status: "ready", pages: pdf.numPages, shown: number });
        }
      } catch {
        if (!cancelled) setState((current) => ({ ...current, status: current.shown ? "ready" : "error" }));
      }
    })();
    return () => {
      cancelled = true;
      destroy();
      host?.replaceChildren();
    };
  }, [src, title]);

  return (
    <div className="size-full overflow-y-auto rounded-lg">
      <div ref={container} className="mx-auto flex max-w-3xl flex-col gap-3" />
      {state.status === "loading" && (
        <p className="flex items-center justify-center gap-2 py-10 text-sm text-white/80">
          <LoaderCircle className="size-4 animate-spin" />
          Memuat PDF…
        </p>
      )}
      {state.status === "error" && <p className="py-10 text-center text-sm text-white/80">PDF tidak bisa ditampilkan. Gunakan tombol Unduh.</p>}
      {state.status === "ready" && state.pages > state.shown && (
        <p className="py-4 text-center text-xs text-white/70">
          Menampilkan {state.shown} dari {state.pages} halaman. Unduh untuk melihat semuanya.
        </p>
      )}
    </div>
  );
}
