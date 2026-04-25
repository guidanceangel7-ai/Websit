import React from "react";
import { motion } from "framer-motion";
import { Sparkles, CalendarHeart, Headphones, Stars } from "lucide-react";
import { Overline } from "./Decor";

const STEPS = [
  {
    icon: Sparkles,
    title: "Choose your reading",
    text: "Browse Tarot, Numerology, Akashic or a Voice Note service – pick what calls to you.",
  },
  {
    icon: CalendarHeart,
    title: "Pick a sacred slot",
    text: "Select a date and a 30-min window from the live calendar – Sundays are reserved for rest.",
  },
  {
    icon: Stars,
    title: "Share your details",
    text: "Drop your name, WhatsApp, birth details and the question on your heart.",
  },
  {
    icon: Headphones,
    title: "Receive your guidance",
    text: "Pay securely, and Jenika holds space for you on call (or sends a recorded voice note).",
  },
];

export default function HowItWorks({ onBookNow }) {
  return (
    <section
      id="how-it-works"
      data-testid="how-section"
      className="relative py-20 sm:py-24 bg-gradient-to-b from-ivory via-ivory-deep/40 to-ivory"
    >
      <div className="max-w-7xl mx-auto px-6 sm:px-12">
        <div className="max-w-3xl">
          <Overline>The Sacred Process</Overline>
          <h2
            data-testid="how-heading"
            className="font-display mt-4 text-4xl sm:text-5xl text-ink-plum leading-[1.08] tracking-tight"
          >
            Four gentle steps,{" "}
            <span className="italic text-lavender-deep">one soul shift</span>.
          </h2>
        </div>

        <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-5 relative">
          {/* Connecting line */}
          <div className="hidden lg:block absolute top-12 left-[12%] right-[12%] h-px bg-gradient-to-r from-peach/0 via-peach/60 to-peach/0" />

          {STEPS.map((s, i) => (
            <motion.div
              key={s.title}
              data-testid={`how-step-${i + 1}`}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.55, delay: i * 0.1 }}
              className="relative rounded-3xl bg-white/90 border border-peach/30 p-6 sm:p-7 shadow-soft hover:-translate-y-1 hover:shadow-[0_18px_40px_-15px_rgba(107,91,149,0.22)] transition"
            >
              <div className="absolute -top-3 -left-3 w-10 h-10 rounded-full bg-lavender-deep text-ivory font-display text-base flex items-center justify-center shadow-glow">
                {String(i + 1).padStart(2, "0")}
              </div>
              <div className="w-12 h-12 rounded-2xl bg-peach/20 flex items-center justify-center text-lavender-deep">
                <s.icon size={20} strokeWidth={1.6} />
              </div>
              <div className="mt-5 font-display text-lg text-ink-plum">
                {s.title}
              </div>
              <p className="mt-2 text-sm text-ink-plum/70 leading-relaxed">
                {s.text}
              </p>
            </motion.div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <button
            data-testid="how-cta"
            onClick={onBookNow}
            className="inline-flex items-center gap-2 bg-lavender-deep text-ivory rounded-full px-7 py-3.5 text-sm sm:text-base font-medium hover:bg-lavender-deeper transition shadow-[0_8px_28px_rgba(107,91,149,0.3)] hover:scale-[1.03]"
          >
            Begin Your Journey
          </button>
        </div>
      </div>
    </section>
  );
}
