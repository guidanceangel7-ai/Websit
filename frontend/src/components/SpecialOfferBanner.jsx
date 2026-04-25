import React, { useEffect, useState } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const SCOPE_LABELS = {
  site_wide: "Site-wide",
  products_only: "Sacred Shop",
  services_only: "Readings",
  specific: "Special",
};

function bannerCopy(p) {
  if (p.banner_text) return p.banner_text;
  const value =
    p.discount_type === "percent"
      ? `${p.discount_value}% off`
      : `Flat ₹${Number(p.discount_value).toLocaleString("en-IN")} off`;
  const where = SCOPE_LABELS[p.scope] || "everything";
  const codePart = p.code ? ` · use code ${p.code}` : "";
  return `${p.title} — ${value} on ${where}${codePart}`;
}

export default function SpecialOfferBanner() {
  const [promos, setPromos] = useState([]);
  const [dismissed, setDismissed] = useState(false);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    let alive = true;
    axios
      .get(`${API}/promotions/active`)
      .then((r) => {
        if (!alive) return;
        setPromos(Array.isArray(r.data) ? r.data : []);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  // Cycle through multiple promos every 5s
  useEffect(() => {
    if (promos.length <= 1) return;
    const id = setInterval(() => setIdx((i) => (i + 1) % promos.length), 5000);
    return () => clearInterval(id);
  }, [promos.length]);

  if (!promos.length || dismissed) return null;
  const cur = promos[idx % promos.length];

  return (
    <div
      data-testid="special-offer-banner"
      className="relative z-[60] bg-gradient-to-r from-[#6B5B95] via-[#9B8AC4] to-[#6B5B95] text-ivory shadow-[0_4px_18px_rgba(58,46,93,0.25)]"
    >
      <div className="relative max-w-7xl mx-auto px-5 sm:px-8 h-12 sm:h-12 flex items-center gap-3">
        <Sparkles size={14} className="text-[#EBB99A] shrink-0 hidden sm:block" />
        <AnimatePresence mode="wait">
          <motion.div
            key={cur.id || idx}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.4 }}
            className="flex-1 min-w-0 text-center sm:text-left text-xs sm:text-sm tracking-wide truncate"
          >
            <span className="text-[#EBB99A] font-bold tracking-[0.22em] uppercase mr-2 hidden sm:inline">
              ✦ Special Offer
            </span>
            <span className="font-display italic">{bannerCopy(cur)}</span>
          </motion.div>
        </AnimatePresence>
        <button
          onClick={() => setDismissed(true)}
          aria-label="Dismiss offer"
          className="shrink-0 w-7 h-7 rounded-full hover:bg-white/15 inline-flex items-center justify-center"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
