import React from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

// A small floating star/sparkle SVG used as accent
export function Star({ className = "", size = 14, color = "#EBB99A" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M12 2L13.6 9.2L21 11L13.6 12.8L12 22L10.4 12.8L3 11L10.4 9.2L12 2Z"
        fill={color}
      />
    </svg>
  );
}

// Section eyebrow / overline styled in peach gold
export function Overline({ children, className = "" }) {
  return (
    <span
      className={`inline-flex items-center gap-2 text-xs sm:text-sm tracking-[0.3em] uppercase font-semibold text-peach-deep ${className}`}
    >
      <Star size={10} />
      {children}
      <Star size={10} />
    </span>
  );
}

// Floating sparkle field – decorative
export function SparkleField({ count = 8, className = "" }) {
  const sparkles = Array.from({ length: count });
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
    >
      {sparkles.map((_, i) => {
        const top = Math.random() * 100;
        const left = Math.random() * 100;
        const delay = Math.random() * 4;
        const size = 8 + Math.random() * 14;
        return (
          <motion.div
            key={i}
            className="absolute"
            style={{ top: `${top}%`, left: `${left}%` }}
            animate={{
              y: [0, -16, 0],
              opacity: [0.35, 1, 0.35],
              rotate: [0, 12, 0],
            }}
            transition={{
              duration: 4 + Math.random() * 3,
              repeat: Infinity,
              delay,
              ease: "easeInOut",
            }}
          >
            <Sparkles size={size} className="text-peach" />
          </motion.div>
        );
      })}
    </div>
  );
}

// A divider with stars on either side – used between sections
export function StarDivider({ className = "" }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <span className="h-px flex-1 bg-gradient-to-r from-transparent via-peach to-transparent" />
      <Star size={12} />
      <span className="text-peach-deep text-sm font-display italic">·</span>
      <Star size={16} />
      <span className="text-peach-deep text-sm font-display italic">·</span>
      <Star size={12} />
      <span className="h-px flex-1 bg-gradient-to-l from-transparent via-peach to-transparent" />
    </div>
  );
}
