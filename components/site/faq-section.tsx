import { ArrowRight, FileText, Headset, Settings } from "lucide-react";
import type { HomeContent } from "@/lib/content/types";
import type { Faq } from "@/lib/data";
import { SectionBackdrop } from "./decor";
import { FaqList } from "./faq-list";
import { LinkButton, SectionHeading, SmartLink } from "./ui";

/** Ilustrasi sisi kanan FAQ: balon percakapan dan ikon mengambang di atas lengkung biru. */
function ChatArt() {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-sm" aria-hidden="true">
      <span className="absolute inset-[8%] rounded-full border-2 border-primary/15" />
      <span className="absolute inset-[20%] rounded-full bg-gradient-to-br from-brand-soft to-white ring-1 ring-primary/10" />
      {/* balon biru di belakang */}
      <span className="absolute top-[26%] left-[40%] h-[26%] w-[42%] rounded-3xl rounded-br-md bg-[linear-gradient(150deg,#7fb0ff,#2f62ea)] shadow-xl shadow-primary/30" />
      {/* balon utama dengan tanda tanya */}
      <span className="absolute top-[18%] left-[14%] flex h-[30%] w-[44%] items-center justify-center rounded-3xl rounded-bl-md bg-white text-6xl leading-none font-extrabold text-primary shadow-xl shadow-primary/20 ring-1 ring-primary/10">
        ?
      </span>
      {/* balon balasan */}
      <span className="absolute top-[56%] left-[24%] flex h-[17%] w-[34%] flex-col justify-center gap-2 rounded-2xl rounded-tl-md bg-white px-5 shadow-lg shadow-primary/15 ring-1 ring-primary/10">
        <span className="h-1.5 w-full rounded-full bg-primary/25" />
        <span className="h-1.5 w-2/3 rounded-full bg-primary/15" />
      </span>
      <span className="absolute top-[10%] right-[10%] flex size-12 items-center justify-center rounded-2xl bg-white text-primary shadow-lg shadow-primary/15 ring-1 ring-primary/10">
        <Settings className="size-5" />
      </span>
      <span className="absolute top-[40%] right-0 flex size-13 items-center justify-center rounded-2xl bg-white text-primary shadow-lg shadow-primary/15 ring-1 ring-primary/10">
        <FileText className="size-5.5" />
      </span>
      <span className="absolute bottom-[14%] left-[12%] size-3 rounded-full bg-primary/40" />
      <span className="absolute right-[22%] bottom-[20%] size-2 rounded-full bg-sky-400" />
    </div>
  );
}

type Props = { content: HomeContent["faq"]; faqs: Faq[]; helpHref: string };

/** Bagian FAQ beranda: daftar pertanyaan di kiri, ilustrasi dan kartu bantuan di kanan. */
export function FaqSection({ content, faqs, helpHref }: Props) {
  return (
    <section className="relative overflow-hidden">
      <SectionBackdrop flip />
      <div className="container-page relative py-20 sm:py-24">
        <SectionHeading eyebrow={content.eyebrow} title={content.title} titleAccent={content.titleAccent} description={content.description} />

        <div className="mt-14 grid items-start gap-10 lg:grid-cols-[1.7fr_1fr] lg:gap-12">
          <div className="flex flex-col items-center gap-8">
            <div className="w-full">
              <FaqList faqs={faqs} />
            </div>
            {content.ctaLabel && (
              <LinkButton href={content.ctaHref || "/bantuan"} variant="outline" className="border-primary/30 px-7 text-primary">
                {content.ctaLabel}
                <ArrowRight />
              </LinkButton>
            )}
          </div>

          <aside className="flex flex-col gap-6 lg:sticky lg:top-28">
            <ChatArt />
            {content.helpTitle && (
              <SmartLink
                href={helpHref}
                className="group flex items-center gap-4 rounded-3xl bg-white p-5 shadow-xl shadow-primary/10 ring-1 ring-border transition-transform hover:-translate-y-0.5"
              >
                <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-brand-soft text-primary">
                  <Headset className="size-6" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-bold">{content.helpTitle}</span>
                  <span className="mt-0.5 block text-sm leading-relaxed text-muted-foreground">{content.helpDescription}</span>
                </span>
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-soft text-primary transition-colors group-hover:bg-primary group-hover:text-white">
                  <ArrowRight className="size-4.5" />
                </span>
              </SmartLink>
            )}
          </aside>
        </div>
      </div>
    </section>
  );
}
