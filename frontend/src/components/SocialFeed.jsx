/**
 * SocialFeed.jsx — Live Instagram & YouTube grids via Elfsight
 * Elfsight platform.js is already loaded in public/index.html
 * Widget IDs:
 *   Instagram : elfsight-app-cff03e1d-148f-4440-b57c-86b0b2cb2039
 *   YouTube   : elfsight-app-40794bea-bfa8-415d-9de7-ff19b00885d7
 */
import React from "react";
import { Instagram, Youtube } from "lucide-react";

export default function SocialFeed() {
  return (
    <section className="py-20 sm:py-28 bg-gradient-to-b from-[#FBF4E8] to-[#F5EEF8]">
      <div className="max-w-7xl mx-auto px-6 sm:px-12 space-y-20">

        {/* ── Instagram ─────────────────────────────────────────────────── */}
        <div>
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#f09433] via-[#dc2743] to-[#cc2366] flex items-center justify-center flex-shrink-0 shadow-md">
              <Instagram size={18} className="text-white" />
            </div>
            <div>
              <h2 className="font-display text-2xl sm:text-3xl text-[#3A2E5D] leading-tight">
                Follow along on <span className="italic text-[#6B5B95]">Instagram</span>
              </h2>
              <a
                href="https://www.instagram.com/guidance_angel7"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-[#9B8AC4] hover:text-[#6B5B95] transition mt-0.5 inline-block"
              >
                @guidance_angel7
              </a>
            </div>
          </div>

          {/* Elfsight Instagram Feed widget */}
          <div
            className="elfsight-app-cff03e1d-148f-4440-b57c-86b0b2cb2039"
            data-elfsight-app-lazy
          />
        </div>

        {/* ── YouTube ───────────────────────────────────────────────────── */}
        <div>
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-2xl bg-red-600 flex items-center justify-center flex-shrink-0 shadow-md">
              <Youtube size={18} className="text-white" />
            </div>
            <div>
              <h2 className="font-display text-2xl sm:text-3xl text-[#3A2E5D] leading-tight">
                Watch on <span className="italic text-red-500">YouTube</span>
              </h2>
              <p className="text-sm text-[#9B8AC4] mt-0.5">Latest videos from the channel</p>
            </div>
          </div>

          {/* Elfsight YouTube Gallery widget */}
          <div
            className="elfsight-app-40794bea-bfa8-415d-9de7-ff19b00885d7"
            data-elfsight-app-lazy
          />
        </div>

      </div>
    </section>
  );
}
