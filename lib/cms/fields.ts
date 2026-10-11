export type Option = { value: string; label: string };

type FieldBase = {
  name: string;
  label: string;
  help?: string;
  required?: boolean;
  placeholder?: string;
  /** Lebar di grid form dua kolom. Bawaan: penuh. */
  half?: boolean;
};

export type Field =
  | (FieldBase & { type: "text" | "email" | "url" | "image" | "icon" | "date" | "month" | "switch" })
  | (FieldBase & { type: "textarea"; rows?: number })
  /** `min`: nilai terkecil yang diterima, mis. 1 untuk nominal yang tidak boleh nol atau negatif. */
  | (FieldBase & { type: "number"; integer?: boolean; min?: number })
  /** `optionsFrom` diisi halaman admin dari data lain (mis. kategori paket). */
  | (FieldBase & { type: "select"; options?: Option[]; optionsFrom?: string })
  | (FieldBase & { type: "strings"; itemLabel: string })
  /** Peta pemilih koordinat: tidak menyimpan nilai sendiri, melainkan mengisi field latitude/longitude. */
  | (FieldBase & { type: "map"; latField: string; lngField: string; radiusField?: string })
  | (FieldBase & { type: "list"; itemLabel: string; titleField: string; fields: Field[] });

export type Section = {
  /** Kunci objek di dalam dokumen; kosong berarti field berada di akar dokumen. */
  path: string;
  title: string;
  description?: string;
  fields: Field[];
};

const limits = { text: 300, textarea: 20000, list: 60 };

/** Tautan yang boleh disimpan: relatif, jangkar, http(s), mailto, tel, atau kata kunci "whatsapp". */
export function isSafeHref(value: string) {
  return value === "" || value === "whatsapp" || /^(\/|#|https?:\/\/|mailto:|tel:)/i.test(value);
}

function sanitizeValue(field: Field, value: unknown, errors: string[], label: string): unknown {
  switch (field.type) {
    case "switch":
      return value === true;
    case "number": {
      if (value == null || value === "") {
        if (field.required) errors.push(`${label} wajib diisi.`);
        return 0;
      }
      const number = typeof value === "number" ? value : Number(String(value ?? "").replace(",", "."));
      if (!Number.isFinite(number)) {
        errors.push(`${label} harus berupa angka.`);
        return 0;
      }
      if (field.min != null && number < field.min) {
        errors.push(field.min > 0 ? `${label} harus lebih dari nol.` : `${label} tidak boleh kurang dari ${field.min}.`);
        return 0;
      }
      return field.integer ? Math.round(number) : number;
    }
    case "strings":
      return (Array.isArray(value) ? value : [])
        .map((item) => String(item ?? "").trim().slice(0, limits.text))
        .filter(Boolean)
        .slice(0, limits.list);
    case "list":
      return (Array.isArray(value) ? value : [])
        .slice(0, limits.list)
        .map((item, index) => sanitizeFields(field.fields, item, errors, `${label} #${index + 1} › `));
    default: {
      const text = String(value ?? "").trim().slice(0, field.type === "textarea" ? limits.textarea : limits.text);
      if (field.required && !text) errors.push(`${label} wajib diisi.`);
      if ((field.type === "url" || field.type === "image") && !isSafeHref(text)) {
        errors.push(`${label} harus berupa tautan yang valid (diawali /, #, atau https://).`);
        return "";
      }
      if (field.type === "email" && text && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) {
        errors.push(`${label} bukan alamat email yang valid.`);
        return "";
      }
      if (field.type === "date" && text && !/^\d{4}-\d{2}-\d{2}$/.test(text)) {
        errors.push(`${label} harus berupa tanggal.`);
        return "";
      }
      if (field.type === "month" && text && !/^\d{4}-\d{2}$/.test(text)) {
        errors.push(`${label} harus berupa bulan dan tahun.`);
        return "";
      }
      if (field.type === "select" && field.options && text && !field.options.some((option) => option.value === text)) {
        errors.push(`${label} tidak valid.`);
        return field.options[0]?.value ?? "";
      }
      return text;
    }
  }
}

/** Membentuk ulang input sesuai definisi field: field asing dibuang, tipe dipaksa, pesan galat dikumpulkan. */
export function sanitizeFields(fields: Field[], input: unknown, errors: string[], prefix = ""): Record<string, unknown> {
  const source = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const output: Record<string, unknown> = {};
  for (const field of fields) {
    if (field.type === "map") continue;
    output[field.name] = sanitizeValue(field, source[field.name], errors, prefix + field.label);
  }
  return output;
}

export function sanitizeDocument(sections: Section[], input: unknown, errors: string[]) {
  const source = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const output: Record<string, unknown> = {};
  for (const section of sections) {
    if (!section.path) {
      Object.assign(output, sanitizeFields(section.fields, source, errors));
    } else {
      const existing = (output[section.path] as Record<string, unknown> | undefined) ?? {};
      output[section.path] = { ...existing, ...sanitizeFields(section.fields, source[section.path], errors, `${section.title} › `) };
    }
  }
  return output;
}

export function emptyItem(fields: Field[]): Record<string, unknown> {
  const item: Record<string, unknown> = {};
  for (const field of fields) {
    if (field.type === "map") continue;
    item[field.name] =
      field.type === "switch" ? false : field.type === "number" ? 0 : field.type === "strings" || field.type === "list" ? [] : "";
  }
  return item;
}
