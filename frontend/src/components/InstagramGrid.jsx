import React from "react";
import { Instagram } from "lucide-react";
import { Overline } from "./Decor";
import { BRAND } from "../lib/brand";

export default function InstagramGrid() {
  return (
    <section
      id="instagram"
      data-testid="instagram-section"
      className="relative py-20 sm:py-24"
    >
      <div className="max-w-7xl mx-auto px-6 sm:px-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 mb-12">
          <div className="max-w-2xl">
            <Overline>Daily Soul Drops</Overline>

            <h2 className="font-display mt-4 text-4xl sm:text-5xl text-ink-plum leading-[1.08] tracking-tight">
              Follow the magic on{" "}
              <span className="italic text-lavender-deep">Instagram</span>.
            </h2>

            <p className="mt-4 text-base text-ink-plum/75 leading-relaxed">
              Card pulls, mini-scopes, and gentle reminders for souls in
              transition – delivered to your feed twice a week.
            </p>
          </div>

          {/* Instagram Button */}
          <a
            href={BRAND.instagram}
            target="_blank"
            rel="noopener noreferrer"
            className="self-start sm:self-end inline-flex items-center gap-2 bg-white border border-peach/40 text-lavender-deep rounded-full px-6 py-3 text-sm font-medium hover:bg-peach/10 transition"
          >
            <Instagram size={16} /> @guidance_angel7
          </a>
        </div>

        {/* Instagram Widget */}
        <div className="w-full flex justify-center">
          <iframe
            src="https://snapwidget.com/embed/1122620"
            className="snapwidget-widget"
            allowTransparency="true"
            frameBorder="0"
            scrolling="no"
            style={{
              border: "none",
              overflow: "hidden",
              width: "100%",
              maxWidth: "900px",
              height: "500px",
            }}
            title="Instagram Posts"
          ></iframe>
        </div>
      </div>
    </section>
  );
}
