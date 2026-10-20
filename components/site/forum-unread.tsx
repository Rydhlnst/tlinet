"use client";

import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { showNotification } from "@/components/site/app-notify";
import type { ForumUnread } from "@/lib/community";
import { cn } from "@/lib/utils";

/** Pemeriksaan pesan Forum baru: tiap menit saat portal terlihat, tiap 5 menit di latar (untuk notifikasi di HP). */
const visibleMs = 60_000;
const hiddenMs = 5 * 60_000;
/** Pesan yang lebih lama dari ini tidak lagi dikirim sebagai notifikasi (cukup titik merah). */
const notifyMaxAgeMs = 6 * 3600_000;
const notifiedKey = "tlinet:forum-notified";

const UnreadContext = createContext(0);

/**
 * Jumlah pesan Forum yang belum dibaca untuk seluruh portal: dipakai ikon Forum di bilah atas, dan memunculkan
 * notifikasi sekali per pesan baru (di aplikasi Android atau peramban yang mengizinkan) selama Forum tidak terbuka.
 */
export function ForumUnreadProvider({ initial, children }: { initial: number; children: ReactNode }) {
  const pathname = usePathname();
  const onForum = pathname.startsWith("/subnet/forum");
  const [count, setCount] = useState(initial);
  const firstRun = useRef(true);

  useEffect(() => {
    // Di halaman Forum semuanya dianggap terbaca; begitu keluar, jumlahnya langsung diperiksa ulang.
    if (onForum) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    const load = async () => {
      try {
        const response = await fetch("/subnet/chat/unread", { cache: "no-store" });
        if (response.ok && !stopped) {
          const data = (await response.json()) as ForumUnread;
          setCount(data.count);
          notifyOnce(data);
        }
      } catch {
        // Jaringan putus sesaat: dicoba lagi pada putaran berikutnya.
      }
      if (!stopped) timer = setTimeout(load, document.hidden ? hiddenMs : visibleMs);
    };
    // Muatan pertama sudah dari server; selain itu (mis. baru keluar dari Forum) langsung periksa.
    if (firstRun.current) {
      firstRun.current = false;
      timer = setTimeout(load, visibleMs);
    } else void load();
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [onForum]);

  return <UnreadContext.Provider value={onForum ? 0 : count}>{children}</UnreadContext.Provider>;
}

function notifyOnce({ count, latest }: ForumUnread) {
  if (!count || !latest || Date.now() - latest.at > notifyMaxAgeMs) return;
  try {
    if (localStorage.getItem(notifiedKey) === latest.id) return;
    localStorage.setItem(notifiedKey, latest.id);
  } catch {
    // Tanpa penyimpanan, notifikasi tetap muncul sekali per pembacaan.
  }
  const more = count > 1 ? ` (+${count - 1} pesan lain)` : "";
  showNotification(`Forum Subnet · ${latest.name}`, `${latest.text}${more}`, "tlinet-forum");
}

/** Titik merah berangka di ikon Forum; tidak tampil bila tidak ada pesan baru. */
export function ForumBadge({ className }: { className?: string }) {
  const count = useContext(UnreadContext);
  if (!count) return null;
  return (
    <span className={cn("absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[0.625rem] leading-none font-semibold text-white tabular-nums ring-2 ring-brand", className)}>
      {count > 9 ? "9+" : count}
      <span className="sr-only"> pesan Forum belum dibaca</span>
    </span>
  );
}
