import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#141414",
        field: "#f7f5ef",
        line: "#e6e0d4",
        table: "#2f7f67",
        felt: "#fff8d7",
        accent: "#ffcc00",
        accentText: "#8a5a00"
      }
    }
  },
  plugins: []
};

export default config;
