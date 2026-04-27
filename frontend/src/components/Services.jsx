import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, ArrowRight } from "lucide-react";
import { Overline, StarDivider } from "./Decor";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

/* ── Fallback services shown while API loads or if API is empty ── */
const FALLBACK_SERVICES = [
  {
    id: "tarot-call",
    name: "Tarot + Numerology · Call Reading",
    description: "Live 1-on-1 call · clarity in real-time",
    base_price: 2100,
    icon: "✨",
    color: "from-[#6B5B95] to-[#9B8AC4]",
  },
  {
    id: "tarot-question",
    name: "Tarot + Numerology · Question Reading",
    description: "Recorded voice notes · 48-hour delivery",
    base_price: 550,
    icon: "🎙️",
    color: "from-[#9B8AC4] to-[#C8B6E2]",
  },
  {
    id: "akashic",
    name: "Akashic Records Reading",
    description: "Past lives · soul contracts · life purpose",
    base_price: 2500,
    icon: "📖",
    color: "from-[#EBB99A] to-[#F4C6D6]",
  },
  {
    id: "soul-reading",
    name: "Soul Reading",
    description: "Deep dive into your soul's journey",
    base_price: 1800,
    icon: "🌟",
    color: "from-[#F4C6D6] to-[#FBE4D5]",
  },
  {
    id: "numerology",
    name: "Numerology Reading",
    description: "Your life path, destiny & soul number decoded",
    base_price: 999,
    icon: "🔢",
    color: "from-[#C8B6E2] to-[#E6DDF1]",
  },
  {
    id: "healing",
    name: "Energy Healing Session",
    description: "Chakra balancing · energy clearing · alignment",
    base_price: 1500,
    icon: "💫",
    color: "from-[#6B5B95] to-[#C8B6E2]",
  },
];

function ServiceCard({ service, onBook, index }) {
  const gradClass = service.color || "from-[#6B5B95] to-[#9B8AC4]";
  const price = service.base_price || service.price || service.min_price;

  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, delay: index * 0.08 }}
      className="group bg-white rounded-3xl overflow-hidden border border-[#C8B6E2]/40 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 flex flex-col"
    >
      {/* Colour strip header */}
      <div className={`bg-gradient-to-br ${gradClass} px-6 py-5 relative`}>
        <div className="text-2xl mb-2">{service.icon || "✨"}</div>
        {price && (
          <div className="absolute top-4 right-4 text-xs font-bold text-white/90 bg-white/20 backdrop-blur px-3 py-1 rounded-full">
            FROM ₹{Number(price).toLocaleString("en-IN")}
          </div>
        )}
        <h3 className="font-display text-white text-lg leading-tight">{service.name}</h3>
      </div>

      {/* Body */}
      <div className="px-6 py-5 flex-1 flex flex-col justify-between gap-4">
        <p className="text-sm text-[#6B5B95]/80 leading-relaxed">
          {service.description || service.tagline || ""}
        </p>
        <button
          onClick={() => onBook(service)}
          className="flex items-center justify-between w-full group/btn"
        >
          <span className="text-xs font-semibold text-[#6B5B95] uppercase tracking-wider">
            Book Now
          </span>
          <div className="w-8 h-8 rounded-full bg-[#E6DDF1] group-hover/btn:bg-[#6B5B95] flex items-center justify-center transition-colors">
            <ArrowRight size={14} className="text-[#6B5B95] group-hover/btn:text-white transition-colors" />
          </div>
        </button>
      </div>
    </motion.div>
  );
}

export default function Services({ onBookNow }) {
  const [services, setServices] = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    fetch(`${API}/services`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        setServices(Array.isArray(data) && data.length > 0 ? data : FALLBACK_SERVICES);
        setLoading(false);
      })
      .catch(() => {
        setServices(FALLBACK_SERVICES);
        setLoading(false);
      });
  }, []);

  const displayed = loading ? FALLBACK_SERVICES : services;

  return (
    <section
      id="services"
      data-testid="services-section"
      className="relative py-20 sm:py-28 bg-gradient-to-b from-[#FBF4E8] via-[#F5EEF8] to-[#FBF4E8]"
    >
      {/* Decorative blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-[#C8B6E2]/15 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full bg-[#EBB99A]/15 blur-3xl" />
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

        {/* Services grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayed.map((svc, i) => (
            <ServiceCard
              key={svc.id || i}
              service={svc}
              index={i}
              onBook={onBookNow || (() => {})}
            />
          ))}
        </div>

        {/* CTA */}
        <div className="mt-12 text-center">
          <button
            onClick={() => onBookNow && onBookNow(null)}
            className="inline-flex items-center gap-2 bg-[#3A2E5D] text-white rounded-full px-8 py-3.5 text-sm font-medium hover:bg-[#6B5B95] transition-all duration-200 shadow-[0_4px_20px_rgba(58,46,93,0.25)]"
          >
            <Sparkles size={15} />
            View all services &amp; book
          </button>
        </div>
      </div>
    </section>
  );
}
