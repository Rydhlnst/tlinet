import type { Metadata } from "next";
import { LeadForm } from "@/components/site/lead-form";
import { PageHero } from "@/components/site/ui";
import { getContent, getPackages } from "@/lib/data";

export async function generateMetadata(): Promise<Metadata> {
  const { hero } = await getContent("register");
  return { title: hero.title, description: hero.description };
}

export default async function RegisterPage({ searchParams }: PageProps<"/formulir-registrasi">) {
  const [settings, register, packages, query] = await Promise.all([getContent("settings"), getContent("register"), getPackages(), searchParams]);
  const packageNames = packages.map((item) => item.name);
  const requested = typeof query.paket === "string" ? query.paket : "";

  return (
    <>
      <PageHero {...register.hero} />
      <section className="container-page relative z-10 -mt-10 max-w-2xl pb-20 sm:pb-24">
        <div className="rounded-3xl border bg-card p-6 shadow-xl shadow-primary/5 sm:p-9">
          <h2 className="mb-6 text-xl font-semibold">{register.form.title}</h2>
          <LeadForm
            type="registration"
            brandName={settings.brandName}
            whatsappNumber={settings.whatsappNumber}
            submitLabel={register.form.submitLabel}
            packages={packageNames}
            sources={register.form.sources}
            defaultPackage={packageNames.includes(requested) ? requested : ""}
          />
          {register.form.note && <p className="mt-5 text-center text-sm leading-relaxed text-muted-foreground">{register.form.note}</p>}
        </div>
        {settings.email && (
          <p className="mt-6 text-center text-sm text-muted-foreground">
            {register.form.emailNote}{" "}
            <a href={`mailto:${settings.email}`} className="font-medium text-brand-ink underline-offset-4 hover:underline">
              {settings.email}
            </a>
          </p>
        )}
      </section>
    </>
  );
}
