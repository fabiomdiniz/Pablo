import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        spotify: {
          green: "#1DB954",
          black: "#191414",
          dark: "#121212",
          light: "#282828",
          gray: "#B3B3B3",
        },
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "equalizer-1": "equalizer 1.2s ease-in-out infinite",
        "equalizer-2": "equalizer 0.8s ease-in-out infinite 0.2s",
        "equalizer-3": "equalizer 1s ease-in-out infinite 0.4s",
        "equalizer-4": "equalizer 0.9s ease-in-out infinite 0.1s",
        "equalizer-5": "equalizer 1.1s ease-in-out infinite 0.3s",
      },
      keyframes: {
        equalizer: {
          "0%, 100%": { height: "8px" },
          "50%": { height: "32px" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
