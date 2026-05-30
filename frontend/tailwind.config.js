/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // NCRTC Brand Colors
        primary: {
          50:  "#eff6ff",
          100: "#dbeafe",
          500: "#1e40af",  // NCRTC blue
          600: "#1d4ed8",
          700: "#1e3a8a",
          900: "#0f172a",
        },
        // Severity colors for incidents
        severity: {
          p1: "#dc2626",   // Red — critical
          p2: "#d97706",   // Amber — high
          p3: "#16a34a",   // Green — normal
        },
        // Status colors
        status: {
          open:        "#6b7280",
          acknowledged: "#2563eb",
          in_progress: "#d97706",
          resolved:    "#16a34a",
          closed:      "#374151",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
    },
  },
  plugins: [],
};
