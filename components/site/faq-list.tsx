"use client";

import { useState } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import type { Faq } from "@/lib/data";
import { Icon } from "@/lib/icons";
import { cn } from "@/lib/utils";

/** Ikon pertanyaan bergilir menurut urutan, sehingga pertanyaan yang berdekatan tidak berikon sama. */
const rotation = ["file", "wifi", "map-pin", "wrench", "gift", "wallet", "activity"];

/** Daftar FAQ. Bila `categories` diberikan, tampil pil filter kategori di atasnya. */
export function FaqList({ faqs, categories, allLabel }: { faqs: Faq[]; categories?: string[]; allLabel?: string }) {
  const [category, setCategory] = useState("");
  const visible = category ? faqs.filter((faq) => faq.category === category) : faqs;

  return (
    <div className="flex flex-col gap-8">
      {categories && categories.length > 0 && (
        <div className="flex flex-wrap justify-center gap-2">
          {["", ...categories].map((item) => (
            <button
              key={item || "all"}
              type="button"
              aria-pressed={category === item}
              onClick={() => setCategory(item)}
              className={cn(
                "rounded-full border px-4 py-2 text-sm font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                category === item ? "border-primary bg-primary text-white" : "bg-background text-muted-foreground hover:text-foreground",
              )}
            >
              {item || allLabel || "Semua"}
            </button>
          ))}
        </div>
      )}

      {visible.length ? (
        <Accordion type="single" collapsible defaultValue={visible[0].id} className="flex flex-col gap-3.5">
          {visible.map((faq, index) => (
            <AccordionItem
              key={faq.id}
              value={faq.id}
              className="rounded-2xl border bg-card px-4 shadow-sm shadow-primary/5 transition-colors last:border-b data-[state=open]:border-primary/40 data-[state=open]:bg-brand-soft/50 sm:px-5"
            >
              <AccordionTrigger className="items-center gap-4 py-4 text-left text-base font-semibold hover:no-underline **:data-[slot=accordion-trigger-icon]:size-9 **:data-[slot=accordion-trigger-icon]:rounded-full **:data-[slot=accordion-trigger-icon]:bg-muted **:data-[slot=accordion-trigger-icon]:p-2.5 **:data-[slot=accordion-trigger-icon]:text-foreground">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-brand-soft text-primary ring-1 ring-primary/10">
                  <Icon name={rotation[index % rotation.length]} className="size-5" />
                </span>
                <span className="flex-1">{faq.question}</span>
              </AccordionTrigger>
              <AccordionContent className="pr-12 pb-5 pl-15 text-[15px] leading-relaxed text-muted-foreground">{faq.answer}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      ) : (
        <p className="rounded-2xl border border-dashed py-10 text-center text-sm text-muted-foreground">Belum ada pertanyaan di kategori ini.</p>
      )}
    </div>
  );
}
