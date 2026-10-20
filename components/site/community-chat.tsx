"use client";

import { LoaderCircle, MessagesSquare, SendHorizontal, ShieldCheck, VolumeX } from "lucide-react";
import { Fragment, useEffect, useRef, useState } from "react";
import { initials } from "@/components/admin/detail-panels";
import type { ChatMessage } from "@/lib/community";
import { cn } from "@/lib/utils";

/**
 * Jeda baca ulang (setiap pembacaan = satu permintaan ke server): cepat selama obrolan ramai atau pengguna sedang mengetik,
 * lalu melambat bila sepi. Saat halaman tidak terlihat, tidak ada pembacaan sama sekali.
 */
function pollDelay(idleMs: number) {
  if (idleMs < 60_000) return 5_000;
  if (idleMs < 5 * 60_000) return 15_000;
  return 30_000;
}
const maxLength = 1000;
const timeFormat = new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Makassar", hour: "2-digit", minute: "2-digit" });
const dayKey = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Makassar" });
const dayFormat = new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Makassar", weekday: "long", day: "numeric", month: "long" });

/** "Hari ini", "Kemarin", atau tanggalnya (WITA). */
function dayLabel(at: number) {
  const key = dayKey.format(at);
  if (key === dayKey.format(Date.now())) return "Hari ini";
  if (key === dayKey.format(Date.now() - 86_400_000)) return "Kemarin";
  return dayFormat.format(at);
}

const nearBottom = () => window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 160;
const scrollToEnd = (smooth: boolean) => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: smooth ? "smooth" : "auto" });

function Avatar({ message }: { message: ChatMessage }) {
  if (message.admin) {
    return (
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand text-white">
        <ShieldCheck className="size-4" />
      </span>
    );
  }
  return (
    <span className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-soft text-[0.6875rem] font-semibold text-brand-ink">
      {message.photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={message.photoUrl} alt="" className="size-full object-cover" />
      ) : (
        initials(message.name)
      )}
    </span>
  );
}

/**
 * Ruang obrolan Komunitas Subnet. Pesan dibaca ulang tiap 5–30 detik (makin sepi makin jarang) selama halaman terlihat; pesan yang dihapus admin ikut
 * hilang pada pembacaan berikutnya.
 */
export function CommunityChat({ initial, muted: initialMuted }: { initial: ChatMessage[]; muted: boolean }) {
  const [messages, setMessages] = useState(initial);
  const [muted, setMuted] = useState(initialMuted);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const signature = useRef(initial.map((message) => message.id).join(","));
  const stickToEnd = useRef(true);
  const input = useRef<HTMLTextAreaElement>(null);
  // Terakhir ada pesan baru, pesan terkirim, atau pengguna mengetik; menentukan jeda baca ulang.
  const lastActivity = useRef(0);

  // Pesan baru: ikut turun bila pengguna memang sedang di bagian bawah (atau baru saja mengirim).
  useEffect(() => {
    if (stickToEnd.current) scrollToEnd(messages.length > 0 && signature.current !== "");
  }, [messages]);

  useEffect(() => {
    scrollToEnd(false);
    lastActivity.current = Date.now();
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      clearTimeout(timer);
      if (!stopped && !document.hidden) timer = setTimeout(load, pollDelay(Date.now() - lastActivity.current));
    };
    const load = async () => {
      if (document.hidden) return;
      try {
        const response = await fetch("/subnet/chat", { cache: "no-store" });
        if (!response.ok) return;
        const data = (await response.json()) as { messages: ChatMessage[]; muted: boolean };
        if (stopped) return;
        setMuted(data.muted);
        const next = data.messages.map((message) => message.id).join(",");
        if (next !== signature.current) {
          signature.current = next;
          stickToEnd.current = nearBottom();
          lastActivity.current = Date.now();
          setMessages(data.messages);
        }
      } catch {
        // Jaringan putus sesaat: dicoba lagi pada putaran berikutnya.
      } finally {
        schedule();
      }
    };
    // Kembali ke halaman: langsung dibaca, lalu jadwal berjalan lagi.
    const onVisible = () => {
      if (document.hidden) return clearTimeout(timer);
      lastActivity.current = Date.now();
      void load();
    };
    schedule();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      stopped = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  async function send() {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    setError("");
    try {
      const response = await fetch("/subnet/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body }) });
      const data = (await response.json()) as { messages?: ChatMessage[]; error?: string };
      if (!response.ok || !data.messages) {
        setError(data.error ?? "Pesan gagal dikirim.");
        if (response.status === 403) setMuted(true);
        return;
      }
      setDraft("");
      lastActivity.current = Date.now();
      signature.current = data.messages.map((message) => message.id).join(",");
      stickToEnd.current = true;
      setMessages(data.messages);
      input.current?.focus();
    } catch {
      setError("Pesan gagal dikirim. Periksa koneksi internet Anda.");
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="flex min-w-0 flex-1 flex-col rounded-2xl border bg-card">
      <div className="flex items-center gap-3 border-b px-4 py-3 sm:px-5">
        <span className="flex size-9 items-center justify-center rounded-full bg-brand-soft text-brand-ink">
          <MessagesSquare className="size-[1.1rem]" />
        </span>
        {/* w-0 + flex-1: teks satu baris yang terpotong tidak ikut melebarkan halaman di HP. */}
        <div className="w-0 flex-1">
          <h2 className="text-[0.9375rem] font-semibold">Komunitas Subnet</h2>
          <p className="truncate text-xs text-muted-foreground">Ruang chat semua pelanggan Subnet TLINET. Jaga sopan santun, ya.</p>
        </div>
      </div>

      <ol className="flex flex-1 flex-col gap-1 px-3 py-4 sm:px-5" aria-live="polite">
        {messages.length === 0 && (
          <li className="m-auto max-w-64 py-16 text-center text-sm text-muted-foreground">Belum ada pesan. Sapa sesama pelanggan Subnet dengan pesan pertama Anda.</li>
        )}
        {messages.map((message, index) => {
          const previous = messages[index - 1];
          const newDay = !previous || dayKey.format(previous.at) !== dayKey.format(message.at);
          // Pesan beruntun dari pengirim yang sama dalam 5 menit digabung tanpa nama dan foto berulang.
          const grouped = !newDay && previous && previous.mine === message.mine && previous.name === message.name && previous.admin === message.admin && message.at - previous.at < 5 * 60_000;
          return (
            <Fragment key={message.id}>
              {newDay && (
                <li className="my-3 flex justify-center">
                  <span className="rounded-full bg-muted px-3 py-1 text-[0.6875rem] font-medium text-muted-foreground">{dayLabel(message.at)}</span>
                </li>
              )}
              <li className={cn("flex items-end gap-2", message.mine ? "justify-end" : "justify-start", !grouped && "mt-2")}>
                {!message.mine && (grouped ? <span className="w-8 shrink-0" /> : <Avatar message={message} />)}
                <div className={cn("flex max-w-[80%] flex-col sm:max-w-[70%]", message.mine ? "items-end" : "items-start")}>
                  {!message.mine && !grouped && (
                    <span className={cn("mb-0.5 flex items-center gap-1 px-1 text-[0.6875rem] font-semibold", message.admin ? "text-brand-ink" : "text-muted-foreground")}>
                      {message.name}
                      {message.admin && <span className="rounded bg-brand px-1 py-px text-[0.5625rem] font-bold tracking-wide text-white uppercase">Admin</span>}
                    </span>
                  )}
                  <div
                    className={cn(
                      "rounded-2xl px-3.5 py-2 text-sm leading-relaxed break-words whitespace-pre-wrap",
                      message.mine ? "rounded-br-md bg-brand text-white" : message.admin ? "rounded-bl-md bg-brand-soft text-foreground ring-1 ring-brand/20" : "rounded-bl-md bg-neutral-100 text-foreground",
                    )}
                  >
                    {message.body}
                  </div>
                  <span className="mt-0.5 px-1 text-[0.625rem] text-muted-foreground tabular-nums">{timeFormat.format(message.at)}</span>
                </div>
              </li>
            </Fragment>
          );
        })}
      </ol>

      {/* Kolom tulis menempel di atas navigasi bawah (HP) atau di bawah layar (layar lebar). */}
      <div className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] rounded-b-2xl border-t bg-card px-3 py-3 sm:px-4 md:bottom-0">
        {muted ? (
          <p className="flex items-center justify-center gap-2 py-2 text-center text-sm text-muted-foreground">
            <VolumeX className="size-4" />
            Akun Anda dibisukan admin. Anda masih bisa membaca pesan.
          </p>
        ) : (
          <form
            className="flex items-end gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              void send();
            }}
          >
            <textarea
              ref={input}
              value={draft}
              onChange={(event) => {
                setDraft(event.target.value.slice(0, maxLength));
                lastActivity.current = Date.now();
              }}
              onKeyDown={(event) => {
                // Enter mengirim, Shift+Enter membuat baris baru.
                if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                  event.preventDefault();
                  void send();
                }
              }}
              rows={1}
              placeholder="Tulis pesan…"
              aria-label="Tulis pesan"
              className="field-sizing-content max-h-32 min-h-10 w-full min-w-0 flex-1 resize-none rounded-2xl border bg-background px-4 py-2.5 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
            />
            <button
              type="submit"
              disabled={sending || !draft.trim()}
              aria-label="Kirim pesan"
              className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand text-white transition-opacity disabled:opacity-40"
            >
              {sending ? <LoaderCircle className="size-[1.1rem] animate-spin" /> : <SendHorizontal className="size-[1.1rem]" />}
            </button>
          </form>
        )}
        {error && <p className="mt-1.5 px-1 text-xs text-destructive">{error}</p>}
      </div>
    </section>
  );
}
