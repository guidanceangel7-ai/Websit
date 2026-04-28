/**
 * SocialFeed.jsx — Instagram (Behold.so live) + YouTube (live backend API)
 */
import React, { useEffect, useState } from "react";
import { Instagram, Youtube, Play, ExternalLink, Loader2 } from "lucide-react";

// Load Behold widget script once
function loadBehold() {
  if (document.querySelector('script[data-behold]')) return;
  const s = document.createElement("script");
  s.type = "module";
  s.src = "https://w.behold.so/widget.js";
  s.setAttribute("data-behold", "1");
  document.head.appendChild(s);
}

const BACKEND = process.env.REACT_APP_BACKEND_URL || "";

// ── YouTube live feed ─────────────────────────────────────────────────────────
function YouTubeFeed() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetch(`${BACKEND}/api/youtube-videos`)
      .then((r) => r.json())
      .then((data) => {
        if (!alive) return;
        const list = data?.videos || [];
        if (list.length === 0 && data?.error) setError(true);
        else setVideos(list);
      })
      .catch(() => { if (alive) setError(true); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="aspect-video rounded-2xl bg-[#C8B6E2]/20 animate-pulse" />
        ))}
      </div>
    );
  }

  if (error || videos.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 rounded-2xl bg-[#F5EEF8] border border-[#C8B6E2]/40">
        <p className="text-sm text-[#9B8AC4]">No videos found. Check back soon.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 min-[430px]:grid-cols-2 sm:grid-cols-3 gap-4">
      {videos.map((v) => (
        <a
          key={v.videoId}
          href={v.link}
          target="_blank"
          rel="noopener noreferrer"
          className="group relative rounded-2xl overflow-hidden border border-[#C8B6E2]/40 shadow-sm hover:shadow-[0_8px_28px_rgba(107,91,149,0.18)] transition-all duration-300 bg-black aspect-video block"
        >
          {v.thumbnail && (
            <img
              src={v.thumbnail}
              alt={v.title}
              loading="lazy"
              className="w-full h-full object-cover opacity-90 group-hover:opacity-70 group-hover:scale-105 transition-all duration-500"
            />
          )}
          {/* Play button overlay */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-red-600 flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform duration-300">
              <Play size={20} className="text-white ml-1" fill="white" />
            </div>
          </div>
          {/* Title bar */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-3 py-3">
            <p className="text-white text-xs font-medium line-clamp-2 leading-snug">{v.title}</p>
          </div>
          {/* External link icon */}
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <ExternalLink size={14} className="text-white drop-shadow" />
          </div>
        </a>
      ))}
    </div>
  );
}

// ── Main SocialFeed ───────────────────────────────────────────────────────────
export default function SocialFeed() {
  // Load Behold script when this section mounts
  useEffect(() => { loadBehold(); }, []);

  return (
    <section className="py-20 sm:py-28 bg-gradient-to-b from-[#FBF4E8] to-[#F5EEF8]">
      <div className="max-w-7xl mx-auto px-6 sm:px-12 space-y-20">

        {/* ── Instagram (Behold.so — live, updates within minutes of posting) ── */}
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
          {/* Behold.so Instagram Feed — live updates */}
          <behold-widget feed-id="CBVkkHbibvJUyagXCT2U"></behold-widget>
        </div>

        {/* ── YouTube (live — fetches latest videos on every page load) ────── */}
        <div>
          <div className="flex items-center justify-between gap-3 mb-8 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-red-600 flex items-center justify-center flex-shrink-0 shadow-md">
                <Youtube size={18} className="text-white" />
              </div>
              <div>
                <h2 className="font-display text-2xl sm:text-3xl text-[#3A2E5D] leading-tight">
                  Watch on <span className="italic text-red-500">YouTube</span>
                </h2>
                <p className="text-sm text-[#9B8AC4] mt-0.5">Latest videos — updates automatically</p>
              </div>
            </div>
            <a
              href={`https://www.youtube.com/channel/${process.env.REACT_APP_YOUTUBE_CHANNEL_ID || ""}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs font-semibold text-red-500 hover:text-red-600 transition border border-red-200 rounded-full px-4 py-2 hover:bg-red-50"
            >
              <Youtube size={13} /> Subscribe
            </a>
          </div>
          <YouTubeFeed />
        </div>

      </div>
    </section>
  );
}
