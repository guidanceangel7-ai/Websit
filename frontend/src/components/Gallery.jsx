import React from "react";
import { motion } from "framer-motion";
import { Overline } from "./Decor";
import { GALLERY } from "../lib/brand";

export default function Gallery() {
  return (
    <section
      id="featured"
      data-testid="gallery-section"
      className="relative py-20 sm:py-24 bg-gradient-to-b from-ivory-deep/40 via-ivory to-ivory"
    >
      <div className="max-w-7xl mx-auto px-6 sm:px-12">
        <div className="max-w-3xl">
          <Overline>Featured & In Practice</Overline>
          <h2
            data-testid="gallery-heading"
            className="font-display mt-4 text-4xl sm:text-5xl text-ink-plum leading-[1.08] tracking-tight"
          >
            From sacred desk to{" "}
            <span className="italic text-lavender-deep">main stage</span>.
          </h2>
          <p className="mt-5 text-base sm:text-lg text-ink-plum/75 leading-relaxed">
            Whether seated across from a single seeker or speaking to halls of
            hundreds, Jenika holds the same warmth and clarity.
          </p>
        </div>

        <div className="mt-12 grid md:grid-cols-3 gap-5">
          {GALLERY.map((g, i) => (
            <motion.figure
              key={g.src}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.6, delay: i * 0.08 }}
              className={`relative overflow-hidden rounded-3xl border border-peach/30 shadow-soft group ${
                i === 0 ? "md:col-span-1" : ""
              }`}
            >
              <div className="aspect-[4/5] overflow-hidden">
                <img
                  src={g.src}
                  alt={g.label}
                  className="w-full h-full object-cover transition duration-700 group-hover:scale-[1.04]"
                  loading="lazy"
                />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-ink-plum/70 via-ink-plum/10 to-transparent opacity-90" />
              <figcaption className="absolute bottom-0 inset-x-0 p-5 text-ivory">
                <div className="text-[10px] tracking-[0.3em] uppercase text-peach">
                  {g.label}
                </div>
                <div className="font-display text-lg sm:text-xl mt-1 leading-snug">
                  {g.caption}
                </div>
              </figcaption>
            </motion.figure>
          ))}
        </div>
      </div>
    </section>
  );
}
