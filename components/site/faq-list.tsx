"use client";

import { useState } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import type { Faq } from "@/lib/data";
import { cn } from "@/lib/utils";

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
        <Accordion type="single" collapsible defaultValue={visible[0].id} className="flex flex-col gap-3">
          {visible.map((faq) => (
            <AccordionItem key={faq.id} value={faq.id} className="rounded-2xl border bg-card px-5 last:border-b data-[state=open]:shadow-sm sm:px-6">
              <AccordionTrigger className="py-5 text-left text-base font-medium hover:no-underline">{faq.question}</AccordionTrigger>
              <AccordionContent className="pb-5 text-[15px] leading-relaxed text-muted-foreground">{faq.answer}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      ) : (
        <p className="rounded-2xl border border-dashed py-10 text-center text-sm text-muted-foreground">Belum ada pertanyaan di kategori ini.</p>
      )}
    </div>
  );
}
