import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: { "2xl": "1400px" },
    },
    extend: {
      colors: {
        border:      "hsl(var(--border) / <alpha-value>)",
        input:       "hsl(var(--input) / <alpha-value>)",
        ring:        "hsl(var(--ring) / <alpha-value>)",
        background:  "hsl(var(--background) / <alpha-value>)",
        "background-soft": "hsl(var(--background-soft) / <alpha-value>)",
        foreground:  "hsl(var(--foreground) / <alpha-value>)",
        primary: {
          DEFAULT:    "hsl(var(--primary) / <alpha-value>)",
          foreground: "hsl(var(--primary-foreground) / <alpha-value>)",
          light:      "hsl(var(--primary-light) / <alpha-value>)",
          glow:       "hsl(var(--primary-glow) / <alpha-value>)",
        },
        secondary: {
          DEFAULT:    "hsl(var(--secondary) / <alpha-value>)",
          foreground: "hsl(var(--secondary-foreground) / <alpha-value>)",
        },
        destructive: {
          DEFAULT:    "hsl(var(--destructive) / <alpha-value>)",
          foreground: "hsl(var(--destructive-foreground) / <alpha-value>)",
        },
        muted: {
          DEFAULT:    "hsl(var(--muted) / <alpha-value>)",
          foreground: "hsl(var(--muted-foreground) / <alpha-value>)",
        },
        accent: {
          DEFAULT:    "hsl(var(--accent) / <alpha-value>)",
          foreground: "hsl(var(--accent-foreground) / <alpha-value>)",
        },
        popover: {
          DEFAULT:    "hsl(var(--popover) / <alpha-value>)",
          foreground: "hsl(var(--popover-foreground) / <alpha-value>)",
        },
        card: {
          DEFAULT:    "hsl(var(--card) / <alpha-value>)",
          foreground: "hsl(var(--card-foreground) / <alpha-value>)",
        },
        sidebar: {
          DEFAULT:              "hsl(var(--sidebar-background) / <alpha-value>)",
          foreground:           "hsl(var(--sidebar-foreground) / <alpha-value>)",
          primary:              "hsl(var(--sidebar-primary) / <alpha-value>)",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground) / <alpha-value>)",
          accent:               "hsl(var(--sidebar-accent) / <alpha-value>)",
          "accent-foreground":  "hsl(var(--sidebar-accent-foreground) / <alpha-value>)",
          border:               "hsl(var(--sidebar-border) / <alpha-value>)",
          ring:                 "hsl(var(--sidebar-ring) / <alpha-value>)",
        },
        // STRICT Palette - DO NOT INVENT COLORS
        palette: {
          "lightest-beige": "#FBE4D8",  // Lightest Beige
          "beige-soft":     "#DFB6B2",  // Beige Soft
          "light-purple":   "#854F6C",  // Light Purple
          "mid-purple":     "#522B5B",  // Mid Purple
          "dark-purple":    "#2B124C",  // Primary Dark Purple
          "deep-purple":    "#190019",  // Deep Dark Purple
          white:            "#FFFFFF",  // White
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xl: "1rem",
        "2xl": "1.25rem",
        "3xl": "1.5rem",
      },
      fontFamily: {
        sans: ["var(--font-poppins)", "Poppins", "system-ui", "-apple-system", "sans-serif"],
        display: ["var(--font-poppins)", "Poppins", "system-ui", "sans-serif"],
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in-up": {
          from: { opacity: "0", transform: "translateY(24px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to:   { opacity: "1" },
        },
        "slide-in-right": {
          from: { opacity: "0", transform: "translateX(32px)" },
          to:   { opacity: "1", transform: "translateX(0)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%":      { transform: "translateY(-12px)" },
        },
        pulse_glow: {
          "0%, 100%": { boxShadow: "0 0 20px hsl(290 35% 26% / 0.3)" },
          "50%":      { boxShadow: "0 0 40px hsl(290 35% 26% / 0.6)" },
        },
        shimmer: {
          "0%":   { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition:  "200% 0" },
        },
        sweep: {
          "0%":   { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(300%)" },
        },
      },
      animation: {
        "accordion-down":  "accordion-down 0.2s ease-out",
        "accordion-up":    "accordion-up 0.2s ease-out",
        "fade-in-up":      "fade-in-up 0.6s ease-out forwards",
        "fade-in":         "fade-in 0.5s ease-out forwards",
        "slide-in-right":  "slide-in-right 0.6s ease-out forwards",
        float:             "float 4s ease-in-out infinite",
        pulse_glow:        "pulse_glow 3s ease-in-out infinite",
        shimmer:           "shimmer 2.5s linear infinite",
        sweep:             "sweep 1s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
