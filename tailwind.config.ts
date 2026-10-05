import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#ffffff",
        panel: "#ffffff",
        panel2: "#f3f4f6",
        line: "#e7e7ea",
        cream: "#111111",
        mist: "#6b7280",
        copper: "#5b4dff",
        sage: "#1f9d72",
      },
      fontFamily: {
        serif: ["var(--font-sans)", "system-ui", "sans-serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 16px 40px rgba(17, 17, 17, 0.08)",
      },
    },
  },
  plugins: [],
};

export default config;
