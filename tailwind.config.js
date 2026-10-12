/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./*.html", "./pages/*.html", "./js/**/*.js"],
  theme: {
    extend: {
      colors: {
        "c-bg": "#FDF8F5",
        "c-white": "#FFFFFF",
        "c-accent": "#B5445C",
        "c-accent-d": "#CF6278",
        "c-rose": "#F2B8C8",
        "c-champagne": "#FAF2F5",
        "c-text": "#2D2D2D",
        "c-soft": "#7B4D5E",
        "c-border": "#F5E8EF",
        "c-surface": "#FDF8F5",
      },
      fontFamily: {
        display: ["Playfair Display", "serif"],
        body: ["Nunito", "sans-serif"],
      },
    },
  },
};
