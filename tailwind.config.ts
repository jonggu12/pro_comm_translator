import type { Config } from "tailwindcss"

export default {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./pages/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#111827",
          soft: "#1f2937",
          accent: "#2563eb",
        },
      },
    },
  },
  plugins: [],
} satisfies Config
