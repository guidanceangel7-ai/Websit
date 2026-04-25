/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ["./src/**/*.{js,jsx,ts,tsx}", "./public/index.html"],
  theme: {
    extend: {
      colors: {
        ivory: "#FBF4E8",
        "ivory-deep": "#F5EAD6",
        lilac: "#C8B6E2",
        "lavender-soft": "#E6DDF1",
        "lavender-dusty": "#9B8AC4",
        "lavender-deep": "#6B5B95",
        "lavender-deeper": "#5A4C7E",
        "ink-plum": "#3A2E5D",
        peach: "#EBB99A",
        "peach-deep": "#D9A382",
        blush: "#F4C6D6",
        background: "#FBF4E8",
        foreground: "#3A2E5D",
        card: { DEFAULT: "#FFFFFF", foreground: "#3A2E5D" },
        popover: { DEFAULT: "#FFFFFF", foreground: "#3A2E5D" },
        primary: { DEFAULT: "#6B5B95", foreground: "#FBF4E8" },
        secondary: { DEFAULT: "#E6DDF1", foreground: "#3A2E5D" },
        muted: { DEFAULT: "#F5EAD6", foreground: "#6B5B95" },
        accent: { DEFAULT: "#EBB99A", foreground: "#3A2E5D" },
        destructive: { DEFAULT: "#C26B6B", foreground: "#FFFFFF" },
        border: "rgba(235, 185, 154, 0.35)",
        input: "rgba(155, 138, 196, 0.25)",
        ring: "#EBB99A",
      },
      fontFamily: {
        display: ["Lora", "Georgia", "serif"],
        body: ["Poppins", "system-ui", "sans-serif"],
      },
      borderRadius: {
        lg: "1rem",
        md: "0.75rem",
        sm: "0.5rem",
        "2xl": "1.5rem",
        "3xl": "2rem",
      },
      boxShadow: {
        soft: "0 8px 32px rgba(107, 91, 149, 0.08)",
        glow: "0 4px 24px rgba(235, 185, 154, 0.35)",
        ring: "0 0 0 4px rgba(235, 185, 154, 0.25)",
      },
      keyframes: {
        "accordion-down": { from: { height: "0" }, to: { height: "var(--radix-accordion-content-height)" } },
        "accordion-up": { from: { height: "var(--radix-accordion-content-height)" }, to: { height: "0" } },
        "float-slow": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-12px)" },
        },
        "twinkle": {
          "0%, 100%": { opacity: "0.4", transform: "scale(1)" },
          "50%": { opacity: "1", transform: "scale(1.15)" },
        },
        "shimmer": {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "float-slow": "float-slow 6s ease-in-out infinite",
        "twinkle": "twinkle 3s ease-in-out infinite",
        "shimmer": "shimmer 8s linear infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
