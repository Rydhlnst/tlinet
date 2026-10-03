import type { Metadata } from "next";
import { CoverageExplorer } from "@/components/site/coverage-explorer";
import { CtaBand } from "@/components/site/cta-band";
import { LeadForm } from "@/components/site/lead-form";
import { PageHero, SectionHeading } from "@/components/site/ui";
import { getContent, getCoverageAreas } from "@/lib/data";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const { hero } = await getContent("coverage");
  return pageMetadata({ title: hero.title, description: hero.description, path: "/area-jangkauan" });
}

export default async function CoveragePage() {
  const [settings, coverage, areas] = await Promise.all([getContent("settings"), getContent("coverage"), getCoverageAreas()]);

  return (
    <>
      <PageHero {...coverage.hero} />

      <section className="container-page relative z-10 -mt-10 pb-20 sm:pb-24">
        <CoverageExplorer areas={areas} content={coverage.map} />
      </section>

      <section className="border-y bg-muted/40">
        <div className="container-page grid gap-10 py-20 sm:py-24 lg:grid-cols-[1fr_1.25fr] lg:gap-16">
          <SectionHeading {...coverage.form} align="left" />
          <div className="rounded-3xl border bg-card p-6 shadow-xl shadow-primary/5 sm:p-8">
            <LeadForm
              type="coverage"
              brandName={settings.brandName}
              whatsappNumber={settings.whatsappNumber}
              submitLabel={coverage.form.submitLabel}
              cities={coverage.form.cities}
              needs={coverage.form.needs}
            />
          </div>
        </div>
      </section>

      <CtaBand settings={settings} />
    </>
  );
}
