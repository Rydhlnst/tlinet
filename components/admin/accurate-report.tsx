import { CircleAlert } from "lucide-react";
import type { AccountBalance } from "@/lib/accurate";
import { formatRupiah } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Tipe akun Accurate per kelompok laporan. Saldo dipakai apa adanya, seperti yang dikembalikan Accurate. */
const groups = {
  assets: ["CASH_BANK", "ACCOUNT_RECEIVABLE", "INVENTORY", "OTHER_CURRENT_ASSET", "FIXED_ASSET", "ACCUMULATED_DEPRECIATION", "OTHER_ASSET"],
  liabilities: ["ACCOUNT_PAYABLE", "OTHER_CURRENT_LIABILITY", "LONG_TERM_LIABILITY"],
  equity: ["EQUITY"],
  income: ["REVENUE", "OTHER_INCOME"],
  expenses: ["COGS", "EXPENSE", "OTHER_EXPENSE"],
};

type Section = { typeName: string; accounts: AccountBalance[]; total: number };

const sum = (accounts: AccountBalance[]) => accounts.reduce((total, account) => total + account.balance, 0);

/** Akun satu kelompok, dipecah per tipe; akun bersaldo nol tidak ditampilkan tetapi tetap dihitung. */
function sectionsOf(accounts: AccountBalance[], types: string[]): Section[] {
  return types
    .map((type) => accounts.filter((account) => account.type === type))
    .filter((members) => members.length > 0)
    .map((members) => ({ typeName: members[0].typeName, accounts: members.filter((account) => account.balance !== 0), total: sum(members) }));
}

function Stat({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <div className="rounded-xl border bg-card p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">{formatRupiah(value)}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Row({ label, value, strong, muted }: { label: string; value: number; strong?: boolean; muted?: boolean }) {
  return (
    <div className={cn("flex items-baseline justify-between gap-4 px-5 py-2 text-sm", strong && "border-t bg-muted/40 font-semibold", muted && "text-muted-foreground")}>
      <span className="min-w-0 break-words">{label}</span>
      <span className="shrink-0 tabular-nums">{formatRupiah(value)}</span>
    </div>
  );
}

function Statement({ title, parts, total }: { title: string; parts: { heading: string; sections: Section[]; extra?: { label: string; value: number } }[]; total: { label: string; value: number } }) {
  return (
    <section className="overflow-hidden rounded-xl border bg-card">
      <h2 className="border-b px-5 py-3.5 text-base font-semibold">{title}</h2>
      {parts.map((part) => (
        <div key={part.heading} className="border-b last:border-b-0">
          <p className="px-5 pt-4 pb-1 text-xs font-semibold tracking-wider text-muted-foreground uppercase">{part.heading}</p>
          {part.sections.map((section) => (
            <div key={section.typeName} className="pb-1">
              <Row label={section.typeName} value={section.total} />
              {section.accounts.map((account) => (
                <div key={account.no} className="pl-4">
                  <Row label={`${account.no} · ${account.name}`} value={account.balance} muted />
                </div>
              ))}
            </div>
          ))}
          {part.extra && <Row label={part.extra.label} value={part.extra.value} />}
          <Row label={`Total ${part.heading}`} value={sum(part.sections.flatMap((section) => section.accounts)) + (part.extra?.value ?? 0)} strong />
        </div>
      ))}
      <Row label={total.label} value={total.value} strong />
    </section>
  );
}

/** Ringkasan neraca dan laba rugi dari saldo akun rincian saat ini; bukan laporan per periode. */
export function AccurateReport({ accounts }: { accounts: AccountBalance[] }) {
  const pick = (types: string[]) => sum(accounts.filter((account) => types.includes(account.type)));
  const assets = pick(groups.assets);
  const liabilities = pick(groups.liabilities);
  const equity = pick(groups.equity);
  const income = pick(groups.income);
  const expenses = pick(groups.expenses);
  const profit = income - expenses;
  const known = Object.values(groups).flat();
  const ungrouped = [...new Set(accounts.filter((account) => !known.includes(account.type) && account.balance !== 0).map((account) => account.typeName))];
  const balanced = Math.abs(assets - (liabilities + equity + profit)) < 1;

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Total Aset" value={assets} />
        <Stat label="Total Liabilitas" value={liabilities} />
        <Stat label="Ekuitas" value={equity + profit} hint="Modal ditambah laba berjalan" />
        <Stat label="Laba Bersih" value={profit} hint="Pendapatan dikurangi beban" />
      </div>

      {(!balanced || ungrouped.length > 0) && (
        <p className="flex gap-3 rounded-xl border bg-card p-4 text-sm leading-relaxed text-muted-foreground">
          <CircleAlert className="mt-0.5 size-4 shrink-0 text-amber-600" />
          <span>
            {!balanced && "Total aset tidak sama dengan liabilitas ditambah ekuitas, jadi ringkasan ini belum lengkap. "}
            {ungrouped.length > 0 && `Tipe akun yang belum dikelompokkan: ${ungrouped.join(", ")}. `}
            Gunakan Laporan Keuangan di Accurate sebagai acuan.
          </span>
        </p>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <Statement
          title="Neraca"
          parts={[
            { heading: "Aset", sections: sectionsOf(accounts, groups.assets) },
            { heading: "Liabilitas", sections: sectionsOf(accounts, groups.liabilities) },
            { heading: "Ekuitas", sections: sectionsOf(accounts, groups.equity), extra: { label: "Laba berjalan", value: profit } },
          ]}
          total={{ label: "Total Liabilitas & Ekuitas", value: liabilities + equity + profit }}
        />
        <Statement
          title="Laba Rugi"
          parts={[
            { heading: "Pendapatan", sections: sectionsOf(accounts, groups.income) },
            { heading: "Beban", sections: sectionsOf(accounts, groups.expenses) },
          ]}
          total={{ label: "Laba Bersih", value: profit }}
        />
      </div>

      <p className="text-xs leading-relaxed text-muted-foreground">
        Dihitung dari saldo akun saat ini di Accurate; akun bersaldo nol tidak ditampilkan. Ini bukan laporan per periode. Untuk laporan per bulan, arus kas, dan laporan resmi, buka Laporan Keuangan di Accurate.
      </p>
    </>
  );
}
