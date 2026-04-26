import React from "react";
import { motion } from "framer-motion";
import Marquee from "react-fast-marquee";
import { Star } from "./Decor";

const PRESS = [
  "Times of India",
  "Femina",
  "Vogue India",
  "Hindustan Times",
  "Mid Day",
  "Cosmopolitan",
  "Mirror",
  "CEO Weekly"
];

export default function PressStrip() {
  return (
    <section
      data-testid="press-strip"
      className="relative py-10 sm:py-14 bg-white/60 border-y border-peach/25"
    >
      <div className="max-w-7xl mx-auto px-6 sm:px-12">
        <div className="text-center mb-7">
          <div className="inline-flex items-center gap-2 text-[10px] tracking-[0.34em] uppercase text-peach-deep">
            <Star size={10} /> As featured & trusted by{" "}
            <Star size={10} />
          </div>
        </div>
        <Marquee
          gradient
          gradientColor="#FFFFFF"
          gradientWidth={60}
          speed={28}
          pauseOnHover
        >
          {PRESS.concat(PRESS).map((p, i) => (
            <motion.span
              key={`${p}-${i}`}
              className="mx-8 sm:mx-10 font-display italic text-2xl sm:text-3xl text-ink-plum/35 hover:text-lavender-deep transition select-none"
              whileHover={{ scale: 1.05 }}
            >
              {p}
            </motion.span>
          ))}
        </Marquee>
      </div>
    </section>
  );
}
