"use client";

import { useEffect, useRef } from "react";
import { afterPageSettles, frameInterval } from "@/lib/after-load";
import { cn } from "@/lib/utils";

const POINTS = 170;
/** Tiap titik disambung ke sejumlah tetangga terdekatnya sehingga membentuk jaring bola. */
const NEIGHBOURS = 6;
/** Kemiringan sumbu putar, radian. */
const TILT = -0.32;
/** Radian per detik: satu putaran sekitar 40 detik. */
const SPEED = 0.16;
const MAX_LABELS = 10;
/** Biru merek, sama dengan garis NodeField di permukaan terang. */
const LINE = "36, 86, 245";
/** Rona yang cukup gelap untuk dibaca sebagai teks label di atas putih. */
const palette = ["#2456f5", "#0284c7", "#4f46e5", "#0891b2", "#d97706"];

/** Acak berbenih, supaya susunan titik sama di setiap muat halaman. */
function seeded(seed: number) {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Bola jaring yang berputar pelan, dengan beberapa titiknya diberi label nama mitra dan klien.
 * Animasi berhenti ketika tidak terlihat, dan melambat bila pengguna meminta gerak dikurangi.
 */
export function NetworkGlobe({ labels, className }: { labels: string[]; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const key = labels.slice(0, MAX_LABELS).join("|");

  useEffect(() => {
    const canvas = ref.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    const names = key ? key.split("|") : [];
    const random = seeded(7);
    const pace = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0.4 : 1;
    const font = `500 11px ${getComputedStyle(canvas).fontFamily}`;

    // Titik merata di permukaan bola (spiral Fibonacci).
    const points = Array.from({ length: POINTS }, (_, index) => {
      const y = 1 - (2 * (index + 0.5)) / POINTS;
      const radius = Math.sqrt(1 - y * y);
      const turn = index * Math.PI * (3 - Math.sqrt(5));
      return [Math.cos(turn) * radius, y, Math.sin(turn) * radius];
    });
    const edges: [number, number][] = [];
    const seen = new Set<string>();
    points.forEach((point, index) => {
      points
        .map((other, at) => ({ at, distance: Math.hypot(point[0] - other[0], point[1] - other[1], point[2] - other[2]) }))
        .filter((entry) => entry.at !== index)
        .sort((a, b) => a.distance - b.distance)
        .slice(0, NEIGHBOURS)
        .forEach(({ at }) => {
          const id = index < at ? `${index}-${at}` : `${at}-${index}`;
          if (seen.has(id)) return;
          seen.add(id);
          edges.push([index, at]);
        });
    });
    const dots = points.map(() => (random() < 0.3 ? { color: palette[Math.floor(random() * palette.length)], size: 1 + random() * 1.5 } : null));
    const stars = Array.from({ length: 36 }, () => ({ x: random(), y: random(), size: 0.5 + random() * 0.8, alpha: 0.12 + random() * 0.3 }));
    // Label disebar di sabuk tengah bola; dekat kutub label saling menumpuk.
    const labelled = new Map(
      names.map((name, index) => [Math.round(POINTS * 0.14 + ((index + 0.5) * POINTS * 0.72) / names.length), { name, color: palette[index % palette.length] }]),
    );

    let width = 0;
    let height = 0;
    let angle = 0.6;
    let frame = 0;
    let last = 0;
    let visible = true;
    // Animasi baru berjalan setelah halaman selesai dimuat; sebelumnya cukup satu bingkai diam.
    let ready = false;

    const draw = () => {
      context.clearRect(0, 0, width, height);
      const centerX = width / 2;
      const centerY = height / 2;
      const radius = Math.max(Math.min(width, height) / 2 - 30, 10);
      const sinA = Math.sin(angle);
      const cosA = Math.cos(angle);
      const sinT = Math.sin(TILT);
      const cosT = Math.cos(TILT);
      const projected = points.map(([x, y, z]) => {
        const turnedX = x * cosA + z * sinA;
        const turnedZ = -x * sinA + z * cosA;
        return { x: centerX + turnedX * radius, y: centerY - (y * cosT - turnedZ * sinT) * radius, depth: y * sinT + turnedZ * cosT };
      });

      for (const star of stars) {
        context.fillStyle = `rgba(${LINE}, ${star.alpha})`;
        context.fillRect(star.x * width, star.y * height, star.size, star.size);
      }

      const glow = context.createRadialGradient(centerX, centerY, radius * 0.2, centerX, centerY, radius);
      glow.addColorStop(0, `rgba(${LINE}, 0)`);
      glow.addColorStop(1, `rgba(${LINE}, 0.07)`);
      context.fillStyle = glow;
      context.beginPath();
      context.arc(centerX, centerY, radius, 0, Math.PI * 2);
      context.fill();
      context.lineWidth = 1;
      context.strokeStyle = `rgba(${LINE}, 0.3)`;
      context.stroke();

      context.lineWidth = 0.8;
      for (const [from, to] of edges) {
        const a = projected[from];
        const b = projected[to];
        const front = ((a.depth + b.depth) / 2 + 1) / 2;
        context.strokeStyle = `rgba(${LINE}, ${0.05 + 0.3 * front * front})`;
        context.beginPath();
        context.moveTo(a.x, a.y);
        context.lineTo(b.x, b.y);
        context.stroke();
      }

      projected.forEach((point, index) => {
        const label = labelled.get(index);
        const dot = label ? { color: label.color, size: 2.8 } : dots[index];
        if (!dot) return;
        const front = (point.depth + 1) / 2;
        context.globalAlpha = 0.25 + 0.75 * front;
        context.fillStyle = dot.color;
        context.shadowColor = dot.color;
        context.shadowBlur = point.depth > 0 ? (label ? 10 : 4) : 0;
        context.beginPath();
        context.arc(point.x, point.y, dot.size * (0.65 + 0.35 * front), 0, Math.PI * 2);
        context.fill();
      });
      context.shadowBlur = 0;

      context.font = font;
      context.textBaseline = "middle";
      for (const [index, label] of labelled) {
        const point = projected[index];
        const alpha = Math.min(Math.max((point.depth - 0.1) / 0.3, 0), 1);
        if (alpha === 0) continue;
        const boxWidth = context.measureText(label.name).width + 14;
        const boxHeight = 20;
        const left = point.x + 8 + boxWidth > width - 2 ? point.x - 8 - boxWidth : point.x + 8;
        const x = Math.max(left, 2);
        const y = Math.max(point.y - 26, 2);
        context.globalAlpha = alpha;
        context.beginPath();
        if (context.roundRect) context.roundRect(x, y, boxWidth, boxHeight, 5);
        else context.rect(x, y, boxWidth, boxHeight);
        context.fillStyle = "rgba(255, 255, 255, 0.94)";
        context.fill();
        context.globalAlpha = alpha * 0.5;
        context.strokeStyle = label.color;
        context.stroke();
        context.globalAlpha = alpha;
        context.fillStyle = label.color;
        context.fillText(label.name, x + 7, y + boxHeight / 2 + 0.5);
      }
      context.globalAlpha = 1;
    };

    const tick = (time: number) => {
      if (time - last < frameInterval) {
        frame = requestAnimationFrame(tick);
        return;
      }
      angle += Math.min((time - last) / 1000, 0.1) * SPEED * pace;
      last = time;
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
  }, [key]);

  return <canvas ref={ref} aria-hidden="true" className={cn("pointer-events-none h-full w-full", className)} />;
}
