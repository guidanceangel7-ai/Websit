import React from "react";
import { motion } from "framer-motion";
import { Heart, Instagram, Sparkles, Stars, Moon } from "lucide-react";
import { Overline, Star } from "./Decor";
import { BRAND } from "../lib/brand";

// Themed Instagram-style cards (gradient + caption + likes) – on-brand and never break
// Gradient classes are written out explicitly so Tailwind JIT picks them up
const POSTS = [
  {
    caption: "Tarot card of the week — The Star ✦",
    likes: "1.2k",
    bg: "bg-gradient-to-br from-[#6B5B95] via-[#C8B6E2] to-[#F4C6D6]",
    icon: Stars,
    eyebrow: "CARD PULL",
  },
  {
    caption: "Akashic insight: trust your soul's timing",
    likes: "987",
    bg: "bg-gradient-to-br from-[#F4C6D6] via-[#EBB99A] to-[#E6DDF1]",
    icon: Moon,
    eyebrow: "AKASHIC NOTE",
  },
  {
    caption: "Numerology: what your year-number whispers",
    likes: "1.6k",
    bg: "bg-gradient-to-br from-[#EBB99A] via-[#F4C6D6] to-[#C8B6E2]",
    icon: Sparkles,
    eyebrow: "NUMEROLOGY",
  },
  {
    caption: "5 signs you're being divinely re-routed",
    likes: "2.1k",
    bg: "bg-gradient-to-br from-[#C8B6E2] via-[#E6DDF1] to-[#EBB99A]",
    icon: Sparkles,
    eyebrow: "SOUL SIGNS",
  },
  {
    caption: "Crystal grid for new-moon manifestations",
    likes: "873",
    bg: "bg-gradient-to-br from-[#E6DDF1] via-[#F4C6D6] to-[#EBB99A]",
    icon: Moon,
    eyebrow: "RITUAL",
  },
  {
    caption: "The 4 of Cups in love — what it really means",
    likes: "1.4k",
    bg: "bg-gradient-to-br from-[#9B8AC4] via-[#6B5B95] to-[#C8B6E2]",
    icon: Stars,
    eyebrow: "CARD MEANING",
  },
];

function PostCard({ p, i }) {
  const Icon = p.icon;
  return (
    <motion.a
      href={BRAND.instagram}
      target="_blank"
      rel="noreferrer"
      data-testid={`instagram-post-${i}`}
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.5, delay: i * 0.05 }}
      className="group relative block aspect-square rounded-2xl overflow-hidden border border-peach/30 shadow-soft"
    >
      {/* Gradient base */}
      <div className={`absolute inset-0 ${p.bg}`} />
      {/* Subtle starfield */}
      <div aria-hidden="true" className="absolute inset-0">
        {Array.from({ length: 18 }).map((_, k) => {
          const top = (k * 37) % 100;
          const left = (k * 53) % 100;
          const size = 6 + ((k * 7) % 10);
          return (
            <span
              key={k}
              className="absolute opacity-70"
              style={{
                top: `${top}%`,
                left: `${left}%`,
                animation: `twinkle ${3 + (k % 4)}s ease-in-out infinite`,
                animationDelay: `${(k % 5) * 0.3}s`,
              }}
            >
              <Star size={size} color="#FBF4E8" />
            </span>
          );
        })}
      </div>
      {/* Glass overlay (visible always) */}
      <div className="absolute inset-0 bg-gradient-to-t from-ink-plum/55 via-transparent to-transparent" />

      {/* Foreground */}
      <div className="relative h-full w-full p-5 sm:p-6 flex flex-col">
        <div className="flex items-center gap-2 text-[10px] tracking-[0.3em] uppercase text-ivory/95">
          <Icon size={14} strokeWidth={1.6} /> {p.eyebrow}
        </div>
        <div className="mt-auto">
          <div className="font-display italic text-ivory text-lg sm:text-xl leading-snug drop-shadow-[0_1px_4px_rgba(0,0,0,0.3)]">
            “{p.caption}”
          </div>
          <div className="mt-3 inline-flex items-center gap-1.5 text-[11px] tracking-[0.2em] uppercase text-ivory/90">
            <Heart size={12} className="fill-ivory text-ivory" /> {p.likes}
          </div>
        </div>
      </div>

      {/* Hover lift */}
      <div className="absolute inset-0 ring-0 group-hover:ring-2 group-hover:ring-peach/60 transition rounded-2xl" />
    </motion.a>
  );
}

export default function InstagramGrid() {
  return (
    <section
      id="instagram"
      data-testid="instagram-section"
      className="relative py-20 sm:py-24"
    >
      <div className="max-w-7xl mx-auto px-6 sm:px-12">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 mb-12">
          <div className="max-w-2xl">
            <Overline>Daily Soul Drops</Overline>
            <h2
              data-testid="instagram-heading"
              className="font-display mt-4 text-4xl sm:text-5xl text-ink-plum leading-[1.08] tracking-tight"
            >
              Follow the magic on{" "}
              <span className="italic text-lavender-deep">Instagram</span>.
            </h2>
            <p className="mt-4 text-base text-ink-plum/75 leading-relaxed">
              Card pulls, mini-scopes, and gentle reminders for souls in
              transition – delivered to your feed twice a week.
            </p>
          </div>
          <a
            data-testid="instagram-cta"
            href={BRAND.instagram}
            target="_blank"
            rel="noreferrer"
            className="self-start sm:self-end inline-flex items-center gap-2 bg-white border border-peach/40 text-lavender-deep rounded-full px-6 py-3 text-sm font-medium hover:bg-peach/10 transition"
          >
            <Instagram size={16} /> @guidance_angel7
          </a>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
          {POSTS.map((p, i) => (
            <PostCard key={i} p={p} i={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
