import React from "react";
import Marquee from "react-fast-marquee";
import { Star } from "./Decor";

const TAGS = [
  "Tarot Card Reading",
  "Numerology Guidance",
  "Akashic Records",
  "Yearly Tarotscope",
  "Voice Note Readings",
  "Soul Path Discovery",
  "Karmic Healing",
  "Relationship Clarity",
  "Career Direction",
];

export default function HeroMarquee() {
  return (
    <section
      data-testid="hero-marquee"
      aria-hidden="true"
      className="relative py-6 bg-lavender-deep overflow-hidden"
    >
      <Marquee gradient={false} speed={40} pauseOnHover={false}>
        {TAGS.concat(TAGS).map((t, i) => (
          <span
            key={`${t}-${i}`}
            className="mx-6 inline-flex items-center gap-3 font-display italic text-2xl sm:text-3xl text-ivory/90"
          >
            {t}
            <Star size={14} color="#EBB99A" />
          </span>
        ))}
      </Marquee>
    </section>
  );
}
