import React from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "./ui/accordion";
import { Overline } from "./Decor";
import { FAQS } from "../lib/brand";

export default function FAQ() {
  return (
    <section
      id="faq"
      data-testid="faq-section"
      className="relative py-20 sm:py-28 bg-gradient-to-b from-ivory to-ivory-deep/40"
    >
      <div className="max-w-4xl mx-auto px-6 sm:px-12">
        <div className="text-center">
          <Overline>Curious Hearts</Overline>
          <h2
            data-testid="faq-heading"
            className="font-display mt-4 text-4xl sm:text-5xl text-ink-plum leading-[1.08] tracking-tight"
          >
            Frequently asked{" "}
            <span className="italic text-lavender-deep">questions</span>
          </h2>
        </div>

        <Accordion type="single" collapsible className="mt-12 space-y-3">
          {FAQS.map((f, idx) => (
            <AccordionItem
              key={idx}
              value={`item-${idx}`}
              data-testid={`faq-item-${idx}`}
              className="bg-white/85 border border-peach/30 rounded-2xl px-5 sm:px-6 [&[data-state=open]]:shadow-soft"
            >
              <AccordionTrigger className="text-left font-display text-base sm:text-lg text-ink-plum hover:no-underline py-5">
                {f.q}
              </AccordionTrigger>
              <AccordionContent className="text-ink-plum/75 leading-relaxed pb-6">
                {f.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
