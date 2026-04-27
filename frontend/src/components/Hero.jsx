import React from "react";
import { motion } from "framer-motion";
import { ArrowRight, MessageCircle } from "lucide-react";
import { BRAND, TRUST_STATS } from "../lib/brand";
import { Overline, SparkleField, Star } from "./Decor";

export default function Hero({ onBookNow }) {
  return (
    <section
      id="top"
      data-testid="hero-section"
      className="relative pt-28 pb-20 sm:pt-32 sm:pb-28 aurora-bg overflow-hidden"
      style={{ minHeight: "100dvh" }}
    >
      <SparkleField count={14} />

      {/* Soft cloud backdrop */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 opacity-40 mix-blend-multiply"
        style={{
          backgroundImage: `url(${BRAND.heroBackdrop})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      <div className="absolute inset-0 -z-10 bg-ivory/70" />

      <div className="max-w-7xl mx-auto px-6 sm:px-12 grid lg:grid-cols-12 gap-10 items-center relative">
        <div className="lg:col-span-7">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Overline>Sacred · Intuitive · Empowering</Overline>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.05 }}
            className="font-display mt-5 text-5xl sm:text-6xl lg:text-7xl leading-[1.05] tracking-tight text-ink-plum"
          >
            Guiding You to{" "}
            <span className="italic text-lavender-deep">Light</span>
            <span className="inline-block ml-2 align-middle">
              <Star size={28} />
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15 }}
            className="mt-6 text-base sm:text-lg text-ink-plum/75 max-w-xl leading-relaxed"
          >
            Discover your true path with{" "}
            <span className="text-lavender-deep font-medium">
              {BRAND.founder}
            </span>{" "}
            — Gujarat's celebrity Tarot Card Reader, Numerologist & Akashic
            Records Consultant. {BRAND.yearsExperience}+ years of soulful
            guidance for {BRAND.clientsGuided.toLocaleString()}+ seekers.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.25 }}
            className="mt-9 flex flex-wrap items-center gap-4"
          >
            <button
              data-testid="hero-book-now"
              onClick={onBookNow}
              className="group inline-flex items-center gap-2 bg-lavender-deep text-ivory rounded-full px-7 py-3.5 text-sm sm:text-base font-medium hover:bg-lavender-deeper transition shadow-[0_8px_28px_rgba(107,91,149,0.3)] hover:scale-[1.03]"
            >
              Book Your Reading
              <ArrowRight
                size={18}
                className="transition group-hover:translate-x-1"
              />
            </button>
            <a
              data-testid="hero-whatsapp"
              href={`https://wa.me/${BRAND.whatsapp}?text=${encodeURIComponent("Hi Jenika, I'd love to know more about your readings.")}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 bg-white/80 backdrop-blur border border-peach/40 text-lavender-deep rounded-full px-6 py-3.5 text-sm sm:text-base font-medium hover:bg-peach/10 transition"
            >
              <MessageCircle size={18} />
              Chat on WhatsApp
            </a>
          </motion.div>

          {/* Trust strip */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.35 }}
            className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-2xl"
          >
            {TRUST_STATS.map((s) => (
              <div
                key={s.label}
                data-testid={`stat-${s.label.replace(/\s+/g, "-").toLowerCase()}`}
                className="px-5 py-4 rounded-2xl bg-white/70 backdrop-blur border border-peach/25"
              >
                <div className="font-display text-2xl text-lavender-deep">
                  {s.value}
                </div>
                <div className="text-[11px] tracking-[0.18em] uppercase text-ink-plum/70 mt-1">
                  {s.label}
                </div>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Right – logo medallion + photo */}
        <div className="lg:col-span-5 relative">
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.9, delay: 0.2 }}
            className="relative mx-auto w-[78%] sm:w-[70%] lg:w-full max-w-[480px]"
          >
            {/* Outer halo ring */}
            <div className="absolute -inset-6 rounded-full bg-gradient-to-br from-lilac/40 via-peach/30 to-blush/40 blur-2xl" />
            <div className="relative aspect-square rounded-full overflow-hidden ring-1 ring-peach/40 shadow-[0_30px_80px_-20px_rgba(107,91,149,0.45)]">
              <img
                src={BRAND.logoRound}
                alt="Guidance Angel logo"
                className="w-full h-full object-cover animate-float-slow"
              />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
