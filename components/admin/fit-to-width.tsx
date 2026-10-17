"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

/**
 * Memperkecil isi selebar `width` piksel agar muat di layar sempit, mis. lembar A4 invoice di HP.
 * Saat dicetak ukurannya kembali penuh.
 */
export function FitToWidth({ width, children }: { width: number; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const box = ref.current;
    if (!box) return;
    const update = () => setScale(Math.min(1, box.clientWidth / width));
    const observer = new ResizeObserver(update);
    observer.observe(box);
    update();
    return () => observer.disconnect();
  }, [width]);

  return (
    <div ref={ref} className="w-full overflow-x-hidden print:overflow-visible">
      <div style={{ "--fit": scale } as CSSProperties} className="[zoom:var(--fit)] print:[zoom:1]">
        {children}
      </div>
    </div>
  );
}
