"use client";

import { ArrowDown, ArrowUp, ChevronDown, Plus, Trash2 } from "lucide-react";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { emptyItem, type Field, type Option } from "@/lib/cms/fields";
import { Icon, icons } from "@/lib/icons";
import { cn } from "@/lib/utils";
import { ImageField } from "./image-field";
import { MapPicker } from "./map-picker";

export type DynamicOptions = Record<string, Option[]>;
type Values = Record<string, unknown>;

const iconOptions = Object.entries(icons).map(([value, { label }]) => ({ value, label }));

function move<T>(items: T[], from: number, to: number) {
  const next = [...items];
  next.splice(to, 0, next.splice(from, 1)[0]);
  return next;
}

function RowActions({ index, count, onMove, onRemove }: { index: number; count: number; onMove: (to: number) => void; onRemove: () => void }) {
  return (
    <div className="flex shrink-0 items-center">
      <Button type="button" variant="ghost" size="icon-sm" disabled={index === 0} onClick={() => onMove(index - 1)} aria-label="Naikkan">
        <ArrowUp />
      </Button>
      <Button type="button" variant="ghost" size="icon-sm" disabled={index === count - 1} onClick={() => onMove(index + 1)} aria-label="Turunkan">
        <ArrowDown />
      </Button>
      <Button type="button" variant="ghost" size="icon-sm" className="text-destructive hover:text-destructive" onClick={onRemove} aria-label="Hapus">
        <Trash2 />
      </Button>
    </div>
  );
}

function StringsControl({ field, value, onChange }: { field: Extract<Field, { type: "strings" }>; value: string[]; onChange: (value: string[]) => void }) {
  return (
    <div className="flex flex-col gap-2">
      {value.map((item, index) => (
        <div key={index} className="flex items-center gap-1">
          <Input
            value={item}
            aria-label={`${field.itemLabel} ${index + 1}`}
            onChange={(event) => onChange(value.map((current, position) => (position === index ? event.target.value : current)))}
          />
          <RowActions
            index={index}
            count={value.length}
            onMove={(to) => onChange(move(value, index, to))}
            onRemove={() => onChange(value.filter((_, position) => position !== index))}
          />
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" className="w-fit" onClick={() => onChange([...value, ""])}>
        <Plus />
        Tambah {field.itemLabel.toLowerCase()}
      </Button>
    </div>
  );
}

function ListControl({
  field,
  value,
  onChange,
  options,
}: {
  field: Extract<Field, { type: "list" }>;
  value: Values[];
  onChange: (value: Values[]) => void;
  options?: DynamicOptions;
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="flex flex-col gap-2">
      {value.map((item, index) => {
        const open = openIndex === index;
        const title = String(item[field.titleField] ?? "").trim() || `${field.itemLabel} ${index + 1}`;
        return (
          <div key={index} className={cn("rounded-lg border bg-background", open && "ring-1 ring-ring/40")}>
            <div className="flex items-center gap-1 py-1 pr-1 pl-3">
              <button
                type="button"
                aria-expanded={open}
                onClick={() => setOpenIndex(open ? null : index)}
                className="flex min-w-0 flex-1 items-center gap-2 py-1.5 text-left text-sm font-medium outline-none"
              >
                <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
                <span className="truncate">{title}</span>
              </button>
              <RowActions
                index={index}
                count={value.length}
                onMove={(to) => {
                  onChange(move(value, index, to));
                  setOpenIndex(open ? to : null);
                }}
                onRemove={() => {
                  onChange(value.filter((_, position) => position !== index));
                  setOpenIndex(null);
                }}
              />
            </div>
            {open && (
              <div className="border-t p-3">
                <FieldGrid
                  fields={field.fields}
                  values={item}
                  options={options}
                  onChange={(name, next) => onChange(value.map((current, position) => (position === index ? { ...current, [name]: next } : current)))}
                />
              </div>
            )}
          </div>
        );
      })}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-fit"
        onClick={() => {
          onChange([...value, emptyItem(field.fields)]);
          setOpenIndex(value.length);
        }}
      >
        <Plus />
        Tambah {field.itemLabel.toLowerCase()}
      </Button>
    </div>
  );
}

function Control({ field, value, onChange, options, id }: { field: Field; value: unknown; onChange: (value: unknown) => void; options?: DynamicOptions; id: string }) {
  const text = value == null ? "" : String(value);

  switch (field.type) {
    case "textarea":
      return <Textarea id={id} rows={field.rows ?? 3} value={text} placeholder={field.placeholder} onChange={(event) => onChange(event.target.value)} />;
    case "number":
      return <Input id={id} type="number" step="any" min={field.min} value={text} onChange={(event) => onChange(event.target.value)} />;
    case "email":
      return <Input id={id} type="email" value={text} placeholder={field.placeholder} onChange={(event) => onChange(event.target.value)} />;
    case "date":
      return <Input id={id} type="date" value={text} onChange={(event) => onChange(event.target.value)} />;
    case "month":
      return <Input id={id} type="month" value={text} onChange={(event) => onChange(event.target.value)} />;
    case "switch":
      return <Switch id={id} checked={value === true} onCheckedChange={onChange} />;
    case "image":
      return <ImageField id={id} value={text} onChange={onChange} allowPdf={field.allowPdf} jpgPngOnly={field.jpgPngOnly} />;
    case "strings":
      return <StringsControl field={field} value={Array.isArray(value) ? (value as string[]) : []} onChange={onChange} />;
    case "list":
      return <ListControl field={field} value={Array.isArray(value) ? (value as Values[]) : []} onChange={onChange} options={options} />;
    case "icon":
    case "select": {
      const base = field.type === "icon" ? iconOptions : field.type === "select" ? (field.options ?? options?.[field.optionsFrom ?? ""] ?? []) : [];
      // Nilai lama yang sudah tidak ada di pilihan tetap ditampilkan agar tidak hilang diam-diam.
      const choices = text && !base.some((option) => option.value === text) ? [...base, { value: text, label: text }] : base;
      return (
        <Select value={text || undefined} onValueChange={onChange}>
          <SelectTrigger id={id} className="w-full">
            <SelectValue placeholder="Pilih…" />
          </SelectTrigger>
          <SelectContent>
            {choices.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {field.type === "icon" && <Icon name={option.value} className="text-muted-foreground" />}
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }
    default:
      return <Input id={id} value={text} placeholder={field.placeholder} onChange={(event) => onChange(event.target.value)} />;
  }
}

function FieldRow({ field, value, onChange, options }: { field: Field; value: unknown; onChange: (value: unknown) => void; options?: DynamicOptions }) {
  const id = useId();
  const inline = field.type === "switch";
  return (
    <div className={cn("flex min-w-0 flex-col gap-2", !field.half && "sm:col-span-2", inline && "flex-row items-center justify-between rounded-lg border px-3 py-2.5")}>
      <div className="flex flex-col gap-1">
        <Label htmlFor={id}>
          {field.label}
          {field.required && <span className="text-destructive">*</span>}
        </Label>
        {inline && field.help && <p className="text-xs text-muted-foreground">{field.help}</p>}
      </div>
      <Control field={field} value={value} onChange={onChange} options={options} id={id} />
      {!inline && field.help && <p className="text-xs leading-relaxed text-muted-foreground">{field.help}</p>}
    </div>
  );
}

/** Merender daftar field dari definisi CMS dalam grid dua kolom. */
export function FieldGrid({
  fields,
  values,
  onChange,
  options,
}: {
  fields: Field[];
  values: Values;
  onChange: (name: string, value: unknown) => void;
  options?: DynamicOptions;
}) {
  return (
    <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
      {fields.map((field) =>
        field.type === "map" ? (
          <div key={field.name} className="flex flex-col gap-2 sm:col-span-2">
            <Label>{field.label}</Label>
            <MapPicker
              lat={values[field.latField]}
              lng={values[field.lngField]}
              radiusKm={field.radiusField ? values[field.radiusField] : 0}
              onPick={(lat, lng) => {
                onChange(field.latField, lat);
                onChange(field.lngField, lng);
              }}
            />
            {field.help && <p className="text-xs leading-relaxed text-muted-foreground">{field.help}</p>}
          </div>
        ) : (
          <FieldRow key={field.name} field={field} value={values[field.name]} options={options} onChange={(value) => onChange(field.name, value)} />
        ),
      )}
    </div>
  );
}
