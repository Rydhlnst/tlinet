"use client";

import { LoaderCircle, Plus, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState, useTransition } from "react";
import { toast } from "sonner";
import { saveAccurateAction, searchAccurateAction } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { getAccurateForm, initialValues, type FormField, type FormLine, type LookupKind, type LookupOption } from "@/lib/accurate-forms";
import { formatRupiah } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Tanggal hari ini menurut jam perangkat, "YYYY-MM-DD". */
function today() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

/** Field pilihan yang mencari langsung ke Accurate saat diketik. */
function LookupInput({ id, kind, scope, picked, onPick }: { id: string; kind: LookupKind; scope: string; picked: LookupOption | undefined; onPick: (option: LookupOption | null) => void }) {
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<LookupOption[] | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    let active = true;
    const timer = setTimeout(async () => {
      const result = await searchAccurateAction(kind, query, scope);
      if (active) setOptions(result);
    }, 250);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [open, query, kind, scope]);

  if (picked && !open) {
    return (
      <div className="flex h-9 items-center gap-2 rounded-lg border bg-background pr-1 pl-3 text-sm">
        <span className="min-w-0 flex-1 truncate">
          {picked.label}
          {picked.hint && <span className="ml-2 text-xs text-muted-foreground">{picked.hint}</span>}
        </span>
        <Button type="button" variant="ghost" size="icon-sm" onClick={() => onPick(null)} aria-label="Ganti pilihan">
          <X />
        </Button>
      </div>
    );
  }

  return (
    <div className="relative" onBlur={(event) => !event.currentTarget.contains(event.relatedTarget) && setOpen(false)}>
      <Input
        id={id}
        value={query}
        autoComplete="off"
        placeholder="Ketik untuk mencari…"
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          setOptions(null);
          setQuery(event.target.value);
        }}
      />
      {open && (
        <ul className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border bg-popover p-1 text-sm shadow-md">
          {options === null ? (
            <li className="px-2.5 py-2 text-muted-foreground">Mencari…</li>
          ) : options.length === 0 ? (
            <li className="px-2.5 py-2 text-muted-foreground">Tidak ditemukan.</li>
          ) : (
            options.map((option) => (
              <li key={option.value}>
                <button
                  type="button"
                  className="flex w-full flex-col items-start rounded-md px-2.5 py-1.5 text-left outline-none hover:bg-muted focus-visible:bg-muted"
                  onClick={() => {
                    onPick(option);
                    setOpen(false);
                    setQuery("");
                  }}
                >
                  <span>{option.label}</span>
                  {option.hint && <span className="text-xs text-muted-foreground">{option.hint}</span>}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

type Picks = Record<string, LookupOption>;

/** Merender satu kelompok field (kepala form atau satu baris). `scopeOf` memberi nilai field pembatas pencarian. */
function Fields({
  fields,
  values,
  picks,
  scopeOf,
  onChange,
  onPick,
}: {
  fields: FormField[];
  values: FormLine;
  picks: Picks;
  scopeOf: (name: string) => string;
  onChange: (name: string, value: unknown) => void;
  onPick: (name: string, option: LookupOption | null) => void;
}) {
  const base = useId();
  return (
    <div className="grid gap-x-4 gap-y-4 sm:grid-cols-2">
      {fields.map((field) => {
        const id = `${base}-${field.name}`;
        const value = String(values[field.name] ?? "");
        return (
          <div key={field.name} className={cn("flex min-w-0 flex-col gap-2", !field.half && "sm:col-span-2")}>
            <Label htmlFor={id}>
              {field.label}
              {field.required && <span className="text-destructive">*</span>}
            </Label>
            {field.type === "lookup" ? (
              <LookupInput id={id} kind={field.lookup} scope={field.scope ? scopeOf(field.scope) : ""} picked={picks[field.name]} onPick={(option) => onPick(field.name, option)} />
            ) : field.type === "select" ? (
              <Select value={value || undefined} onValueChange={(next) => onChange(field.name, next)}>
                <SelectTrigger id={id} className="w-full">
                  <SelectValue placeholder="Pilih…" />
                </SelectTrigger>
                <SelectContent>
                  {field.options.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : field.type === "textarea" ? (
              <Textarea id={id} rows={2} value={value} placeholder={field.placeholder} onChange={(event) => onChange(field.name, event.target.value)} />
            ) : (
              <Input
                id={id}
                type={field.type === "text" ? "text" : field.type}
                step={field.type === "number" ? "any" : undefined}
                min={field.type === "number" ? 0 : undefined}
                value={value}
                placeholder={field.placeholder}
                onChange={(event) => onChange(field.name, event.target.value)}
              />
            )}
            {field.help && <p className="text-xs leading-relaxed text-muted-foreground">{field.help}</p>}
          </div>
        );
      })}
    </div>
  );
}

type LineState = { key: number; values: FormLine; picks: Picks };

/** Tombol "Tambah …" beserta form sampingnya; menyimpan langsung ke Accurate lewat save.do. */
export function AccurateFormButton({ path }: { path: string }) {
  const form = getAccurateForm(path)!;
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<FormLine>({});
  const [picks, setPicks] = useState<Picks>({});
  const [lines, setLines] = useState<LineState[]>([]);
  const [pending, startTransition] = useTransition();

  const newLine = (key: number): LineState => ({ key, values: initialValues(form.lines?.fields ?? [], today()), picks: {} });
  const updateLine = (key: number, change: (line: LineState) => LineState) => setLines((current) => current.map((line) => (line.key === key ? change(line) : line)));

  function start() {
    setValues(initialValues(form.fields, today()));
    setPicks({});
    setLines(form.lines ? [newLine(0)] : []);
    setOpen(true);
  }

  /** Memilih hasil pencarian: simpan kodenya, dan isi field lain yang dibawa pilihan itu (mis. harga). */
  const applyPick = (state: { values: FormLine; picks: Picks }, name: string, option: LookupOption | null) => {
    const picksNext = { ...state.picks };
    if (option) picksNext[name] = option;
    else delete picksNext[name];
    return { values: { ...state.values, [name]: option?.value ?? "", ...option?.fill }, picks: picksNext };
  };

  function pickHeader(name: string, option: LookupOption | null) {
    const next = applyPick({ values, picks }, name, option);
    setValues(next.values);
    setPicks(next.picks);
    // Baris yang pencariannya dibatasi field ini (faktur milik pelanggan lama) tidak berlaku lagi.
    if (form.lines?.fields.some((field) => field.type === "lookup" && field.scope === name)) setLines([newLine(0)]);
  }

  function save() {
    startTransition(async () => {
      const result = await saveAccurateAction(form.path, form.lines ? { ...values, [form.lines.name]: lines.map((line) => line.values) } : values);
      if (result.ok) {
        toast.success(result.message);
        setOpen(false);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <>
      <Button onClick={start}>
        <Plus />
        Tambah {form.label}
      </Button>
      <Sheet open={open} onOpenChange={(next) => !next && !pending && setOpen(false)}>
        <SheetContent className="w-full gap-0 data-[side=right]:sm:max-w-xl">
          <SheetHeader className="border-b">
            <SheetTitle>Tambah {form.label}</SheetTitle>
            <SheetDescription>Data ini langsung tersimpan di pembukuan Accurate. Mengubah atau menghapusnya dilakukan di Accurate.</SheetDescription>
          </SheetHeader>
          <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-4">
            <Fields
              fields={form.fields}
              values={values}
              picks={picks}
              scopeOf={() => ""}
              onChange={(name, value) => setValues((current) => ({ ...current, [name]: value }))}
              onPick={pickHeader}
            />

            {form.lines && (
              <div className="flex flex-col gap-3">
                <p className="text-sm font-semibold">{form.lines.label}</p>
                {lines.map((line, index) => (
                  <div key={line.key} className="rounded-lg border p-3">
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                        {form.lines!.itemLabel} {index + 1}
                      </p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="text-destructive hover:text-destructive"
                        disabled={lines.length === 1}
                        onClick={() => setLines((current) => current.filter((item) => item.key !== line.key))}
                        aria-label={`Hapus ${form.lines!.itemLabel} ${index + 1}`}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                    <Fields
                      fields={form.lines!.fields}
                      values={line.values}
                      picks={line.picks}
                      scopeOf={(name) => String(values[name] ?? "")}
                      onChange={(name, value) => updateLine(line.key, (current) => ({ ...current, values: { ...current.values, [name]: value } }))}
                      onPick={(name, option) => updateLine(line.key, (current) => ({ ...current, ...applyPick(current, name, option) }))}
                    />
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" className="w-fit" onClick={() => setLines((current) => [...current, newLine(Math.max(...current.map((line) => line.key)) + 1)])}>
                  <Plus />
                  Tambah {form.lines.itemLabel}
                </Button>
                {form.summarize && (
                  <dl className="flex flex-col gap-1 rounded-lg bg-muted/60 px-3 py-2.5 text-sm">
                    {form.summarize(lines.map((line) => line.values)).map((item) => (
                      <div key={item.label} className="flex justify-between gap-4">
                        <dt className="text-muted-foreground">{item.label}</dt>
                        <dd className="font-semibold tabular-nums">{formatRupiah(item.value)}</dd>
                      </div>
                    ))}
                  </dl>
                )}
              </div>
            )}
          </div>
          <SheetFooter className="flex-row justify-end border-t">
            <Button variant="outline" size="lg" onClick={() => setOpen(false)} disabled={pending}>
              Batal
            </Button>
            <Button size="lg" onClick={save} disabled={pending}>
              {pending && <LoaderCircle className="animate-spin" />}
              Simpan ke Accurate
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}
