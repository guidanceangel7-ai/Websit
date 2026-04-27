import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Headphones,
  BookOpen,
  Star,
  Zap,
  Heart,
  Moon,
  Layers,
} from "lucide-react";
import { Overline, StarDivider } from "./Decor";

/* ── Icon helper ─────────────────────────────────────────────────────── */
function getIcon(name = "") {
  const n = name.toLowerCase();
  if (n.includes("call") || n.includes("live"))      return Zap;
  if (n.includes("voice") || n.includes("audio"))    return Headphones;
  if (n.includes("akashic") || n.includes("record")) return BookOpen;
  if (n.includes("soul") || n.includes("healing"))   return Heart;
  if (n.includes("numerology"))                       return Star;
  if (n.includes("tarot"))                            return Moon;
  return Sparkles;
}

/* ── Category gradients ──────────────────────────────────────────────── */
const CAT_GRADIENTS = [
  "from-[#6B5B95] to-[#9B8AC4]",
  "from-[#EBB99A] to-[#F4C6D6]",
  "from-[#9B8AC4] to-[#C8B6E2]",
  "from-[#C8B6E2] to-[#E6DDF1]",
  "from-[#F4C6D6] to-[#FBE4D5]",
  "from-[#6B5B95] to-[#C8B6E2]",
];

/* ── Service card gradients ──────────────────────────────────────────── */
const SVC_GRADIENTS = [
  "from-[#6B5B95] to-[#9B8AC4]",
  "from-[#9B8AC4] to-[#C8B6E2]",
  "from-[#EBB99A] to-[#F4C6D6]",
  "from-[#F4C6D6] to-[#FBE4D5]",
  "from-[#C8B6E2] to-[#E6DDF1]",
  "from-[#6B5B95] to-[#C8B6E2]",
];

/* ─────────────────────────────────────────────────────────────────────
   CategoryCard — shown in step 1
────────────────────────────────────────────────────────────────────── */
function CategoryCard({ category, gradient, index, onClick }) {
  const Icon = getIcon(category.name);
  const svcCount = (category.services || []).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, delay: index * 0.08 }}
      onClick={onClick}
      className="group cursor-pointer rounded-3xl overflow-hidden border border-[#C8B6E2]/30 bg-white shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex flex-col"
    >
      {/* Gradient header */}
      <div className={`relative bg-gradient-to-br ${gradient} px-6 pt-6 pb-8`}>
        {svcCount > 0 && (
          <div className="absolute top-4 right-4 bg-white/20 backdrop-blur text-white text-[11px] font-bold px-3 py-1 rounded-full tracking-wide">
            {svcCount} {svcCount === 1 ? "SERVICE" : "SERVICES"}
          </div>
        )}
        <div className="w-11 h-11 rounded-2xl bg-white/25 flex items-center justify-center mb-4">
          <Icon size={20} className="text-white" />
        </div>
        <h3 className="font-display text-white text-xl leading-snug pr-4">
          {category.name}
        </h3>
      </div>

      {/* Card body */}
      <div className="px-6 py-5 flex-1 flex flex-col justify-between gap-4">
        {category.description && (
          <p className="text-sm text-[#6B5B95]/80 leading-relaxed">
            {category.description}
          </p>
        )}

        <div className="flex items-center justify-between mt-auto">
          <span className="text-xs font-semibold text-[#6B5B95] uppercase tracking-widest">
            View services →
          </span>
          <div className="w-8 h-8 rounded-full bg-[#E6DDF1] group-hover:bg-[#6B5B95] flex items-center justify-center transition-colors duration-200">
            <ArrowRight size={14} className="text-[#6B5B95] group-hover:text-white transition-colors duration-200" />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────────────────
   ServiceCard — shown in step 2
────────────────────────────────────────────────────────────────────── */
function ServiceCard({ service, gradient, index, onBook }) {
  const Icon      = getIcon(service.name);
  const minPrice  = service.base_price || service.price || service.min_price;
  const variants  = service.variants || [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.07 }}
      className="group cursor-pointer rounded-3xl overflow-hidden border border-[#C8B6E2]/30 bg-white shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex flex-col"
      onClick={() => onBook && onBook(service)}
    >
      {/* Gradient header */}
      <div className={`relative bg-gradient-to-br ${gradient} px-6 pt-6 pb-8`}>
        {minPrice && (
          <div className="absolute top-4 right-4 bg-white/20 backdrop-blur text-white text-[11px] font-bold px-3 py-1 rounded-full tracking-wide">
            FROM ₹{Number(minPrice).toLocaleString("en-IN")}
          </div>
        )}
        <div className="w-11 h-11 rounded-2xl bg-white/25 flex items-center justify-center mb-4">
          <Icon size={20} className="text-white" />
        </div>
        <h3 className="font-display text-white text-lg leading-snug pr-4">
          {service.name}
        </h3>
      </div>

      {/* Card body */}
      <div className="px-6 py-5 flex-1 flex flex-col justify-between gap-4">
        {(service.description || service.tagline) && (
          <p className="text-sm text-[#6B5B95]/80 leading-relaxed">
            {service.description || service.tagline}
          </p>
        )}

        <button
          onClick={(e) => { e.stopPropagation(); onBook && onBook(service); }}
          className="flex items-center justify-between w-full group/btn mt-auto"
        >
          <span className="text-xs font-semibold text-[#6B5B95] uppercase tracking-widest">
            {variants.length > 0
              ? `${variants.length} VARIANT${variants.length > 1 ? "S" : ""} →`
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

/* ─────────────────────────────────────────────────────────────────────
   Main Services component
────────────────────────────────────────────────────────────────────── */
export default function Services({ categories = [], onBookNow }) {
  const [selectedCat, setSelectedCat] = useState(null);

  /* Build display categories — from API or static fallback */
  const displayCategories = React.useMemo(() => {
    if (categories.length > 0) return categories;
    return STATIC_CATEGORIES;
  }, [categories]);

  const activeCat = selectedCat
    ? displayCategories.find((c) => c.id === selectedCat || c.name === selectedCat)
    : null;

  const activeServices = activeCat?.services || [];

  return (
    <section
      id="services"
      data-testid="services-section"
      className="relative py-20 sm:py-28 bg-gradient-to-b from-[#F5EEF8] via-[#FBF4E8] to-[#F5EEF8] overflow-hidden"
    >
      {/* Background blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 right-0 w-96 h-96 rounded-full bg-[#C8B6E2]/20 blur-3xl" />
        <div className="absolute bottom-0 -left-20 w-80 h-80 rounded-full bg-[#EBB99A]/15 blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto px-6 sm:px-12">

        {/* ── Heading ─────────────────────────────────────────────── */}
        <div className="text-center max-w-2xl mx-auto mb-14">
          <Overline>Sacred Offerings</Overline>

          <AnimatePresence mode="wait">
            {!activeCat ? (
              <motion.div
                key="cat-heading"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3 }}
              >
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
              </motion.div>
            ) : (
              <motion.div
                key="svc-heading"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3 }}
              >
                <h2
                  data-testid="services-heading"
                  className="font-display mt-4 text-4xl sm:text-5xl text-[#3A2E5D] leading-[1.08] tracking-tight"
                >
                  {activeCat.name}
                </h2>
                <StarDivider className="mt-5" />
                <p className="mt-4 text-[#6B5B95]/80 text-base leading-relaxed">
                  {activeCat.description || "Select a session that resonates with your soul."}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Back button (step 2 only) ───────────────────────────── */}
        <AnimatePresence>
          {activeCat && (
            <motion.div
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.25 }}
              className="mb-8"
            >
              <button
                onClick={() => setSelectedCat(null)}
                className="inline-flex items-center gap-2 text-sm font-semibold text-[#6B5B95] hover:text-[#3A2E5D] transition-colors"
              >
                <ArrowLeft size={16} />
                Back to all categories
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Grid ─────────────────────────────────────────────────── */}
        <AnimatePresence mode="wait">
          {!activeCat ? (
            /* Step 1: Category cards */
            <motion.div
              key="categories"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {displayCategories.map((cat, i) => (
                <CategoryCard
                  key={cat.id || cat.name || i}
                  category={cat}
                  gradient={CAT_GRADIENTS[i % CAT_GRADIENTS.length]}
                  index={i}
                  onClick={() => setSelectedCat(cat.id || cat.name)}
                />
              ))}
            </motion.div>
          ) : (
            /* Step 2: Services within selected category */
            <motion.div
              key={`services-${activeCat.id || activeCat.name}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              {activeServices.length === 0 ? (
                <div className="text-center py-16 text-[#6B5B95]/60">
                  <Layers size={40} className="mx-auto mb-4 opacity-40" />
                  <p>No services listed in this category yet.</p>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {activeServices.map((svc, i) => (
                    <ServiceCard
                      key={svc.id || i}
                      service={svc}
                      gradient={SVC_GRADIENTS[i % SVC_GRADIENTS.length]}
                      index={i}
                      onBook={onBookNow}
                    />
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── CTA ──────────────────────────────────────────────────── */}
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

/* ── Static fallback categories (shown while API loads) ──────────────── */
const STATIC_CATEGORIES = [
  {
    id: "tarot",
    name: "Tarot Reading",
    description: "Clarity and guidance through the wisdom of the cards — live calls or recorded voice notes.",
    services: [
      {
        id: "s1",
        name: "Tarot + Numerology · Call Reading",
        description: "Live 1-on-1 call · clarity in real-time",
        base_price: 2100,
        variants: [{ id: "v1" }, { id: "v2" }, { id: "v3" }],
      },
      {
        id: "s2",
        name: "Tarot + Numerology · Question Reading",
        description: "Recorded voice notes · 48-hour delivery",
        base_price: 550,
        variants: [{ id: "v1" }, { id: "v2" }, { id: "v3" }, { id: "v4" }],
      },
    ],
  },
  {
    id: "akashic",
    name: "Akashic Records",
    description: "Access the cosmic library of your soul — past lives, soul contracts, and life purpose.",
    services: [
      {
        id: "s3",
        name: "Akashic Records Reading",
        description: "Past lives · soul contracts · life purpose",
        base_price: 2500,
        variants: [{ id: "v1" }, { id: "v2" }],
      },
    ],
  },
  {
    id: "numerology",
    name: "Numerology",
    description: "Decode the numbers woven into your birth and name to reveal your soul's blueprint.",
    services: [
      {
        id: "s5",
        name: "Numerology Reading",
        description: "Your life path, destiny & soul number decoded",
        base_price: 999,
        variants: [{ id: "v1" }, { id: "v2" }],
      },
    ],
  },
  {
    id: "soul",
    name: "Soul & Healing",
    description: "Deep soul readings and energy work to clear blocks and realign you with your highest path.",
    services: [
      {
        id: "s4",
        name: "Soul Reading",
        description: "Deep dive into your soul's journey",
        base_price: 1800,
        variants: [{ id: "v1" }],
      },
      {
        id: "s6",
        name: "Energy Healing Session",
        description: "Chakra balancing · energy clearing · alignment",
        base_price: 1500,
        variants: [{ id: "v1" }, { id: "v2" }, { id: "v3" }],
      },
    ],
  },
];
