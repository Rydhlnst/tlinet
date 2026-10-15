/**
 * Menjalankan `callback` setelah halaman selesai dimuat dan peramban sedang senggang, supaya hiasan bergerak
 * (kanvas animasi) tidak berebut waktu dengan memuat dan menyiapkan halaman. Mengembalikan fungsi pembatal.
 */
export function afterPageSettles(callback: () => void) {
  let cancelled = false;
  let idle = 0;
  let timer = 0;
  const fire = () => {
    if (!cancelled) callback();
  };
  const run = () => {
    if (cancelled) return;
    // Safari belum punya requestIdleCallback.
    if (typeof window.requestIdleCallback === "function") idle = window.requestIdleCallback(fire, { timeout: 3000 });
    else timer = setTimeout(fire, 1500) as unknown as number;
  };
  if (document.readyState === "complete") run();
  else window.addEventListener("load", run, { once: true });

  return () => {
    cancelled = true;
    window.removeEventListener("load", run);
    if (idle) window.cancelIdleCallback(idle);
    clearTimeout(timer);
  };
}

/** Selang minimum antarbingkai animasi kanvas (sekitar 30 fps): cukup halus untuk hiasan, separuh beban CPU-nya. */
export const frameInterval = 1000 / 30;
