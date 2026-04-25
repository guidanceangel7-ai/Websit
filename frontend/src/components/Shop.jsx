import React, { useEffect, useState } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import { ShoppingBag, ArrowRight, Quote } from "lucide-react";
import { Overline, Star } from "./Decor";
import ShopCheckoutDialog from "./ShopCheckoutDialog";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const FALLBACK_PRODUCTS = [
  { id: "p-crystals", name: "Energised Crystals Set", blurb: "Hand-picked rose quartz, amethyst and citrine — cleansed and charged with reiki.", accent: "from-[#C8B6E2] to-[#E6DDF1]", badge: "Most Loved", price_inr: 1499, in_stock: true },
  { id: "p-candles", name: "Intention Candle", blurb: "Soy wax candle infused with herbs and oils — for love, abundance and clarity rituals.", accent: "from-[#F4C6D6] to-[#FBE4D5]", badge: "Bestseller", price_inr: 799, in_stock: true },
  { id: "p-oils", name: "Healing Oil Blend", blurb: "Sacred 30 ml roll-on blend with crystals and essential oils. Anoint candles, pulse points and altars.", accent: "from-[#EBB99A] to-[#F4C6D6]", badge: "New", price_inr: 999, in_stock: true },
];

export default function Shop() {
  const [products, setProducts] = useState(FALLBACK_PRODUCTS);
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState(null);

  useEffect(() => {
    let alive = true;
    axios
      .get(`${API}/products`)
      .then((r) => {
        if (alive && Array.isArray(r.data) && r.data.length) setProducts(r.data);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const buyNow = (p) => {
    setPicked(p);
    setOpen(true);
  };

  return (
    <section
      id="shop"
      data-testid="shop-section"
      className="relative pt-20 sm:pt-24"
    >
      {/* Top deep-lavender bar */}
      <div aria-hidden="true" className="h-20 sm:h-28 bg-lavender-deep" />

      <div className="max-w-7xl mx-auto px-6 sm:px-12 -mt-12 sm:-mt-20">
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
              <span className="italic text-peach-deep">Wellness</span> Products
            </h2>
            <div className="mt-6 h-1 w-24 rounded-full bg-gradient-to-r from-peach to-blush" />
            <p className="mt-7 text-base sm:text-lg text-ink-plum/75 leading-relaxed max-w-xl">
              Each product is energetically charged and aligned with healing
              frequencies. Buy directly here — orders ship pan-India with
              tracking and a personalised note from Jenika.
            </p>
            <button
              data-testid="shop-cta"
              onClick={() => {
                const inStock = products.find((p) => p.in_stock !== false && p.price_inr);
                if (inStock) buyNow(inStock);
              }}
              className="mt-9 inline-flex items-center gap-2 bg-gradient-to-r from-peach to-peach-deep text-ink-plum rounded-full px-7 py-3.5 text-sm font-semibold hover:from-peach-deep hover:to-peach transition shadow-[0_8px_28px_rgba(217,163,130,0.4)] hover:scale-[1.03]"
            >
              <ShoppingBag size={16} />
              Browse & Buy
              <ArrowRight size={16} />
            </button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="relative"
          >
            <div className="relative rounded-3xl bg-white border border-peach/30 p-8 sm:p-10 shadow-soft">
              <Quote className="absolute top-5 right-6 text-peach/50" size={36} strokeWidth={1.4} />
              <p className="font-display italic text-lg sm:text-xl text-ink-plum/85 leading-relaxed">
                "Every crystal, candle, and oil I create is personally energised
                and aligned. They are not just beautiful objects — they are
                tools for real transformation."
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
          {products.map((p, i) => (
            <motion.div
              key={p.id || p.name}
              data-testid={`shop-product-${p.id || i}`}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.55, delay: i * 0.07 }}
              className="group rounded-3xl bg-white border border-peach/30 overflow-hidden shadow-soft hover:-translate-y-1 hover:shadow-[0_18px_40px_-15px_rgba(107,91,149,0.22)] transition flex flex-col"
            >
              <div
                className={`relative aspect-[5/3] flex items-center justify-center ${p.image_url ? "" : `bg-gradient-to-br ${p.accent || "from-[#C8B6E2] to-[#E6DDF1]"}`}`}
              >
                {p.image_url && (
                  <img
                    src={p.image_url}
                    alt={p.name}
                    className="absolute inset-0 w-full h-full object-cover"
                    loading="lazy"
                  />
                )}
                {!p.image_url && (
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
                )}
                {p.badge && (
                  <div className="absolute top-4 left-4 text-[10px] tracking-[0.28em] uppercase bg-white/90 backdrop-blur text-ink-plum px-3 py-1 rounded-full font-bold z-10">
                    {p.badge}
                  </div>
                )}
                {!p.image_url && (
                  <div className="relative font-display text-3xl sm:text-4xl text-white drop-shadow-[0_2px_8px_rgba(58,46,93,0.3)] italic">
                    {(p.name || "").split(" ")[0]}
                  </div>
                )}
              </div>
              <div className="p-6 flex flex-col flex-1">
                <div className="flex items-baseline justify-between gap-3">
                  <div className="font-display text-xl text-ink-plum">{p.name}</div>
                  {p.price_inr && (
                    <div className="font-display text-lavender-deep text-xl">
                      ₹{p.price_inr.toLocaleString("en-IN")}
                    </div>
                  )}
                </div>
                <p className="mt-2 text-sm text-ink-plum/75 leading-relaxed line-clamp-3">
                  {p.blurb}
                </p>
                <div className="mt-auto pt-5 flex items-center justify-between gap-2">
                  {p.in_stock === false ? (
                    <span className="text-sm text-red-500 font-medium">Sold out</span>
                  ) : p.price_inr ? (
                    <button
                      data-testid={`shop-buy-${p.id}`}
                      onClick={() => buyNow(p)}
                      className="inline-flex items-center gap-2 bg-gradient-to-r from-[#6B5B95] to-[#9B8AC4] text-white rounded-full px-5 py-2.5 text-sm font-medium hover:from-[#5A4C7E] hover:to-[#6B5B95] transition shadow-[0_4px_16px_rgba(107,91,149,0.3)] hover:scale-[1.03]"
                    >
                      <ShoppingBag size={14} /> Buy Now
                    </button>
                  ) : (
                    <span className="text-sm text-ink-plum/60 italic">
                      Price coming soon
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <ShopCheckoutDialog
        open={open}
        onOpenChange={setOpen}
        initialProduct={picked}
      />
    </section>
  );
}
