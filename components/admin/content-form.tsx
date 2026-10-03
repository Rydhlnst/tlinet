"use client";

import { ExternalLink, LoaderCircle, Save } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { saveContentAction } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getPageDef } from "@/lib/cms/pages";
import { cn } from "@/lib/utils";
import { FieldGrid } from "./field-control";

type Doc = Record<string, unknown>;

/** Editor satu dokumen konten (halaman atau pengaturan), dibentuk dari definisi di lib/cms/pages.ts. */
export function ContentForm({ pageKey, initial }: { pageKey: string; initial: Doc }) {
  const page = getPageDef(pageKey)!;
  const [doc, setDoc] = useState(initial);
  const [dirty, setDirty] = useState(false);
  const [active, setActive] = useState(0);
  const [saving, startSaving] = useTransition();
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
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{page.label}</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{page.description}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button asChild variant="outline" size="lg">
            <Link href={page.publicPath} target="_blank">
              <ExternalLink />
              Lihat halaman
            </Link>
          </Button>
          <Button size="lg" onClick={save} disabled={saving || !dirty}>
            {saving ? <LoaderCircle className="animate-spin" /> : <Save />}
            {dirty ? "Simpan perubahan" : "Tersimpan"}
          </Button>
        </div>
      </div>

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
