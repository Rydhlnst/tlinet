"use client";

import { ImagePlus, LoaderCircle, MessagesSquare, SendHorizontal, ShieldCheck, Smile, VolumeX, X } from "lucide-react";
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

/**
 * Gambar selalu digambar ulang di perangkat sebelum dikirim: sisi terpanjang paling besar 1280 px, WebP (atau JPEG
 * bila peramban tidak bisa menulis WebP), mutu diturunkan bertahap sampai di bawah ±350 KB. Menggambar ulang juga
 * membuang data EXIF (lokasi GPS, merek HP) dari foto.
 */
const imageSteps: [side: number, quality: number][] = [
  [1280, 0.78],
  [1280, 0.68],
  [1080, 0.62],
  [900, 0.55],
];
const imageTargetBytes = 350 * 1024;
/** Batas server (lihat lib/community.ts). */
const imageMaxBytes = 600 * 1024;

function encode(bitmap: ImageBitmap, side: number, type: string, quality: number) {
  const scale = Math.min(1, side / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext("2d");
  if (!context) return Promise.resolve(null);
  // Latar putih untuk gambar transparan (PNG) supaya tidak menjadi hitam di JPEG.
  context.fillStyle = "#fff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
}

async function compressImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  try {
    let best: Blob | null = null;
    for (const [side, quality] of imageSteps) {
      let blob = await encode(bitmap, side, "image/webp", quality);
      if (blob && blob.type !== "image/webp") blob = await encode(bitmap, side, "image/jpeg", quality);
      if (blob && (!best || blob.size < best.size)) best = blob;
      if (best && best.size <= imageTargetBytes) break;
    }
    if (!best) throw new Error("encode");
    return best;
  } finally {
    bitmap.close();
  }
}

/** Emoji yang sering dipakai, tanpa pustaka tambahan: huruf emoji bawaan perangkat. */
const emojiGroups: { label: string; items: string[] }[] = [
  { label: "Wajah", items: ["😀", "😁", "😂", "🤣", "😊", "🙂", "😉", "😍", "😘", "😎", "🤩", "🥳", "😇", "🤗", "🤔", "😅", "😬", "😮", "😴", "😢", "😭", "😡", "🙄", "😷"] },
  { label: "Tangan", items: ["👍", "👎", "👏", "🙏", "💪", "🤝", "👋", "🙌", "👌", "✌️", "🤞", "☝️"] },
  { label: "Lainnya", items: ["❤️", "🔥", "💯", "🎉", "✅", "❌", "⚠️", "💡", "📶", "🌐", "📡", "💻", "📱", "🔌", "⚡", "🚀", "⏳", "📍", "☕", "🌙"] },
];

/** Mencatat waktu aktivitas terakhir (menentukan jeda baca ulang); di luar komponen supaya aman dipanggil dari handler mana pun. */
const touch = (ref: { current: number }) => {
  ref.current = Date.now();
};

const formatKb = (bytes: number) => `${Math.max(1, Math.round(bytes / 1024))} KB`;

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
 * Ruang obrolan Forum Subnet. Pesan dibaca ulang tiap 5–30 detik (makin sepi makin jarang) selama halaman terlihat; pesan yang dihapus admin ikut
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
  const picker = useRef<HTMLInputElement>(null);
  // Gambar yang sudah diperkecil dan siap dikirim, dengan pratinjaunya.
  const [attachment, setAttachment] = useState<{ blob: Blob; preview: string } | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
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

  /** Menyisipkan emoji di posisi kursor (atau di akhir), lalu kursor diletakkan setelahnya. */
  function insertEmoji(emoji: string) {
    const field = input.current;
    const start = field?.selectionStart ?? draft.length;
    const end = field?.selectionEnd ?? draft.length;
    const next = (draft.slice(0, start) + emoji + draft.slice(end)).slice(0, maxLength);
    setDraft(next);
    touch(lastActivity);
    requestAnimationFrame(() => {
      field?.focus();
      const caret = Math.min(start + emoji.length, next.length);
      field?.setSelectionRange(caret, caret);
    });
  }

  function clearAttachment() {
    if (attachment) URL.revokeObjectURL(attachment.preview);
    setAttachment(null);
  }

  async function pickImage(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) return setError("Pilih berkas gambar.");
    setError("");
    setPreparing(true);
    try {
      const blob = await compressImage(file);
      if (blob.size > imageMaxBytes) return setError("Gambar ini tidak bisa diperkecil cukup. Coba gambar lain.");
      clearAttachment();
      setAttachment({ blob, preview: URL.createObjectURL(blob) });
      lastActivity.current = Date.now();
    } catch {
      setError("Gambar tidak bisa dibaca. Coba gambar lain (JPG, PNG, atau WebP).");
    } finally {
      setPreparing(false);
      if (picker.current) picker.current.value = "";
    }
  }

  async function send() {
    const body = draft.trim();
    if ((!body && !attachment) || sending || preparing) return;
    setSending(true);
    setError("");
    try {
      let request: RequestInit = { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body }) };
      if (attachment) {
        const form = new FormData();
        form.set("body", body);
        form.set("image", attachment.blob, attachment.blob.type === "image/webp" ? "gambar.webp" : "gambar.jpg");
        request = { method: "POST", body: form };
      }
      const response = await fetch("/subnet/chat", request);
      const data = (await response.json()) as { messages?: ChatMessage[]; error?: string };
      if (!response.ok || !data.messages) {
        setError(data.error ?? "Pesan gagal dikirim.");
        if (response.status === 403) setMuted(true);
        return;
      }
      setDraft("");
      setEmojiOpen(false);
      clearAttachment();
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
          <h2 className="text-[0.9375rem] font-semibold">Forum Subnet</h2>
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
                  {message.imageUrl && (
                    <a href={message.imageUrl} target="_blank" rel="noopener" className={cn("mb-1 block overflow-hidden rounded-2xl border bg-muted", message.mine ? "rounded-br-md" : "rounded-bl-md")}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={message.imageUrl} alt={message.body ? `Gambar: ${message.body.slice(0, 80)}` : `Gambar dari ${message.name}`} loading="lazy" className="max-h-80 w-auto max-w-full object-contain" />
                    </a>
                  )}
                  {message.body && (
                    <div
                      className={cn(
                        "rounded-2xl px-3.5 py-2 text-sm leading-relaxed break-words whitespace-pre-wrap",
                        message.mine ? "rounded-br-md bg-brand text-white" : message.admin ? "rounded-bl-md bg-brand-soft text-foreground ring-1 ring-brand/20" : "rounded-bl-md bg-neutral-100 text-foreground",
                      )}
                    >
                      {message.body}
                    </div>
                  )}
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
            className="flex flex-col gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              void send();
            }}
          >
            {emojiOpen && (
              <div className="max-h-56 overflow-y-auto rounded-xl border bg-card p-2 shadow-sm" role="dialog" aria-label="Pilih emoji">
                {emojiGroups.map((group) => (
                  <div key={group.label} className="mb-1 last:mb-0">
                    <p className="px-1 pb-1 text-[0.625rem] font-semibold tracking-wide text-muted-foreground uppercase">{group.label}</p>
                    <div className="grid grid-cols-8 gap-0.5 sm:grid-cols-12">
                      {group.items.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => insertEmoji(emoji)}
                          aria-label={`Sisipkan ${emoji}`}
                          className="flex aspect-square items-center justify-center rounded-lg text-xl hover:bg-muted active:scale-90"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {(attachment || preparing) && (
              <div className="flex items-center gap-3 rounded-xl border bg-muted/50 p-2">
                {attachment ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={attachment.preview} alt="Pratinjau gambar" className="size-14 rounded-lg object-cover" />
                ) : (
                  <span className="flex size-14 items-center justify-center rounded-lg bg-muted">
                    <LoaderCircle className="size-5 animate-spin text-muted-foreground" />
                  </span>
                )}
                <p className="min-w-0 flex-1 text-xs text-muted-foreground">{attachment ? `Gambar siap dikirim · ${formatKb(attachment.blob.size)}` : "Memperkecil gambar…"}</p>
                {attachment && (
                  <button type="button" onClick={clearAttachment} aria-label="Batalkan gambar" className="flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted">
                    <X className="size-4" />
                  </button>
                )}
              </div>
            )}
            <div className="flex items-end gap-2">
              <input ref={picker} type="file" accept="image/*" className="hidden" onChange={(event) => void pickImage(event.target.files?.[0])} />
              <button
                type="button"
                onClick={() => picker.current?.click()}
                disabled={sending || preparing}
                aria-label="Lampirkan gambar"
                className="flex size-10 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted disabled:opacity-40"
              >
                <ImagePlus className="size-5" />
              </button>
              <button
                type="button"
                onClick={() => setEmojiOpen((open) => !open)}
                aria-label={emojiOpen ? "Tutup emoji" : "Pilih emoji"}
                aria-pressed={emojiOpen}
                className={cn("-ml-1 flex size-10 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-muted", emojiOpen ? "text-brand-ink" : "text-muted-foreground")}
              >
                <Smile className="size-5" />
              </button>
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
                placeholder={attachment ? "Tambahkan keterangan (opsional)…" : "Tulis pesan…"}
                aria-label="Tulis pesan"
                className="field-sizing-content max-h-32 min-h-10 w-full min-w-0 flex-1 resize-none rounded-2xl border bg-background px-4 py-2.5 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
              />
              <button
                type="submit"
                disabled={sending || preparing || (!draft.trim() && !attachment)}
                aria-label="Kirim pesan"
                className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand text-white transition-opacity disabled:opacity-40"
              >
                {sending ? <LoaderCircle className="size-[1.1rem] animate-spin" /> : <SendHorizontal className="size-[1.1rem]" />}
              </button>
            </div>
          </form>
        )}
        {error && <p className="mt-1.5 px-1 text-xs text-destructive">{error}</p>}
      </div>
    </section>
  );
}
