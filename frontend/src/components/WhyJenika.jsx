import React from "react";
import { motion } from "framer-motion";
import {
  Moon,
  HeartHandshake,
  Globe2,
  Star as StarIcon,
  BookOpen,
  Sparkles,
} from "lucide-react";
import { Overline } from "./Decor";

const REASONS = [
  {
    icon: Moon,
    title: "Deeply Accurate",
    text: "Clients consistently describe Jenika's readings as remarkably precise — insights that feel personally tailored and strikingly on point.",
  },
  {
    icon: HeartHandshake,
    title: "Compassionate Space",
    text: "Every session is a safe, non-judgmental sanctuary. Clarity delivered with warmth, understanding, and deep care — never fear.",
  },
  {
    icon: Globe2,
    title: "Global Clientele",
    text: "From India to the US, UK, UAE and beyond — Jenika has guided clients across 20+ countries through life's most pivotal moments.",
  },
  {
    icon: StarIcon,
    title: "Proven Track Record",
    text: "200+ five-star Google reviews and 1,000+ Instagram testimonials reflect the real, lasting transformation clients experience.",
  },
  {
    icon: BookOpen,
    title: "Three Powerful Modalities",
    text: "Tarot, Numerology and Akashic Records together create a uniquely holistic view — past influences, present patterns and future potential.",
  },
  {
    icon: Sparkles,
    title: "Soul-Level Healing",
    text: "Akashic Records work heals deep patterns, clears karmic blocks, and powerfully reconnects you with your soul's true purpose.",
  },
];

export default function WhyJenika() {
  return (
    <section
      id="why"
      data-testid="why-section"
      className="relative py-20 sm:py-24"
    >
      <div className="max-w-7xl mx-auto px-6 sm:px-12">
        <div className="text-center max-w-3xl mx-auto">
          <Overline>Why Jenika</Overline>
          <h2
            data-testid="why-heading"
            className="font-display mt-4 text-4xl sm:text-5xl text-ink-plum leading-[1.08] tracking-tight"
          >
            What makes a reading{" "}
            <span className="italic text-lavender-deep">truly transformative</span>
          </h2>
        </div>

        <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
          {REASONS.map((r, i) => (
            <motion.div
              key={r.title}
              data-testid={`why-card-${i}`}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.55, delay: i * 0.06 }}
              className="rounded-3xl bg-white border border-peach/30 p-7 sm:p-8 shadow-soft hover:-translate-y-1 hover:shadow-[0_18px_40px_-15px_rgba(107,91,149,0.22)] transition"
            >
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-lavender-soft to-blush flex items-center justify-center text-lavender-deep">
                <r.icon size={22} strokeWidth={1.6} />
              </div>
              <h3 className="font-display mt-6 text-xl text-ink-plum">
                {r.title}
              </h3>
              <p className="mt-3 text-sm text-ink-plum/75 leading-relaxed">
                {r.text}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
