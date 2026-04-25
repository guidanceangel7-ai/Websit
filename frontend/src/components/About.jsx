import React from "react";
import { motion } from "framer-motion";
import { BRAND } from "../lib/brand";
import { Overline, Star } from "./Decor";
import { Heart, Stars, BookOpen } from "lucide-react";

const PILLARS = [
  {
    icon: Stars,
    title: "Tarot Card Reading",
    text: "Precise, compassionate guidance from the cards on love, career, finances and life choices.",
  },
  {
    icon: BookOpen,
    title: "Numerology",
    text: "Decode your life path, soul number and yearly forecast through ancient numerical wisdom.",
  },
  {
    icon: Heart,
    title: "Akashic Records",
    text: "Access the soul library of your lifetimes – discover karmic patterns, gifts and guidance.",
  },
];

export default function About() {
  return (
    <section
      id="about"
      data-testid="about-section"
      className="relative py-20 sm:py-28"
    >
      <div className="max-w-7xl mx-auto px-6 sm:px-12 grid lg:grid-cols-12 gap-14 items-center">
        {/* Photo of Jenika */}
        <motion.div
          initial={{ opacity: 0, x: -16 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7 }}
          className="lg:col-span-5 relative"
        >
          <div className="relative max-w-md mx-auto">
            <div className="absolute -inset-3 rounded-[2.5rem] bg-gradient-to-br from-lilac/40 via-blush/40 to-peach/40 blur-xl" />
            <div className="relative rounded-[2.5rem] overflow-hidden border border-peach/30 shadow-soft">
              <img
                src={BRAND.jenikaPhoto}
                alt="Jenika Bhayani – Tarot Card Reader & Numerologist"
                className="w-full aspect-[4/5] object-cover"
              />
            </div>

            {/* signature badge */}
            <div className="absolute -bottom-6 left-6 sm:left-10 glass-card rounded-2xl px-5 py-3 flex items-center gap-3">
              <Star size={16} />
              <div>
                <div className="font-display italic text-lavender-deep text-base">
                  Jenika Bhayani
                </div>
                <div className="text-[11px] tracking-[0.18em] uppercase text-peach-deep">
                  Founder · Guide
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="lg:col-span-7">
          <Overline>Meet Your Guide</Overline>
          <h2
            data-testid="about-heading"
            className="font-display mt-4 text-4xl sm:text-5xl tracking-tight text-ink-plum leading-[1.08]"
          >
            A sister-soul guiding{" "}
            <span className="italic text-lavender-deep">5,000+ seekers</span>{" "}
            home to themselves.
          </h2>

          <p className="mt-6 text-base sm:text-lg leading-relaxed text-ink-plum/80 max-w-xl">
            With over {BRAND.yearsExperience} years of practice, Jenika weaves
            tarot, numerology and Akashic Records into readings that feel both
            precise and deeply held. Her clients describe her as clear,
            empowering and intuitively gentle – a guide who shows you the path
            without ever pushing.
          </p>
          <p className="mt-4 text-base sm:text-lg leading-relaxed text-ink-plum/80 max-w-xl">
            Recognised across India as a celebrity reader with{" "}
            {BRAND.googleReviews}+ five-star Google reviews and{" "}
            {BRAND.igTestimonials}+ Instagram testimonials, she has guided
            seekers through career pivots, relationships, fertility, healing and
            life's quiet pivots.
          </p>

          {/* Pillars */}
          <div className="mt-10 grid sm:grid-cols-3 gap-5">
            {PILLARS.map((p) => (
              <motion.div
                key={p.title}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className="rounded-2xl bg-white/85 border border-peach/25 px-5 py-6 hover:-translate-y-1 hover:shadow-soft transition"
              >
                <div className="w-10 h-10 rounded-full bg-peach/20 flex items-center justify-center text-lavender-deep">
                  <p.icon size={18} strokeWidth={1.6} />
                </div>
                <div className="mt-4 font-display text-lg text-ink-plum">
                  {p.title}
                </div>
                <p className="mt-2 text-sm text-ink-plum/70 leading-relaxed">
                  {p.text}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
