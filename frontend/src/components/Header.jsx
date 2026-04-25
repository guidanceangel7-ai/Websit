import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import { BRAND } from "../lib/brand";

const NAV = [
  { label: "About", href: "#about" },
  { label: "Services", href: "#services" },
  { label: "Shop", href: "#shop" },
  { label: "Reviews", href: "#testimonials" },
  { label: "FAQ", href: "#faq" },
  { label: "Contact", href: "#contact" },
];

export default function Header({ onBookNow }) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      data-testid="site-header"
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-500 ${
        scrolled
          ? "bg-ivory/85 backdrop-blur-xl border-b border-peach/25 shadow-soft"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-5 sm:px-8 h-[72px] flex items-center justify-between">
        <a
          href="#top"
          className="flex items-center gap-3 group"
          data-testid="header-logo"
        >
          <img
            src={BRAND.logoRound}
            alt="Guidance Angel"
            className="w-11 h-11 rounded-full object-cover ring-1 ring-peach/40 group-hover:ring-peach transition"
          />
          <div className="hidden sm:flex flex-col leading-tight">
            <span className="font-display text-lg italic text-lavender-deep">
              guidance <span className="text-peach-deep not-italic">angel</span>
            </span>
            <span className="text-[10px] tracking-[0.3em] text-lavender-dusty uppercase">
              Tarot · Numerology · Akashic
            </span>
          </div>
        </a>

        <nav className="hidden lg:flex items-center gap-8">
          {NAV.map((item) => (
            <a
              key={item.label}
              href={item.href}
              data-testid={`nav-link-${item.label.toLowerCase()}`}
              className="text-sm text-ink-plum/80 hover:text-lavender-deep transition relative after:content-[''] after:absolute after:left-0 after:-bottom-1 after:w-0 hover:after:w-full after:h-px after:bg-peach after:transition-all"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <button
            data-testid="header-book-now"
            onClick={onBookNow}
            className="hidden sm:inline-flex items-center gap-2 bg-lavender-deep text-ivory rounded-full px-5 py-2.5 text-sm font-medium hover:bg-lavender-deeper transition shadow-[0_4px_20px_rgba(107,91,149,0.25)] hover:scale-[1.02]"
          >
            Book a Reading
          </button>
          <button
            data-testid="mobile-menu-toggle"
            onClick={() => setMobileOpen((o) => !o)}
            className="lg:hidden inline-flex items-center justify-center w-10 h-10 rounded-full bg-white/70 backdrop-blur border border-peach/30 text-lavender-deep"
            aria-label="Open menu"
          >
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="lg:hidden overflow-hidden bg-ivory/95 backdrop-blur-xl border-b border-peach/30"
          >
            <div className="px-6 py-6 flex flex-col gap-4">
              {NAV.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  data-testid={`mobile-nav-${item.label.toLowerCase()}`}
                  onClick={() => setMobileOpen(false)}
                  className="font-display text-2xl text-ink-plum"
                >
                  {item.label}
                </a>
              ))}
              <button
                data-testid="mobile-book-now"
                onClick={() => {
                  setMobileOpen(false);
                  onBookNow?.();
                }}
                className="mt-2 inline-flex justify-center items-center bg-lavender-deep text-ivory rounded-full px-5 py-3 text-sm font-medium"
              >
                Book a Reading
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
