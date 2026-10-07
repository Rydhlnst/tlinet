import { saveAccurate } from "@/lib/accurate";
import type { AccurateForm, FormField } from "@/lib/accurate-forms";
import type { SaveResult } from "@/lib/cms/store";

const maxLines = 50;

/** "2026-10-07" → "07/10/2026", format tanggal yang diminta Accurate. */
const accurateDate = (iso: string) => iso.split("-").reverse().join("/");

/** Memeriksa satu kelompok field dan menaruh nilainya di `params` dengan awalan nama (kosong untuk kepala form). */
function collect(fields: FormField[], source: Record<string, unknown>, prefix: string, label: string, params: URLSearchParams, errors: string[]) {
  const numbers: Record<string, number> = {};
  for (const field of fields) {
    const raw = String(source[field.name] ?? "").trim();
    const name = `${label}${field.label}`;
    if (!raw) {
      if (field.required) errors.push(`${name} wajib diisi.`);
      continue;
    }
    if (field.type === "number") {
      const value = Number(raw.replace(",", "."));
      if (!Number.isFinite(value) || value < 0 || (field.required && value === 0)) {
        errors.push(`${name} harus berupa angka lebih dari nol.`);
        continue;
      }
      numbers[field.name] = value;
      params.set(prefix + field.name, String(value));
    } else if (field.type === "date") {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) errors.push(`${name} harus berupa tanggal.`);
      else params.set(prefix + field.name, accurateDate(raw));
    } else if (field.type === "select") {
      if (!field.options.some((option) => option.value === raw)) errors.push(`${name} tidak valid.`);
      else params.set(prefix + field.name, raw);
    } else {
      params.set(prefix + field.name, raw.slice(0, field.type === "textarea" ? 2000 : 300));
    }
  }
  return numbers;
}

/** Memvalidasi isian sesuai definisi form, lalu mengirimnya ke save.do Accurate. */
export async function saveAccurateForm(form: AccurateForm, input: unknown): Promise<SaveResult> {
  const source = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const params = new URLSearchParams();
  const errors: string[] = [];
  collect(form.fields, source, "", "", params, errors);

  if (form.lines) {
    const lines = (Array.isArray(source[form.lines.name]) ? (source[form.lines.name] as Record<string, unknown>[]) : []).slice(0, maxLines);
    if (!lines.length) errors.push(`${form.lines.label}: tambahkan minimal satu ${form.lines.itemLabel}.`);
    let total = 0;
    const sides = { DEBIT: 0, CREDIT: 0 };
    lines.forEach((line, index) => {
      const numbers = collect(form.lines!.fields, line ?? {}, `${form.lines!.name}[${index}].`, `${form.lines!.label} #${index + 1} › `, params, errors);
      if (form.total) total += numbers[form.total.lineField] ?? 0;
      if (form.balanced && (line?.amountType === "DEBIT" || line?.amountType === "CREDIT")) sides[line.amountType] += numbers.amount ?? 0;
    });
    if (form.total) params.set(form.total.param, String(total));
    if (form.balanced && Math.abs(sides.DEBIT - sides.CREDIT) >= 0.01) errors.push("Total debit harus sama dengan total kredit.");
  }
  if (errors.length) return { ok: false, message: errors[0] };

  const today = accurateDate(new Date(Date.now() + 8 * 3600_000).toISOString().slice(0, 10));
  for (const name of form.todayParams ?? []) params.set(name, today);

  try {
    const message = await saveAccurate(form.path, params);
    return { ok: true, message: message || `${form.label} tersimpan di Accurate.` };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Accurate menolak penyimpanan." };
  }
}
