/**
 * PromoBanner.jsx
 * Fetches active promotions from /api/promotions/active and shows a
 * dismissible top banner. Sets --banner-h CSS variable so the fixed
 * Header automatically shifts down the correct amount.
 */
import React, { useEffect, useRef, useState } from "react";
import { X, Sparkles } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function PromoBanner() {
  const [promo,     setPromo]     = useState(null);
  const [dismissed, setDismissed] = useState(false);
  const bannerRef = useRef(null);

  // Fetch active promotions on mount
  useEffect(() => {
    fetch(`${API}/promotions/active`)
      .then((r) => r.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        // Pick the first one that has a banner_text
        const active = list.find((p) => p.show_banner && p.banner_text);
        if (active) setPromo(active);
      })
      .catch(() => {});
  }, []);

  // Update --banner-h CSS variable whenever banner shows/hides/resizes
  useEffect(() => {
    const el = bannerRef.current;
    const root = document.documentElement;

    if (!el || dismissed || !promo) {
      root.style.setProperty("--banner-h", "0px");
      return;
    }

    const update = () => {
      root.style.setProperty("--banner-h", `${el.offsetHeight}px`);
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      ro.disconnect();
      root.style.setProperty("--banner-h", "0px");
    };
  }, [promo, dismissed]);

  if (!promo || dismissed) return null;

  const isPercent = promo.discount_type === "percent";
  const discountLabel = isPercent
    ? `${promo.discount_value}% OFF`
    : `₹${promo.discount_value} OFF`;

  return (
    <div
      ref={bannerRef}
      className="fixed inset-x-0 top-0 z-[60] bg-gradient-to-r from-[#3A2E5D] via-[#6B5B95] to-[#3A2E5D] text-white px-4 py-2.5"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-center gap-2 text-center relative">
        <Sparkles size={13} className="text-[#EBB99A] flex-shrink-0" />

        <p className="text-xs sm:text-sm font-medium leading-snug">
          {promo.banner_text}
          {promo.code && (
            <span className="ml-2 inline-block bg-[#EBB99A] text-[#3A2E5D] font-bold text-[11px] tracking-widest uppercase px-2.5 py-0.5 rounded-full">
              {promo.code}
            </span>
          )}
          {promo.discount_value && (
            <span className="ml-2 font-bold text-[#EBB99A]">{discountLabel}</span>
          )}
        </p>

        <Sparkles size={13} className="text-[#EBB99A] flex-shrink-0" />

        {/* Dismiss */}
        <button
          onClick={() => setDismissed(true)}
          aria-label="Dismiss banner"
          className="absolute right-0 p-1 rounded-full hover:bg-white/20 transition flex-shrink-0"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
