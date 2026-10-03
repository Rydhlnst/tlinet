"use client";

import { ChevronDown, LoaderCircle } from "lucide-react";
import { useState, type ComponentProps, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";
import { submitLeadAction, type LeadInput } from "@/app/actions";
import { normalizePhone, whatsappUrl } from "@/lib/format";
import { cn } from "@/lib/utils";
import { WhatsAppIcon } from "./whatsapp-float";
import { linkButtonClass } from "./ui";

const controlClass =
  "h-12 w-full rounded-2xl border bg-background px-4 text-sm outline-none transition-shadow placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30";

function Field({ label, required, children, className }: { label: string; required?: boolean; children: ReactNode; className?: string }) {
  return (
    <label className={cn("flex flex-col gap-2", className)}>
      <span className="text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">
        {label}
        {required && <span className="text-destructive"> *</span>}
      </span>
      {children}
    </label>
  );
}

function SelectField({ options, placeholder, ...props }: { options: string[]; placeholder?: string } & ComponentProps<"select">) {
  return (
    <span className="relative">
      <select className={cn(controlClass, "appearance-none pr-10")} {...props}>
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-4 size-4 -translate-y-1/2 text-muted-foreground" />
    </span>
  );
}

type Props = {
  type: LeadInput["type"];
  brandName: string;
  whatsappNumber: string;
  submitLabel: string;
  cities?: string[];
  needs?: string[];
  packages?: string[];
  sources?: string[];
  defaultPackage?: string;
};

/** Formulir pendaftaran / cek area: dicatat sebagai prospek, lalu pengunjung diarahkan ke WhatsApp. */
export function LeadForm({ type, brandName, whatsappNumber, submitLabel, cities, needs, packages, sources, defaultPackage = "" }: Props) {
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const value = (key: string) => String(form.get(key) ?? "").trim();
    const input: LeadInput = {
      type,
      name: value("name"),
      phone: value("phone"),
      city: value("city"),
      address: value("address"),
      need: value("need"),
      source: value("source"),
      packageName: value("packageName"),
      website: value("website"),
    };

    setPending(true);
    try {
      const result = await submitLeadAction(input);
      if (!result.ok) {
        toast.error(result.message);
        setPending(false);
        return;
      }
    } catch {
      // Pencatatan gagal tidak boleh menghalangi pengunjung menghubungi tim lewat WhatsApp.
    }

    const intro =
      type === "coverage"
        ? `Halo ${brandName}, saya ingin cek ketersediaan jaringan di lokasi saya.`
        : `Halo ${brandName}, saya ingin mendaftar layanan internet.`;
    const lines = [
      ["Nama", input.name],
      ["WhatsApp", `+${normalizePhone(input.phone)}`],
      ["Kota/Kabupaten", input.city],
      ["Alamat", input.address],
      ["Kebutuhan", input.need],
      ["Paket", input.packageName],
      ["Mengetahui dari", input.source],
    ]
      .filter(([, text]) => text)
      .map(([label, text]) => `${label}: ${text}`);
    window.location.assign(whatsappUrl(whatsappNumber, `${intro}\n\n${lines.join("\n")}`));
    setPending(false);
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-5 sm:grid-cols-2">
      <Field label="Nama lengkap" required>
        <input name="name" required minLength={2} maxLength={120} autoComplete="name" className={controlClass} />
      </Field>
      <Field label="Nomor WhatsApp" required>
        <span className="relative">
          <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-sm text-muted-foreground">+62</span>
          <input
            name="phone"
            required
            inputMode="tel"
            autoComplete="tel-national"
            pattern="[0-9 +\-]{8,20}"
            placeholder="812 3456 7890"
            className={cn(controlClass, "pl-13")}
          />
        </span>
      </Field>
      {cities && cities.length > 0 && (
        <Field label="Kota / Kabupaten" required>
          <SelectField name="city" required options={cities} />
        </Field>
      )}
      {needs && needs.length > 0 && (
        <Field label="Kebutuhan internet">
          <SelectField name="need" options={needs} />
        </Field>
      )}
      {packages && packages.length > 0 && (
        <Field label="Paket yang diminati" className="sm:col-span-2">
          <SelectField name="packageName" options={packages} placeholder="Belum menentukan" defaultValue={defaultPackage} />
        </Field>
      )}
      <Field label={type === "coverage" ? "Alamat pemasangan lengkap" : "Alamat instalasi"} required className="sm:col-span-2">
        <textarea
          name="address"
          required
          minLength={5}
          maxLength={500}
          rows={3}
          autoComplete="street-address"
          className={cn(controlClass, "h-auto resize-none py-3 leading-relaxed")}
        />
      </Field>
      {sources && sources.length > 0 && (
        <Field label="Bagaimana Anda mengetahui tentang kami?" required className="sm:col-span-2">
          <SelectField name="source" required options={sources} placeholder="Pilih salah satu" />
        </Field>
      )}

      <input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />

      <button type="submit" disabled={pending} className={linkButtonClass("brand", "h-12 disabled:opacity-70 sm:col-span-2")}>
        {pending ? <LoaderCircle className="animate-spin" /> : <WhatsAppIcon className="size-4" />}
        {submitLabel}
      </button>
    </form>
  );
}
