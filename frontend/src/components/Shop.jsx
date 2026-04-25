import React from "react";
import { motion } from "framer-motion";
import { ShoppingBag, ArrowRight, Quote } from "lucide-react";
import { Overline, Star } from "./Decor";
import { BRAND } from "../lib/brand";

const PRODUCTS = [
  {
    name: "Energised Crystals",
    blurb:
      "Hand-picked rose quartz, amethyst, citrine and clear quartz — cleansed and charged with reiki for their highest purpose.",
    accent: "from-[#C8B6E2] to-[#E6DDF1]",
    badge: "Most Loved",
  },
  {
    name: "Intention Candles",
    blurb:
      "Soy wax candles infused with herbs, essential oils and mantras — for love, abundance, protection and clarity rituals.",
    accent: "from-[#F4C6D6] to-[#FBE4D5]",
    badge: "Bestseller",
  },
  {
    name: "Healing Oils",
    blurb:
      "Sacred blends crafted with crystals, herbs and pure essential oils. Anoint candles, pulse points and altars.",
    accent: "from-[#EBB99A] to-[#F4C6D6]",
    badge: "New",
  },
];

export default function Shop() {
  return (
    <section
      id="shop"
      data-testid="shop-section"
      className="relative pt-20 sm:pt-24"
    >
      {/* Top deep-lavender bar */}
      <div aria-hidden="true" className="h-20 sm:h-28 bg-lavender-deep" />

      <div className="max-w-7xl mx-auto px-6 sm:px-12 -mt-12 sm:-mt-20">
        {/* Header + quote */}
        <div className="grid lg:grid-cols-2 gap-10 sm:gap-14 items-start">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6 }}
          >
            <Overline>Sacred Shop</Overline>
            <h2
              data-testid="shop-heading"
              className="font-display mt-4 text-4xl sm:text-5xl lg:text-6xl text-ink-plum leading-[1.04] tracking-tight"
            >
              Intentional{" "}
              <span className="italic text-peach-deep">Wellness</span>{" "}
              Products
            </h2>
            <div className="mt-6 h-1 w-24 rounded-full bg-gradient-to-r from-peach to-blush" />
            <p className="mt-7 text-base sm:text-lg text-ink-plum/75 leading-relaxed max-w-xl">
              Each product is crafted with deep intention — energetically charged
              and aligned with specific healing frequencies to support your
              spiritual practice, abundance, and protection.
            </p>
            <a
              data-testid="shop-cta"
              href={BRAND.exlySite}
              target="_blank"
              rel="noreferrer"
              className="mt-9 inline-flex items-center gap-2 bg-gradient-to-r from-peach to-peach-deep text-ink-plum rounded-full px-7 py-3.5 text-sm font-semibold hover:from-peach-deep hover:to-peach transition shadow-[0_8px_28px_rgba(217,163,130,0.4)] hover:scale-[1.03]"
            >
              <ShoppingBag size={16} />
              Shop All Products
              <ArrowRight size={16} />
            </a>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="relative"
          >
            <div className="relative rounded-3xl bg-white border border-peach/30 p-8 sm:p-10 shadow-soft">
              <Quote
                className="absolute top-5 right-6 text-peach/50"
                size={36}
                strokeWidth={1.4}
              />
              <p className="font-display italic text-lg sm:text-xl text-ink-plum/85 leading-relaxed">
                "Every crystal, candle, and oil I create is personally energised
                and aligned. They are not just beautiful objects — they are tools
                for real transformation."
              </p>
              <div className="mt-6 flex items-center gap-3">
                <div className="h-px flex-1 bg-peach/40" />
                <Star size={12} />
                <div className="text-[11px] tracking-[0.28em] uppercase text-peach-deep font-semibold">
                  Jenika Bhayani · Founder
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Product cards */}
        <div className="mt-12 sm:mt-14 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {PRODUCTS.map((p, i) => (
            <motion.div
              key={p.name}
              data-testid={`shop-product-${i}`}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.55, delay: i * 0.07 }}
              className="group rounded-3xl bg-white border border-peach/30 overflow-hidden shadow-soft hover:-translate-y-1 hover:shadow-[0_18px_40px_-15px_rgba(107,91,149,0.22)] transition"
            >
              <div
                className={`relative aspect-[5/3] bg-gradient-to-br ${p.accent} flex items-center justify-center`}
              >
                {/* Decorative starfield */}
                <div aria-hidden="true" className="absolute inset-0">
                  {Array.from({ length: 14 }).map((_, k) => {
                    const top = (k * 31) % 100;
                    const left = (k * 47) % 100;
                    const size = 7 + ((k * 5) % 9);
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
                <div className="absolute top-4 left-4 text-[10px] tracking-[0.28em] uppercase bg-white/90 backdrop-blur text-ink-plum px-3 py-1 rounded-full font-bold">
                  {p.badge}
                </div>
                <div className="relative font-display text-3xl sm:text-4xl text-white drop-shadow-[0_2px_8px_rgba(58,46,93,0.3)] italic">
                  {p.name.split(" ")[0]}
                </div>
              </div>
              <div className="p-6">
                <div className="font-display text-xl text-ink-plum">
                  {p.name}
                </div>
                <p className="mt-2 text-sm text-ink-plum/75 leading-relaxed">
                  {p.blurb}
                </p>
                <a
                  href={BRAND.exlySite}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-lavender-deep group-hover:translate-x-0.5 transition"
                >
                  Explore <ArrowRight size={14} />
                </a>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
