import React from "react";
import Marquee from "react-fast-marquee";
import { Star } from "./Decor";
import { Overline } from "./Decor";

function TestimonialCard({ t }) {
  return (
    <div
      data-testid={`testimonial-${t.id}`}
      className="mx-3 w-[340px] sm:w-[380px] flex-shrink-0 rounded-3xl bg-white/85 border border-peach/25 px-6 py-7 shadow-soft"
    >
      <div className="flex items-center gap-1 text-peach">
        {Array.from({ length: t.rating || 5 }).map((_, i) => (
          <Star key={`${t.id}-star-${i}`} size={14} />
        ))}
      </div>
      <p className="mt-4 text-sm leading-relaxed text-ink-plum/85 line-clamp-6 font-display italic">
        “{t.content}”
      </p>
      <div className="mt-5 flex items-center justify-between">
        <div>
          <div className="font-display text-base text-lavender-deep">
            {t.author}
          </div>
          {t.source && (
            <div className="text-[10px] uppercase tracking-[0.22em] text-peach-deep mt-1">
              via {t.source}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Testimonials({ items }) {
  if (!items || items.length === 0) return null;
  return (
    <section
      id="testimonials"
      data-testid="testimonials-section"
      className="relative py-20 sm:py-28 overflow-hidden"
    >
      <div className="max-w-7xl mx-auto px-6 sm:px-12 mb-12">
        <div className="max-w-3xl">
          <Overline>Stories From Souls</Overline>
          <h2
            data-testid="testimonials-heading"
            className="font-display mt-4 text-4xl sm:text-5xl text-ink-plum leading-[1.08] tracking-tight"
          >
            <span className="italic text-lavender-deep">Loved</span> by 5,000+
            seekers across the world.
          </h2>
          <p className="mt-5 text-base sm:text-lg text-ink-plum/75 leading-relaxed">
            With 200+ five-star Google reviews and 1,000+ glowing Instagram
            stories, here are a few experiences shared straight from the heart.
          </p>
        </div>
      </div>

      <Marquee gradient gradientColor="#FBF4E8" gradientWidth={80} speed={32} pauseOnHover>
        {items.map((t) => (
          <TestimonialCard key={t.id} t={t} />
        ))}
      </Marquee>

      <div className="mt-6">
        <Marquee
          gradient
          gradientColor="#FBF4E8"
          gradientWidth={80}
          speed={28}
          direction="right"
          pauseOnHover
        >
          {[...items].reverse().map((t) => (
            <TestimonialCard key={`r-${t.id}`} t={t} />
          ))}
        </Marquee>
      </div>
    </section>
  );
}
