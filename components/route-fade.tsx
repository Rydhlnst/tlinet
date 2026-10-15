"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";

/**
 * Isi halaman muncul pelan setiap pindah halaman. Elemennya tidak dipasang ulang (state dan cache rute tetap utuh);
 * animasinya diputar ulang lewat Web Animations saat alamat berubah, dan dilewati bila pengguna meminta gerak dikurangi.
 * `lift` menambah geser kecil ke atas; tanpa itu hanya pudar, aman untuk halaman yang memakai posisi fixed/sticky.
 */
export function RouteFade({ children, lift = false, className }: { children: ReactNode; lift?: boolean; className?: string }) {
  const pathname = usePathname();
  const ref = useRef<HTMLDivElement>(null);
  const first = useRef(true);

  useEffect(() => {
    // Muat pertama sudah punya transisi sendiri dari peramban; animasi hanya untuk perpindahan halaman.
    if (first.current) {
      first.current = false;
      return;
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    ref.current?.animate(
      lift ? [{ opacity: 0, transform: "translateY(6px)" }, { opacity: 1, transform: "none" }] : [{ opacity: 0 }, { opacity: 1 }],
      { duration: 280, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" },
    );
  }, [pathname, lift]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
