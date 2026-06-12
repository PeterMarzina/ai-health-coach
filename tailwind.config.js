/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.js", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        background: "#0A0A0A", // near-black background
        surface: "#161616", // input / card background
        "surface-deep": "#141414", // darker card variant
        line: "#2A2A2A", // subtle border
        "line-deep": "#242424", // darker border variant
        accent: "#4ADE80", // neon green accent
        "accent-dim": "#1A3A26",
        muted: "#888888", // secondary text
        "muted-dim": "#444444",
        danger: "#F87171",
      },
    },
  },
  plugins: [],
};