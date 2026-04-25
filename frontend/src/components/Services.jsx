import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { Clock, Headphones, ArrowRight, BookOpen, Sparkles, CalendarHeart, Heart, Stars } from "lucide-react";
import { Overline, Star } from "./Decor";

// Map category id -> icon + accent gradient (Tailwind-friendly)
const CATEGORY_META = {
  tarot_numerology_call: {
    icon: Stars,
    gradient: "from-[#6B5B95] via-[#9B8AC4] to-[#C8B6E2]",
    chip: "bg-[#6B5B95] text-white",
  },
  tarot_numerology_question: {
    icon: Headphones,
    gradient: "from-[#9B8AC4] via-[#C8B6E2] to-[#E6DDF1]",
    chip: "bg-[#9B8AC4] text-white",
  },
  akashic: {
    icon: BookOpen,
    gradient: "from-[#EBB99A] via-[#F4C6D6] to-[#C8B6E2]",
    chip: "bg-[#D9A382] text-white",
  },
  all_in_one: {
    icon: Sparkles,
    gradient: "from-[#9B8AC4] via-[#F4C6D6] to-[#EBB99A]",
    chip: "bg-[#EBB99A] text-[#3A2E5D]",
  },
  month_ahead: {
    icon: CalendarHeart,
    gradient: "from-[#C8B6E2] via-[#E6DDF1] to-[#F4C6D6]",
    chip: "bg-[#9B8AC4] text-white",
  },
  healing: {
    icon: Heart,
    gradient: "from-[#F4C6D6] via-[#EBB99A] to-[#FBE4D5]",
    chip: "bg-[#C26B6B] text-white",
  },
};

function PricePill({ price }) {
  return (
    <span className="font-display text-lg sm:text-xl text-[#6B5B95]">
      ₹{price.toLocaleString("en-IN")}
    </span>
  );
}

function ServiceRow({ s, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(s)}
      data-testid={`service-row-${s.id}`}
      className="group w-full text-left rounded-xl bg-white border border-[#EBB99A]/30 px-4 py-3 hover:border-[#6B5B95] hover:bg-[#FBF4E8] transition flex items-center justify-between gap-3"
    >
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-[#FBF4E8] flex items-center justify-center text-[#9B8AC4]">
          {s.is_voice_note ? <Headphones size={15} /> : <Clock size={15} />}
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-[#D9A382] font-bold">
            {s.is_voice_note ? "Voice Note · 48hr delivery" : `${s.duration_minutes} min · Live call`}
          </div>
          <div className="font-display text-sm sm:text-base text-[#3A2E5D] mt-0.5">
            {s.name}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <PricePill price={s.price_inr} />
        <ArrowRight size={14} className="text-[#9B8AC4] opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition" />
      </div>
    </button>
  );
}

function CategoryCard({ category, onPickService, index }) {
  const meta = CATEGORY_META[category.id] || CATEGORY_META.tarot_numerology;
  const Icon = meta.icon;
  const minPrice = category.services.length
    ? Math.min(...category.services.map((s) => s.price_inr))
    : 0;
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.55, delay: index * 0.06 }}
      data-testid={`category-card-${category.id}`}
      className="relative rounded-3xl bg-white border-2 border-[#EBB99A]/30 shadow-soft overflow-hidden"
    >
      <div className={`relative bg-gradient-to-br ${meta.gradient} p-6 sm:p-7`}>
        <div className="absolute -top-12 -right-8 w-44 h-44 rounded-full bg-white/15 blur-3xl pointer-events-none" />
        <div className="relative flex items-start justify-between gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white/30 backdrop-blur flex items-center justify-center text-white">
            <Icon size={22} strokeWidth={1.6} />
          </div>
          <span className={`text-[10px] tracking-[0.22em] uppercase ${meta.chip} px-3 py-1 rounded-full font-bold`}>
            From ₹{minPrice.toLocaleString("en-IN")}
          </span>
        </div>
        <h3 className="font-display text-2xl sm:text-3xl text-white mt-4 leading-tight drop-shadow-[0_2px_6px_rgba(0,0,0,0.18)]">
          {category.name}
        </h3>
        <p className="mt-2 text-sm text-white/90 leading-relaxed max-w-md">
          {category.description}
        </p>
      </div>

      <div className="p-5 sm:p-6 space-y-2 bg-white">
        {category.services.map((s) => (
          <ServiceRow key={s.id} s={s} onSelect={onPickService} />
        ))}
      </div>
    </motion.div>
  );
}

export default function Services({ categories, onSelect }) {
  const ordered = useMemo(
    () => (categories || []).slice().sort((a, b) => (a.order || 0) - (b.order || 0)),
    [categories]
  );

  if (!ordered.length) return null;

  return (
    <section
      id="services"
      data-testid="services-section"
      className="relative py-20 sm:py-28 bg-gradient-to-b from-ivory via-ivory-deep/40 to-ivory"
    >
      <div className="max-w-7xl mx-auto px-6 sm:px-12">
        <div className="max-w-3xl">
          <Overline>Sacred Offerings</Overline>
          <h2
            data-testid="services-heading"
            className="font-display mt-4 text-4xl sm:text-5xl text-ink-plum leading-[1.08] tracking-tight"
          >
            Choose the path that{" "}
            <span className="italic text-lavender-deep">calls to you</span>.
          </h2>
          <p className="mt-5 text-base sm:text-lg text-ink-plum/75 leading-relaxed">
            Six sacred categories — each tailored to a different soul-need. Pick a
            category, then choose your variant. Jenika takes care of the rest.
          </p>
        </div>

        <div className="mt-12 grid lg:grid-cols-2 gap-6 sm:gap-8">
          {ordered.map((cat, i) => (
            <CategoryCard
              key={cat.id}
              category={cat}
              index={i}
              onPickService={onSelect}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
