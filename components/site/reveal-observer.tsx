"use client";

import { useEffect } from "react";
import { afterPageSettles } from "@/lib/after-load";

/**
 * Animasi muncul saat digulir untuk halaman publik. Elemen bertanda `data-reveal` (atau anak dari `data-reveal-stagger`,
 * yang muncul bergiliran) naik pelan begitu masuk layar. Animasi hanya aktif setelah skrip ini berjalan, jadi isi tetap
 * terlihat tanpa JavaScript; yang sudah terlihat saat halaman dibuka tidak disembunyikan; dan semuanya dilewati di HP
 * atau bila pengguna meminta gerak dikurangi. Pengamat DOM menangkap isi yang datang belakangan (halaman baru, streaming).
 */
export function RevealObserver() {
  useEffect(() => {
    // Di HP (dan bila pengguna meminta gerak dikurangi) semua isi langsung tampil diam, supaya halaman ringan.
    if (window.matchMedia("(prefers-reduced-motion: reduce), (max-width: 1023px)").matches) return;
    // Hiasan bergerak (garis peta berkilau) dinyalakan setelah halaman selesai dimuat.
    const cancelSettled = afterPageSettles(() => document.documentElement.classList.add("page-settled"));

    const reveal = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.setAttribute("data-animate", "");
          entry.target.setAttribute("data-shown", "");
          reveal.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -8% 0px" },
    );

    const scan = () => {
      for (const group of document.querySelectorAll<HTMLElement>("[data-reveal-stagger]")) {
        Array.from(group.children).forEach((child, index) => {
          if (!(child instanceof HTMLElement) || child.hasAttribute("data-reveal")) return;
          child.setAttribute("data-reveal", "");
          child.style.setProperty("--reveal-index", String(Math.min(index, 8)));
        });
      }
      for (const element of document.querySelectorAll<HTMLElement>("[data-reveal]:not([data-shown]):not([data-watched])")) {
        element.setAttribute("data-watched", "");
        const box = element.getBoundingClientRect();
        // Yang sudah ada di layar langsung dianggap tampil supaya tidak berkedip hilang lalu muncul.
        if (box.height > 0 && box.top < window.innerHeight && box.bottom > 0) element.setAttribute("data-shown", "");
        else reveal.observe(element);
      }
    };

    scan();
    document.documentElement.classList.add("reveal-ready");
    let frame = 0;
    const changes = new MutationObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(scan);
    });
    changes.observe(document.body, { childList: true, subtree: true });

    return () => {
      cancelSettled();
      cancelAnimationFrame(frame);
      changes.disconnect();
      reveal.disconnect();
      document.documentElement.classList.remove("reveal-ready");
    };
  }, []);

  return null;
}
