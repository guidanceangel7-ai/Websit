import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { Clock, Headphones, ArrowRight } from "lucide-react";
import { Overline, Star } from "./Decor";

const CATEGORIES = {
  tarot_numerology: {
    title: "Tarot + Numerology Reading",
    blurb:
      "A blend of intuitive tarot insights and ancient numerology – clarity, timelines and direction.",
    accent: "from-lilac/30 to-blush/20",
  },
  akashic: {
    title: "Akashic Record Reading",
    blurb:
      "Access your soul's library – understand karmic patterns, soul gifts and your forward path.",
    accent: "from-peach/30 to-lilac/20",
  },
  voice_note: {
    title: "Voice Note Reading",
    blurb:
      "Personal recorded readings delivered to your WhatsApp – perfect for quick guidance.",
    accent: "from-blush/30 to-peach/20",
  },
};

function ServiceCard({ service, onSelect, badge, savings }) {
  return (
    <motion.button
      type="button"
      onClick={() => onSelect(service)}
      data-testid={`service-card-${service.id}`}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.25 }}
      className="group text-left relative w-full rounded-3xl bg-white/85 backdrop-blur border border-peach/25 p-6 sm:p-7 shadow-soft hover:shadow-[0_20px_50px_-15px_rgba(107,91,149,0.25)] focus:outline-none"
    >
      {badge && (
        <div className="absolute -top-3 left-6 inline-flex items-center gap-1.5 bg-lavender-deep text-ivory text-[10px] tracking-[0.22em] uppercase px-3 py-1.5 rounded-full shadow-[0_6px_18px_rgba(107,91,149,0.35)]">
          <Star size={10} color="#EBB99A" /> {badge}
        </div>
      )}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-2 text-peach-deep text-xs tracking-[0.22em] uppercase">
          {service.is_voice_note ? (
            <>
              <Headphones size={14} /> Voice Note
            </>
          ) : (
            <>
              <Clock size={14} /> {service.duration_minutes} min
            </>
          )}
        </div>
        <Star size={14} />
      </div>

      <div className="mt-5">
        <div className="font-display text-xl sm:text-2xl text-ink-plum leading-snug">
          {service.name}
        </div>
        <p className="mt-3 text-sm text-ink-plum/70 leading-relaxed line-clamp-3">
          {service.description}
        </p>
      </div>

      <div className="mt-6 flex items-end justify-between">
        <div>
          <div className="text-[11px] tracking-[0.2em] uppercase text-ink-plum/50">
            Investment
          </div>
          <div className="font-display text-3xl text-lavender-deep mt-1">
            ₹{service.price_inr.toLocaleString("en-IN")}
          </div>
          {savings && (
            <div className="mt-1 inline-block text-[10px] tracking-[0.2em] uppercase font-semibold text-peach-deep bg-peach/15 px-2 py-0.5 rounded-full">
              Save {savings}
            </div>
          )}
        </div>
        <span className="inline-flex items-center gap-1.5 text-sm text-lavender-deep font-medium opacity-90 group-hover:translate-x-1 transition">
          Book now <ArrowRight size={16} />
        </span>
      </div>
    </motion.button>
  );
}

export default function Services({ services, onSelect }) {
  const grouped = useMemo(() => {
    const map = { tarot_numerology: [], akashic: [], voice_note: [] };
    services?.forEach((s) => {
      if (map[s.category]) map[s.category].push(s);
    });
    return map;
  }, [services]);

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
            Choose the reading that{" "}
            <span className="italic text-lavender-deep">calls to you</span>.
          </h2>
          <p className="mt-5 text-base sm:text-lg text-ink-plum/75 leading-relaxed">
            Every session is held with care. Pick a length and topic that
            feels right – Jenika takes care of the rest.
          </p>
        </div>

        {Object.entries(grouped).map(([key, list]) =>
          list.length === 0 ? null : (
            <div key={key} className="mt-14">
              <div className="flex items-end justify-between mb-6">
                <div>
                  <div className="font-display text-2xl sm:text-3xl text-ink-plum">
                    {CATEGORIES[key].title}
                  </div>
                  <p className="text-sm text-ink-plum/60 mt-1 max-w-xl">
                    {CATEGORIES[key].blurb}
                  </p>
                </div>
                <div
                  className={`hidden sm:block h-1 w-32 rounded-full bg-gradient-to-r ${CATEGORIES[key].accent}`}
                />
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {list.map((service, i) => {
                  // First card in tarot_numerology + akashic = "Most loved"
                  // 45-min / 60-min cards get a savings badge
                  let badge = null;
                  let savings = null;
                  if (key === "tarot_numerology" && service.duration_minutes === 30) {
                    badge = "Most Loved";
                  }
                  if (key === "akashic" && service.duration_minutes === 60) {
                    badge = "Deepest Journey";
                  }
                  if (service.duration_minutes === 45) savings = "₹500";
                  if (service.duration_minutes === 60) savings = "₹500";
                  return (
                    <ServiceCard
                      key={service.id}
                      service={service}
                      onSelect={onSelect}
                      badge={badge}
                      savings={savings}
                    />
                  );
                })}
              </div>
            </div>
          )
        )}
      </div>
    </section>
  );
}
