"use client";

import { useEffect, useRef } from "react";
import { afterPageSettles, frameInterval } from "@/lib/after-load";
import { cn } from "@/lib/utils";

type Node = { x: number; y: number; vx: number; vy: number; accent: boolean };

const LINK_DISTANCE = 160;
const tones = {
  light: { line: "36, 86, 245", dot: "rgba(36, 86, 245, 0.65)", accent: "rgba(14, 165, 233, 0.8)" },
  dark: { line: "147, 197, 253", dot: "rgba(191, 219, 254, 0.75)", accent: "rgba(56, 189, 248, 0.95)" },
};

/**
 * Latar hero: titik-titik jaringan yang bergerak pelan dan terhubung garis saat berdekatan.
 * Animasi berhenti ketika tidak terlihat, dan melambat bila pengguna meminta gerak dikurangi.
 */
export function NodeField({ className, tone = "light" }: { className?: string; tone?: keyof typeof tones }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    const colors = tones[tone];
    // Gerakannya kecil dan lambat, jadi pada mode "kurangi gerakan" cukup diperlambat, tidak dimatikan.
    const pace = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0.45 : 1;
    let nodes: Node[] = [];
    let width = 0;
    let height = 0;
    let frame = 0;
    let last = 0;
    let visible = true;
    // Animasi baru berjalan setelah halaman selesai dimuat; sebelumnya cukup satu bingkai diam.
    let ready = false;

    const spawn = (): Node => {
      const angle = Math.random() * Math.PI * 2;
      const speed = (6 + Math.random() * 10) * pace; // piksel per detik
      return {
        x: Math.random() * width,
        y: Math.random() * height,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        accent: Math.random() < 0.2,
      };
    };

    const draw = () => {
      context.clearRect(0, 0, width, height);
      context.lineWidth = 1;
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const distance = Math.hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y);
          if (distance > LINK_DISTANCE) continue;
          context.strokeStyle = `rgba(${colors.line}, ${(1 - distance / LINK_DISTANCE) * 0.3})`;
          context.beginPath();
          context.moveTo(nodes[i].x, nodes[i].y);
          context.lineTo(nodes[j].x, nodes[j].y);
          context.stroke();
        }
      }
      for (const node of nodes) {
        context.fillStyle = node.accent ? colors.accent : colors.dot;
        context.beginPath();
        context.arc(node.x, node.y, node.accent ? 2.4 : 1.8, 0, Math.PI * 2);
        context.fill();
      }
    };

    const tick = (time: number) => {
      if (time - last < frameInterval) {
        frame = requestAnimationFrame(tick);
        return;
      }
      const elapsed = Math.min((time - last) / 1000, 0.1);
      last = time;
      for (const node of nodes) {
        node.x += node.vx * elapsed;
        node.y += node.vy * elapsed;
        if (node.x < 0 || node.x > width) node.vx *= -1;
        if (node.y < 0 || node.y > height) node.vy *= -1;
        node.x = Math.min(Math.max(node.x, 0), width);
        node.y = Math.min(Math.max(node.y, 0), height);
      }
      draw();
      frame = requestAnimationFrame(tick);
    };

    const stop = () => cancelAnimationFrame(frame);
    const start = () => {
      stop();
      if (!ready || !visible || document.hidden) return;
      last = performance.now();
      frame = requestAnimationFrame(tick);
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      // Kepadatan mengikuti luas, dengan batas agar tetap ringan di layar besar.
      const target = Math.min(Math.max(Math.round((width * height) / 15000), 14), 72);
      nodes = nodes.filter((node) => node.x <= width && node.y <= height).slice(0, target);
      while (nodes.length < target) nodes.push(spawn());
      draw();
    };

    const sizeObserver = new ResizeObserver(resize);
    const viewObserver = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      start();
    });
    sizeObserver.observe(canvas);
    viewObserver.observe(canvas);
    document.addEventListener("visibilitychange", start);
    resize();
    const cancelReady = afterPageSettles(() => {
      ready = true;
      start();
    });

    return () => {
      cancelReady();
      stop();
      sizeObserver.disconnect();
      viewObserver.disconnect();
      document.removeEventListener("visibilitychange", start);
    };
  }, [tone]);

  return <canvas ref={ref} aria-hidden="true" className={cn("pointer-events-none absolute inset-0 h-full w-full", className)} />;
}
