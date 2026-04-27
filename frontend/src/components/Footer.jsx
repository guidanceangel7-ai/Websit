import React from "react";
import { BRAND } from "../lib/brand";
import { Instagram, MessageCircle, Mail, Heart } from "lucide-react";

const QUICK_LINKS = [
  { label: "About",        id: "about"        },
  { label: "Services",     id: "services"     },
  { label: "Testimonials", id: "testimonials" },
  { label: "FAQ",          id: "faq"          },
  { label: "Contact",      id: "contact"      },
];

function scrollTo(id) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}

export default function Footer() {
  return (
    <footer
      data-testid="site-footer"
      className="relative bg-ivory-deep/60 border-t border-peach/30 py-14"
    >
      <div className="max-w-7xl mx-auto px-6 sm:px-12 grid md:grid-cols-3 gap-10">
        <div>
          <div className="flex items-center gap-3">
            <img
              src={BRAND.logoRound}
              alt="Guidance Angel"
              className="w-12 h-12 rounded-full object-cover ring-1 ring-peach/40"
            />
            <div>
              <div className="font-display italic text-xl text-lavender-deep">
                guidance{" "}
                <span className="text-peach-deep not-italic">angel</span>
              </div>
              <div className="text-[10px] tracking-[0.3em] uppercase text-lavender-dusty">
                Tarot · Numerology · Akashic
              </div>
            </div>
          </div>
          <p className="mt-5 text-sm text-ink-plum/70 max-w-xs leading-relaxed">
            Sacred guidance with a sister's heart. {BRAND.yearsExperience}+
            years of intuitive readings for {BRAND.clientsGuided.toLocaleString()}+
            seekers.
          </p>
        </div>

        <div>
          <div className="font-display text-base text-ink-plum mb-4">Quick Links</div>
          <ul className="space-y-2 text-sm">
            {QUICK_LINKS.map(({ label, id }) => (
              <li key={label}>
                <button
                  onClick={() => scrollTo(id)}
                  className="text-ink-plum/70 hover:text-lavender-deep transition text-left"
                >
                  {label}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <div className="font-display text-base text-ink-plum mb-4">Reach Out</div>
          <div className="flex flex-col gap-3 text-sm">
            <a
              href={`https://wa.me/${BRAND.whatsapp}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-ink-plum/75 hover:text-lavender-deep transition"
            >
              <MessageCircle size={14} /> {BRAND.whatsappPretty}
            </a>
            <a
              href={`mailto:${BRAND.email}`}
              className="inline-flex items-center gap-2 text-ink-plum/75 hover:text-lavender-deep transition"
            >
              <Mail size={14} /> {BRAND.email}
            </a>
            <a
              href={BRAND.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-ink-plum/75 hover:text-lavender-deep transition"
            >
              <Instagram size={14} /> @guidance_angel7
            </a>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 sm:px-12 mt-12 pt-6 border-t border-peach/20 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-ink-plum/60">
        <div>© {new Date().getFullYear()} Guidance Angel · All rights reserved</div>
        <div className="inline-flex items-center gap-1.5">
          Crafted with <Heart size={12} className="text-peach fill-peach" /> for souls in transition
        </div>
      </div>
    </footer>
  );
}
