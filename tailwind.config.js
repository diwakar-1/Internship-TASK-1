/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          900: "#0b0b14",
          800: "#16161f",
          700: "#22222d",
          600: "#2d2d3a",
        },
        brand: {
          50: "#eef2ff",
          100: "#e0e7ff",
          200: "#c7d2fe",
          300: "#a5b4fc",
          400: "#818cf8",
          500: "#6366f1",
          600: "#4f46e5",
          700: "#4338ca",
          800: "#3730a3",
          900: "#312e81",
        },
        glass: {
          start: "#1a1028",
          mid: "#2d1f47",
          end: "#0d0a14",
          light: "#251a3a",
        },
      },
      fontFamily: {
        sans: ["Plus Jakarta Sans", "Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(15, 15, 25, 0.04), 0 4px 16px rgba(15, 15, 25, 0.04)",
        soft: "0 6px 30px rgba(60, 30, 120, 0.08)",
        "card-hover": "0 8px 40px rgba(60, 30, 120, 0.12), 0 2px 8px rgba(15, 15, 25, 0.06)",
        glass: "0 8px 32px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.08)",
        "glass-hover": "0 12px 48px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.12)",
        glow: "0 0 20px rgba(99, 102, 241, 0.15)",
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-out",
        "slide-up": "slideUp 0.35s ease-out",
        "pulse-soft": "pulseSoft 2.4s ease-in-out infinite",
        float: "float 6s ease-in-out infinite",
        shimmer: "shimmer 3s ease-in-out infinite",
        "progress-fill": "progressFill 1s ease-out forwards",
        "spin-slow": "spin 8s linear infinite",
        "border-pulse": "borderPulse 2s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulseSoft: {
          "0%, 100%": { opacity: "0.6" },
          "50%": { opacity: "1" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-12px)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% center" },
          "100%": { backgroundPosition: "200% center" },
        },
        progressFill: {
          "0%": { width: "0%" },
          "100%": { width: "var(--progress-width, 100%)" },
        },
        borderPulse: {
          "0%, 100%": { borderColor: "rgba(239, 68, 68, 0.3)" },
          "50%": { borderColor: "rgba(239, 68, 68, 0.6)" },
        },
      },
      backgroundImage: {
        "glass-gradient": "linear-gradient(135deg, #1a1028 0%, #2d1f47 40%, #0d0a14 100%)",
        "glass-gradient-hover": "linear-gradient(135deg, #221435 0%, #3a2858 40%, #120e1a 100%)",
        "mesh-gradient": "radial-gradient(ellipse at 20% 50%, rgba(99, 102, 241, 0.15) 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, rgba(139, 92, 246, 0.12) 0%, transparent 50%), radial-gradient(ellipse at 40% 80%, rgba(14, 165, 233, 0.08) 0%, transparent 50%)",
      },
    },
  },
  plugins: [],
};