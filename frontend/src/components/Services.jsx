import React from "react";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles, Headphones, BookOpen, Star, Zap, Heart } from "lucide-react";
import { Overline, StarDivider } from "./Decor";

/* Icons mapped by service name keywords */
function getIcon(name = "") {
  const n = name.toLowerCase();
  if (n.includes("call") || n.includes("live"))     return Zap;
  if (n.includes("voice") || n.includes("audio"))   return Headphones;
  if (n.includes("akashic") || n.includes("record")) return BookOpen;
  if (n.includes("soul") || n.includes("healing"))  return Heart;
  if (n.includes("numerology"))                      return Star;
  return Sparkles;
}

/* Gradient by index */
const GRADIENTS = [
  "from-[#6B5B95] to-[#9B8AC4]",
  "from-[#9B8AC4] to-[#C8B6E2]",
  "from-[#EBB99A] to-[#F4C6D6]",
  "from-[#F4C6D6] to-[#FBE4D5]",
  "from-[#C8B6E2] to-[#E6DDF1]",
  "from-[#6B5B95] to-[#C8B6E2]",
];

function ServiceCard({ service, onBook, index }) {
  const Icon      = getIcon(service.name);
  const gradient  = service.color || GRADIENTS[index % GRADIENTS.length];
  const minPrice  = service.base_price || service.price || service.min_price;
  const variants  = service.variants || [];
  const variantCount = variants.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, delay: index * 0.07 }}
      className="group rounded-3xl overflow-hidden border border-[#C8B6E2]/30 bg-white shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex flex-col cursor-pointer"
      onClick={() => onBook && onBook(service)}
    >
      {/* Gradient header */}
      <div className={`relative bg-gradient-to-br ${gradient} px-6 pt-6 pb-8`}>
        {/* Price badge */}
        {minPrice && (
          <div className="absolute top-4 right-4 bg-white/20 backdrop-blur text-white text-[11px] font-bold px-3 py-1 rounded-full tracking-wide">
            FROM ₹{Number(minPrice).toLocaleString("en-IN")}
          </div>
        )}
        {/* Icon */}
        <div className="w-11 h-11 rounded-2xl bg-white/25 flex items-center justify-center mb-4">
          <Icon size={20} className="text-white" />
        </div>
        {/* Name */}
        <h3 className="font-display text-white text-lg leading-snug pr-4">
          {service.name}
        </h3>
      </div>

      {/* Card body */}
      <div className="px-6 py-5 flex-1 flex flex-col justify-between gap-4">
        {service.description || service.tagline ? (
          <p className="text-sm text-[#6B5B95]/80 leading-relaxed">
            {service.description || service.tagline}
          </p>
        ) : null}

        <button
          onClick={(e) => { e.stopPropagation(); onBook && onBook(service); }}
          className="flex items-center justify-between w-full group/btn mt-auto"
        >
          <span className="text-xs font-semibold text-[#6B5B95] uppercase tracking-widest">
            {variantCount > 0
              ? `${variantCount} VARIANT${variantCount > 1 ? "S" : ""} →`
              : "BOOK NOW →"}
          </span>
          <div className="w-8 h-8 rounded-full bg-[#E6DDF1] group-hover/btn:bg-[#6B5B95] flex items-center justify-center transition-colors duration-200">
            <ArrowRight size={14} className="text-[#6B5B95] group-hover/btn:text-white transition-colors duration-200" />
          </div>
        </button>
      </div>
    </motion.div>
  );
}

export default function Services({ categories = [], onBookNow }) {
  /* Build a flat list of services from the booking categories passed down from HomePage.
     Falls back to a curated static list if no categories are loaded yet. */
  const services = React.useMemo(() => {
    const fromCats = categories.flatMap((cat) =>
      (cat.services || []).map((s) => ({ ...s, _category: cat.name }))
    );
    return fromCats.length > 0 ? fromCats : STATIC_SERVICES;
  }, [categories]);

  return (
    <section
      id="services"
      data-testid="services-section"
      className="relative py-20 sm:py-28 bg-gradient-to-b from-[#F5EEF8] via-[#FBF4E8] to-[#F5EEF8] overflow-hidden"
    >
      {/* Blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 right-0 w-96 h-96 rounded-full bg-[#C8B6E2]/20 blur-3xl" />
        <div className="absolute bottom-0 -left-20 w-80 h-80 rounded-full bg-[#EBB99A]/15 blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto px-6 sm:px-12">
        {/* Heading */}
        <div className="text-center max-w-2xl mx-auto mb-14">
          <Overline>Sacred Offerings</Overline>
          <h2
            data-testid="services-heading"
            className="font-display mt-4 text-4xl sm:text-5xl text-[#3A2E5D] leading-[1.08] tracking-tight"
          >
            Choose your{" "}
            <span className="italic text-[#6B5B95]">reading</span>
          </h2>
          <StarDivider className="mt-5" />
          <p className="mt-4 text-[#6B5B95]/80 text-base leading-relaxed">
            Every session is a sacred space — tailored to your soul's unique journey.
          </p>
        </div>

        {/* Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((svc, i) => (
            <ServiceCard
              key={svc.id || i}
              service={svc}
              index={i}
              onBook={onBookNow}
            />
          ))}
        </div>

        {/* CTA */}
        <div className="mt-12 text-center">
          <button
            onClick={() => onBookNow && onBookNow(null)}
            className="inline-flex items-center gap-2 bg-[#3A2E5D] text-white rounded-full px-8 py-3.5 text-sm font-semibold hover:bg-[#6B5B95] transition-all duration-200 shadow-[0_4px_20px_rgba(58,46,93,0.2)] hover:shadow-[0_6px_28px_rgba(107,91,149,0.35)]"
          >
            <Sparkles size={15} />
            Book a session
          </button>
        </div>
      </div>
    </section>
  );
}

/* ── Static fallback shown while API loads ─────────────────────────────── */
const STATIC_SERVICES = [
  {
    id: "s1",
    name: "Tarot + Numerology · Call Reading",
    description: "Live 1-on-1 call · clarity in real-time",
    base_price: 2100,
    variants: [{ id: "v1" }, { id: "v2" }, { id: "v3" }],
    color: "from-[#6B5B95] to-[#9B8AC4]",
  },
  {
    id: "s2",
    name: "Tarot + Numerology · Question Reading",
    description: "Recorded voice notes · 48-hour delivery",
    base_price: 550,
    variants: [{ id: "v1" }, { id: "v2" }, { id: "v3" }, { id: "v4" }],
    color: "from-[#9B8AC4] to-[#C8B6E2]",
  },
  {
    id: "s3",
    name: "Akashic Records Reading",
    description: "Past lives · soul contracts · life purpose",
    base_price: 2500,
    variants: [{ id: "v1" }, { id: "v2" }],
    color: "from-[#EBB99A] to-[#F4C6D6]",
  },
  {
    id: "s4",
    name: "Soul Reading",
    description: "Deep dive into your soul's journey",
    base_price: 1800,
    variants: [{ id: "v1" }],
    color: "from-[#F4C6D6] to-[#FBE4D5]",
  },
  {
    id: "s5",
    name: "Numerology Reading",
    description: "Your life path, destiny & soul number decoded",
    base_price: 999,
    variants: [{ id: "v1" }, { id: "v2" }],
    color: "from-[#C8B6E2] to-[#E6DDF1]",
  },
  {
    id: "s6",
    name: "Energy Healing Session",
    description: "Chakra balancing · energy clearing · alignment",
    base_price: 1500,
    variants: [{ id: "v1" }, { id: "v2" }, { id: "v3" }],
    color: "from-[#6B5B95] to-[#C8B6E2]",
  },
];
