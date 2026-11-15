"use client";

import { Check, ExternalLink, Eye, EyeOff, LoaderCircle, Save, FileText, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { discardContentDraftAction, publishContentAction, saveContentAction, setPreviewAction } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getPageDef } from "@/lib/cms/pages";
import { cn } from "@/lib/utils";
import { PageHero } from "./page-hero";
import { FieldGrid } from "./field-control";

type Doc = Record<string, unknown>;

/**
 * Editor satu dokumen konten (halaman atau pengaturan), dibentuk dari definisi di lib/cms/pages.ts.
 *
 * Suntingan disimpan sebagai DRAF — tidak langsung tampil ke pengunjung. Admin bisa Pratinjau (melihat situs dengan draf),
 * lalu Publikasikan agar tampil, atau Buang draf untuk kembali ke konten live. Jaring pengaman ini juga dipakai saat AI
 * mengubah konten, sehingga kesalahan tak pernah langsung terlihat publik.
 */
export function ContentForm({ pageKey, initial, hasDraft, previewOn }: { pageKey: string; initial: Doc; hasDraft: boolean; previewOn: boolean }) {
  const page = getPageDef(pageKey)!;
  const router = useRouter();
  const [doc, setDoc] = useState(initial);
  const [dirty, setDirty] = useState(false);
  const [draftExists, setDraftExists] = useState(hasDraft);
  const [active, setActive] = useState(0);
  const [saving, startSaving] = useTransition();
  const [working, startWorking] = useTransition();
  const section = page.sections[active];

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function setField(path: string, name: string, value: unknown) {
    setDirty(true);
    setDoc((current) => (path ? { ...current, [path]: { ...(current[path] as Doc), [name]: value } } : { ...current, [name]: value }));
  }

  function save() {
    startSaving(async () => {
      const result = await saveContentAction(page.key, doc);
      if (result.ok) {
        setDirty(false);
        setDraftExists(true);
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    });
  }

  function publish() {
    startWorking(async () => {
      const result = await publishContentAction(page.key);
      if (result.ok) {
        setDraftExists(false);
        toast.success(result.message);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  }

  function discard() {
    if (!window.confirm("Buang semua perubahan draf dan kembali ke konten yang sedang tampil?")) return;
    startWorking(async () => {
      const result = await discardContentDraftAction(page.key);
      if (result.ok) {
        setDraftExists(false);
        setDirty(false);
        toast.success(result.message);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  }

  function togglePreview() {
    startWorking(async () => {
      const result = await setPreviewAction(!previewOn);
      if (result.ok) {
        toast.success(result.message);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHero
        title={page.label}
        icon={FileText}
        description={<>{page.description}</>}
        actions={
          <>
            <Button asChild variant="outline" size="lg">
              <Link href={page.publicPath} target="_blank">
                <ExternalLink />
                {previewOn ? "Lihat draf" : "Lihat halaman"}
              </Link>
            </Button>
            <Button size="lg" onClick={save} disabled={saving || !dirty}>
              {saving ? <LoaderCircle className="animate-spin" /> : <Save />}
              {dirty ? "Simpan draf" : draftExists ? "Draf tersimpan" : "Tersimpan"}
            </Button>
          </>
        }
      />

      {draftExists && (
        <Card className="border-amber-300 bg-amber-50 dark:border-amber-500/40 dark:bg-amber-500/10">
          <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <Eye className="mt-0.5 size-5 shrink-0 text-amber-600 dark:text-amber-400" />
              <div>
                <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">Ada draf yang belum dipublikasikan</p>
                <p className="text-sm text-amber-800/80 dark:text-amber-200/70">
                  Pengunjung masih melihat versi lama. {previewOn ? "Mode pratinjau aktif — Anda sedang melihat draf." : "Nyalakan pratinjau untuk melihat hasilnya dulu."}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={togglePreview} disabled={working}>
                {previewOn ? <EyeOff /> : <Eye />}
                {previewOn ? "Matikan pratinjau" : "Pratinjau"}
              </Button>
              <Button variant="outline" size="sm" onClick={discard} disabled={working} className="text-destructive hover:text-destructive">
                <Trash2 />
                Buang draf
              </Button>
              <Button size="sm" onClick={publish} disabled={working}>
                {working ? <LoaderCircle className="animate-spin" /> : <Check />}
                Publikasikan
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[13rem_1fr]">
        <nav className="flex gap-1 overflow-x-auto lg:sticky lg:top-20 lg:flex-col" aria-label="Bagian halaman">
          {page.sections.map((item, index) => (
            <button
              key={`${item.path}-${item.title}`}
              type="button"
              onClick={() => setActive(index)}
              aria-current={index === active}
              className={cn(
                "rounded-lg px-3 py-2 text-left text-sm font-medium whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground",
                index === active && "bg-muted text-foreground",
              )}
            >
              {item.title}
            </button>
          ))}
        </nav>

        <Card>
          <CardHeader>
            <CardTitle>{section.title}</CardTitle>
            {section.description && <CardDescription>{section.description}</CardDescription>}
          </CardHeader>
          <CardContent>
            <FieldGrid
              key={active}
              fields={section.fields}
              values={section.path ? ((doc[section.path] as Doc) ?? {}) : doc}
              onChange={(name, value) => setField(section.path, name, value)}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
