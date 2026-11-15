"use client";

import { AlertTriangle, Check, ChevronDown, Copy, LoaderCircle, Maximize2, Minimize2, RefreshCcw, RotateCcw, Send, Sparkles, X } from "lucide-react";
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChatChart } from "./chat-chart";
import { Markdown } from "./markdown";
import type { ApiMessage, PendingWrite, StreamEvent } from "@/lib/ai/chat-types";
import type { ChartSpec, ToolResult } from "@/lib/ai/types";

type TimelineItem =
  | { id: string; kind: "user"; text: string }
  | { id: string; kind: "assistant"; text: string }
  | { id: string; kind: "chart"; chart: ChartSpec }
  | { id: string; kind: "note"; text: string; tone: "ok" | "error"; retry?: boolean };

/** Omit "id" dari tiap anggota union secara terpisah (Omit biasa akan meruntuhkan union). */
type NoId<T> = T extends unknown ? Omit<T, "id"> : never;

let counter = 0;
const nextId = () => `i${++counter}`;

const SUGGESTIONS = ["Bagaimana keuangan bulan ini?", "Siapa saja yang belum bayar?", "Tambah FAQ baru", "Ganti teks hero beranda"];
const DEFAULT_SIZE = { w: 480, h: 640 };

/** `chatUrl`/`confirmUrl` bisa dialihkan untuk pengujian; secara bawaan memakai endpoint admin asli. */
export function ChatPanel({ chatUrl = "/api/admin/ai/chat", confirmUrl = "/api/admin/ai/confirm" }: { chatUrl?: string; confirmUrl?: string } = {}) {
  const [open, setOpen] = useState(false);
  const [apiMessages, setApiMessages] = useState<ApiMessage[]>([]);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [pending, setPending] = useState<PendingWrite | null>(null);
  const [busy, setBusy] = useState(false);
  const [activity, setActivity] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [size, setSize] = useState(DEFAULT_SIZE);
  const [maximized, setMaximized] = useState(false);
  const [atBottom, setAtBottom] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const sizeRef = useRef(size);
  sizeRef.current = size;
  const savedSizeRef = useRef(DEFAULT_SIZE);
  const streamingRef = useRef<string | null>(null);
  const atBottomRef = useRef(true);
  atBottomRef.current = atBottom;
  const lastTurnRef = useRef<ApiMessage[] | null>(null);
  const scroller = useRef<HTMLDivElement>(null);

  // Gulir otomatis ke bawah saat ada pesan baru — kecuali pengguna sedang menggulir ke atas.
  useEffect(() => {
    if (atBottomRef.current) scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [timeline, pending, activity, busy]);

  // Cek sekali apakah AI sudah dikonfigurasi; muat ukuran tersimpan.
  useEffect(() => {
    if (!open || configured !== null) return;
    fetch(chatUrl)
      .then((response) => response.json())
      .then((data) => setConfigured(Boolean(data.configured)))
      .catch(() => setConfigured(false));
  }, [open, configured]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("tl_ai_size");
      const base = saved ? JSON.parse(saved) : DEFAULT_SIZE;
      const next = { w: Math.min(Math.max(340, Number(base.w) || DEFAULT_SIZE.w), window.innerWidth - 24), h: Math.min(Math.max(380, Number(base.h) || DEFAULT_SIZE.h), window.innerHeight - 24) };
      savedSizeRef.current = next;
      setSize(next);
    } catch {
      /* localStorage tak tersedia */
    }
  }, []);

  // Esc menutup panel.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const push = (item: NoId<TimelineItem>) => setTimeline((list) => [...list, { ...item, id: nextId() } as TimelineItem]);

  function appendDelta(text: string) {
    if (!streamingRef.current) {
      const id = nextId();
      streamingRef.current = id;
      setTimeline((list) => [...list, { id, kind: "assistant", text }]);
    } else {
      const id = streamingRef.current;
      setTimeline((list) => list.map((item) => (item.id === id && item.kind === "assistant" ? { ...item, text: item.text + text } : item)));
    }
  }

  function handleEvent(event: StreamEvent) {
    if (event.type === "delta") {
      setActivity(null);
      appendDelta(event.text);
    } else if (event.type === "tool") {
      streamingRef.current = null;
      setActivity(event.label);
    } else if (event.type === "chart") {
      streamingRef.current = null;
      push({ kind: "chart", chart: event.chart });
    } else if (event.type === "pending") {
      streamingRef.current = null;
      setActivity(null);
      setPending(event.pending);
    } else if (event.type === "done") {
      streamingRef.current = null;
      setApiMessages(event.messages);
    } else if (event.type === "error") {
      streamingRef.current = null;
      push({ kind: "note", text: event.error, tone: "error", retry: true });
    }
  }

  async function turn(messages: ApiMessage[]) {
    lastTurnRef.current = messages;
    setBusy(true);
    setActivity("Memproses…");
    streamingRef.current = null;
    try {
      const response = await fetch(chatUrl, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ messages }) });
      if (!response.ok || !response.body) {
        push({ kind: "note", text: response.status === 401 ? "Sesi berakhir. Muat ulang halaman." : "Gagal menghubungi server.", tone: "error", retry: true });
        return;
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let index: number;
        while ((index = buffer.indexOf("\n\n")) >= 0) {
          const part = buffer.slice(0, index);
          buffer = buffer.slice(index + 2);
          const line = part.split("\n").find((item) => item.startsWith("data:"));
          if (!line) continue;
          try {
            handleEvent(JSON.parse(line.slice(5).trim()) as StreamEvent);
          } catch {
            /* abaikan baris rusak */
          }
        }
      }
    } catch {
      push({ kind: "note", text: "Koneksi terputus. Coba lagi.", tone: "error", retry: true });
    } finally {
      setBusy(false);
      setActivity(null);
      streamingRef.current = null;
    }
  }

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy || pending || configured === false) return;
    setInput("");
    push({ kind: "user", text: trimmed });
    const next: ApiMessage[] = [...apiMessages, { role: "user", content: trimmed }];
    setApiMessages(next);
    await turn(next);
  }

  function retry() {
    if (busy || !lastTurnRef.current) return;
    void turn(lastTurnRef.current);
  }

  async function confirm() {
    if (!pending || busy) return;
    const action = pending;
    setPending(null);
    setBusy(true);
    try {
      const response = await fetch(confirmUrl, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ tool: action.tool, args: action.args }) });
      const result = (await response.json()) as ToolResult;
      push({ kind: "note", text: result.ok ? result.summary || "Selesai." : result.error || "Gagal.", tone: result.ok ? "ok" : "error" });
      const outcome = result.ok
        ? `✅ Perubahan SUDAH dijalankan sistem dan berhasil: "${result.summary || "berhasil"}". Konfirmasikan ke pengguna dengan satu kalimat singkat. Jangan panggil tool apa pun lagi untuk permintaan ini.`
        : `Perubahan gagal dijalankan: ${result.error}. Sampaikan ke pengguna.`;
      const next: ApiMessage[] = [...apiMessages, { role: "user", content: outcome }];
      setApiMessages(next);
      setBusy(false);
      await turn(next);
    } catch {
      push({ kind: "note", text: "Gagal menjalankan perubahan.", tone: "error" });
      setBusy(false);
    }
  }

  async function cancel() {
    if (!pending) return;
    setPending(null);
    push({ kind: "note", text: "Perubahan dibatalkan.", tone: "error" });
    const next: ApiMessage[] = [...apiMessages, { role: "user", content: "Batalkan, jangan lakukan perubahan itu." }];
    setApiMessages(next);
    await turn(next);
  }

  function reset() {
    if (busy) return;
    setApiMessages([]);
    setTimeline([]);
    setPending(null);
    setInput("");
  }

  function copy(item: Extract<TimelineItem, { kind: "assistant" }>) {
    navigator.clipboard?.writeText(item.text).then(() => {
      setCopiedId(item.id);
      setTimeout(() => setCopiedId((id) => (id === item.id ? null : id)), 1500);
    });
  }

  function toggleMaximize() {
    if (maximized) {
      setSize(savedSizeRef.current);
      setMaximized(false);
    } else {
      savedSizeRef.current = sizeRef.current;
      setSize({ w: Math.min(window.innerWidth - 24, 820), h: window.innerHeight - 24 });
      setMaximized(true);
    }
  }

  function onScroll() {
    const el = scroller.current;
    if (el) setAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 60);
  }

  function onResizeStart(event: ReactPointerEvent) {
    event.preventDefault();
    setMaximized(false);
    const startX = event.clientX;
    const startY = event.clientY;
    const startW = sizeRef.current.w;
    const startH = sizeRef.current.h;
    const move = (moveEvent: PointerEvent) => {
      setSize({
        w: Math.min(Math.max(340, startW + (startX - moveEvent.clientX)), window.innerWidth - 24),
        h: Math.min(Math.max(380, startH + (startY - moveEvent.clientY)), window.innerHeight - 24),
      });
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      savedSizeRef.current = sizeRef.current;
      try {
        localStorage.setItem("tl_ai_size", JSON.stringify(sizeRef.current));
      } catch {
        /* abaikan */
      }
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed right-5 bottom-5 z-50 flex size-14 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-sky-500 text-white shadow-lg shadow-blue-500/40 transition-transform hover:scale-105"
          aria-label="Buka asisten AI"
        >
          <Sparkles className="size-6" />
        </button>
      )}

      {open && (
        <div
          style={{ width: size.w, height: size.h }}
          className="fixed right-0 bottom-0 z-50 flex w-full flex-col overflow-hidden border bg-card shadow-2xl max-sm:!h-[100dvh] max-sm:!w-full sm:right-5 sm:bottom-5 sm:rounded-2xl"
        >
          <div
            onPointerDown={onResizeStart}
            className="absolute top-0 left-0 z-20 hidden size-6 cursor-nwse-resize touch-none p-1 sm:block"
            title="Tarik untuk mengubah ukuran"
            aria-label="Ubah ukuran panel"
          >
            <svg viewBox="0 0 10 10" className="size-3.5 text-white/80" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
              <path d="M1 9 L9 1 M1 6 L6 1 M1 3 L3 1" />
            </svg>
          </div>
          <header className="flex items-center justify-between gap-2 border-b bg-gradient-to-r from-blue-600 to-sky-500 px-4 py-3 pl-7 text-white">
            <span className="flex items-center gap-2 font-semibold">
              <Sparkles className="size-5" /> Asisten TLINET
            </span>
            <div className="flex items-center gap-1">
              {timeline.length > 0 && (
                <button type="button" onClick={reset} disabled={busy} className="rounded-md p-1 hover:bg-white/20 disabled:opacity-50" aria-label="Percakapan baru" title="Percakapan baru">
                  <RefreshCcw className="size-4" />
                </button>
              )}
              <button type="button" onClick={toggleMaximize} className="hidden rounded-md p-1 hover:bg-white/20 sm:block" aria-label={maximized ? "Pulihkan ukuran" : "Perbesar"} title={maximized ? "Pulihkan ukuran" : "Perbesar"}>
                {maximized ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
              </button>
              <button type="button" onClick={() => setOpen(false)} className="rounded-md p-1 hover:bg-white/20" aria-label="Tutup">
                <X className="size-5" />
              </button>
            </div>
          </header>

          <div ref={scroller} onScroll={onScroll} className="relative flex-1 space-y-3 overflow-y-auto p-4">
            {configured === false && (
              <div className="flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
                <span>AI belum aktif. Admin perlu memasang kunci MiMo (MIMO_API_URL, MIMO_MODEL, MIMO_API_KEY) di server lalu memuat ulang.</span>
              </div>
            )}

            {timeline.length === 0 && configured !== false && (
              <div className="flex flex-col gap-3 py-6 text-center">
                <p className="text-sm text-muted-foreground">Tanya soal keuangan, kelola data, atau ubah tampilan situs.</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {SUGGESTIONS.map((text) => (
                    <button key={text} type="button" onClick={() => send(text)} className="rounded-full border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                      {text}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {timeline.map((item) => {
              if (item.kind === "user")
                return (
                  <div key={item.id} className="flex justify-end">
                    <div className="max-w-[80%] rounded-2xl rounded-br-sm bg-blue-600 px-3.5 py-2 text-sm whitespace-pre-wrap text-white">{item.text}</div>
                  </div>
                );
              if (item.kind === "assistant")
                return (
                  <div key={item.id} className="group flex items-start justify-start gap-2">
                    <span className="mt-1 flex size-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-sky-500 text-white">
                      <Sparkles className="size-3.5" />
                    </span>
                    <div className="relative max-w-[85%] rounded-2xl rounded-bl-sm bg-muted px-3.5 py-2 text-sm">
                      <Markdown text={item.text} />
                      {item.text.length > 0 && (
                        <button
                          type="button"
                          onClick={() => copy(item)}
                          className="absolute -right-2 -bottom-2 rounded-md border bg-card p-1 text-muted-foreground opacity-0 shadow-sm transition-opacity group-hover:opacity-100 hover:text-foreground"
                          aria-label="Salin"
                          title="Salin"
                        >
                          {copiedId === item.id ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
                        </button>
                      )}
                    </div>
                  </div>
                );
              if (item.kind === "chart") return <ChatChart key={item.id} spec={item.chart} />;
              return (
                <div key={item.id} className={cn("mx-auto flex w-fit max-w-full items-center gap-2 rounded-lg px-3 py-1.5 text-xs", item.tone === "ok" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300" : "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300")}>
                  {item.tone === "ok" ? <Check className="size-3.5 shrink-0" /> : <AlertTriangle className="size-3.5 shrink-0" />}
                  <span>{item.text}</span>
                  {item.retry && (
                    <button type="button" onClick={retry} disabled={busy} className="ml-1 inline-flex items-center gap-1 font-medium underline underline-offset-2 disabled:opacity-50">
                      <RotateCcw className="size-3" /> Coba lagi
                    </button>
                  )}
                </div>
              );
            })}

            {busy && activity && (
              <div className="flex items-center gap-2 pl-8 text-sm text-muted-foreground">
                <LoaderCircle className="size-4 animate-spin" /> {activity}
              </div>
            )}

            {pending && (
              <div className={cn("rounded-xl border p-3", pending.confirm.danger ? "border-rose-300 bg-rose-50 dark:border-rose-500/40 dark:bg-rose-500/10" : "border-amber-300 bg-amber-50 dark:border-amber-500/40 dark:bg-amber-500/10")}>
                <p className="flex items-center gap-2 text-sm font-semibold">
                  <AlertTriangle className={cn("size-4", pending.confirm.danger ? "text-rose-600" : "text-amber-600")} />
                  {pending.confirm.title}
                </p>
                {pending.confirm.detail && <pre className="mt-1.5 max-h-40 overflow-auto text-xs whitespace-pre-wrap text-muted-foreground">{pending.confirm.detail}</pre>}
                <div className="mt-3 flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={cancel} disabled={busy}>
                    Batal
                  </Button>
                  <Button size="sm" variant={pending.confirm.danger ? "destructive" : "default"} onClick={confirm} disabled={busy}>
                    <Check /> Konfirmasi
                  </Button>
                </div>
              </div>
            )}
          </div>

          {!atBottom && (
            <button type="button" onClick={() => scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" })} className="absolute right-4 bottom-20 z-10 rounded-full border bg-card p-2 text-muted-foreground shadow-md hover:text-foreground" aria-label="Ke bawah" title="Ke bawah">
              <ChevronDown className="size-4" />
            </button>
          )}

          <form
            onSubmit={(event) => {
              event.preventDefault();
              send(input);
            }}
            className="flex items-end gap-2 border-t p-3"
          >
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  send(input);
                }
              }}
              rows={1}
              placeholder={configured === false ? "AI belum aktif…" : pending ? "Konfirmasi dulu perubahan di atas…" : "Tulis pesan…"}
              disabled={busy || Boolean(pending) || configured === false}
              className="max-h-28 min-h-9 flex-1 resize-none rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/40 disabled:opacity-60"
            />
            <Button type="submit" size="icon" disabled={busy || !input.trim() || Boolean(pending) || configured === false} aria-label="Kirim">
              <Send />
            </Button>
          </form>
        </div>
      )}
    </>
  );
}
