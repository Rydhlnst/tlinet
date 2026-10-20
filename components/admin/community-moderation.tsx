"use client";

import { LoaderCircle, MessageSquareOff, SendHorizontal, ShieldCheck, Trash2, Volume2, VolumeX } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition, type ReactNode } from "react";
import { toast } from "sonner";
import { deleteCommunityMessageAction, postCommunityAdminAction, setChatMutedAction } from "@/app/admin/community-actions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { SaveResult } from "@/lib/cms/store";
import { cn } from "@/lib/utils";
import { initials } from "./detail-panels";

export type ModerationMessage = {
  id: string;
  customerId: string | null;
  admin: boolean;
  name: string;
  body: string;
  imageUrl: string;
  at: number;
  deleted: boolean;
  muted: boolean;
  photoUrl: string;
};

/** Membungkus foto pelanggan dengan tautan ke detailnya di Data Pelanggan (bila boleh dibuka). */
function ProfileLink({ customerId, label, children }: { customerId: string | null; label: string; children: ReactNode }) {
  if (!customerId) return <>{children}</>;
  return (
    <Link href={`/admin/data/customers/${customerId}`} aria-label={label} title={label} className="shrink-0 rounded-full transition-opacity hover:opacity-80">
      {children}
    </Link>
  );
}

const timeFormat = new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Makassar", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

/** Ruang moderasi Forum Subnet: kirim pengumuman, hapus pesan, dan bisukan pelanggan. Dimuat ulang tiap 30 detik. */
export function CommunityModeration({ messages, customerLinks = false }: { messages: ModerationMessage[]; customerLinks?: boolean }) {
  const router = useRouter();
  const [draft, setDraft] = useState("");
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState("");

  useEffect(() => {
    const timer = setInterval(() => {
      if (!document.hidden) router.refresh();
    }, 30_000);
    return () => clearInterval(timer);
  }, [router]);

  function run(key: string, action: () => Promise<SaveResult>, after?: () => void) {
    setBusy(key);
    startTransition(async () => {
      const result = await action();
      setBusy("");
      if (result.ok) {
        toast.success(result.message);
        after?.();
        router.refresh();
      } else toast.error(result.message);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <form
        className="flex items-end gap-2 rounded-2xl border bg-card p-3 shadow-[0_6px_24px_-16px_rgba(15,23,42,0.3)]"
        onSubmit={(event) => {
          event.preventDefault();
          if (draft.trim()) run("post", () => postCommunityAdminAction(draft), () => setDraft(""));
        }}
      >
        <span className="mb-1 flex size-9 shrink-0 items-center justify-center rounded-full bg-brand text-white">
          <ShieldCheck className="size-4" />
        </span>
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value.slice(0, 1000))}
          rows={1}
          placeholder="Tulis pengumuman atau balasan sebagai PT.Trans Link Internasional…"
          aria-label="Pesan admin"
          className="field-sizing-content max-h-40 min-h-10 w-full min-w-0 flex-1 resize-none rounded-xl border bg-background px-3.5 py-2.5 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
        />
        <Button type="submit" size="lg" className="rounded-full" disabled={pending || !draft.trim()}>
          {busy === "post" ? <LoaderCircle className="animate-spin" /> : <SendHorizontal />}
          Kirim
        </Button>
      </form>

      <div className="overflow-hidden rounded-2xl border bg-card shadow-[0_6px_24px_-16px_rgba(15,23,42,0.3)]">
        <ul className="divide-y">
          {messages.map((message) => (
            <li key={message.id} className={cn("flex items-start gap-3 px-4 py-3 sm:px-5", message.deleted && "opacity-55")}>
              {message.admin ? (
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand text-white">
                  <ShieldCheck className="size-4" />
                </span>
              ) : (
                <ProfileLink customerId={customerLinks ? message.customerId : null} label={`Lihat profil ${message.name}`}>
                  <Avatar className="size-9">
                    {message.photoUrl && <AvatarImage src={message.photoUrl} alt="" />}
                    <AvatarFallback className="bg-brand-soft text-xs font-semibold text-brand-ink">{initials(message.name)}</AvatarFallback>
                  </Avatar>
                </ProfileLink>
              )}
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm">
                  {customerLinks && message.customerId ? (
                    <Link href={`/admin/data/customers/${message.customerId}`} className="font-semibold underline-offset-4 hover:text-brand-ink hover:underline">
                      {message.name}
                    </Link>
                  ) : (
                    <span className="font-semibold">{message.name}</span>
                  )}
                  {message.admin && <span className="rounded bg-brand px-1 py-px text-[10px] font-bold tracking-wide text-white uppercase">Admin</span>}
                  {message.muted && (
                    <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-1.5 py-px text-[11px] font-medium text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
                      <VolumeX className="size-3" />
                      Dibisukan
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground tabular-nums">{timeFormat.format(message.at)} WITA</span>
                  {message.deleted && <span className="text-xs font-medium text-rose-500">· dihapus</span>}
                </p>
                {message.imageUrl && (
                  <a href={message.imageUrl} target="_blank" rel="noopener" className="mt-1.5 inline-block overflow-hidden rounded-lg border">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={message.imageUrl} alt="Gambar pesan" loading="lazy" className="max-h-40 w-auto" />
                  </a>
                )}
                {message.body && <p className={cn("mt-0.5 text-sm break-words whitespace-pre-wrap text-foreground/90", message.deleted && "line-through")}>{message.body}</p>}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {message.customerId && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    disabled={pending}
                    title={message.muted ? "Izinkan mengirim pesan lagi" : "Bisukan pelanggan ini"}
                    aria-label={message.muted ? `Aktifkan lagi ${message.name}` : `Bisukan ${message.name}`}
                    className={message.muted ? "text-emerald-600" : "text-amber-600"}
                    onClick={() => run(`mute-${message.id}`, () => setChatMutedAction(message.customerId!, !message.muted))}
                  >
                    {busy === `mute-${message.id}` ? <LoaderCircle className="animate-spin" /> : message.muted ? <Volume2 /> : <VolumeX />}
                  </Button>
                )}
                {!message.deleted && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    disabled={pending}
                    title="Hapus pesan"
                    aria-label="Hapus pesan"
                    className="text-rose-500 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10"
                    onClick={() => run(`delete-${message.id}`, () => deleteCommunityMessageAction(message.id))}
                  >
                    {busy === `delete-${message.id}` ? <LoaderCircle className="animate-spin" /> : <Trash2 />}
                  </Button>
                )}
              </div>
            </li>
          ))}
          {messages.length === 0 && (
            <li className="flex flex-col items-center gap-2 px-4 py-14 text-center text-sm text-muted-foreground">
              <MessageSquareOff className="size-6" />
              Belum ada pesan di Forum.
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
