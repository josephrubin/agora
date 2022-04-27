/* eslint-disable */
const defaultTheme = require("tailwindcss/defaultTheme");

module.exports = {
  content: ["./app/**/*.{ts,tsx,jsx,js}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Proxima Nova", ...defaultTheme.fontFamily.sans],
      },
      gridTemplateColumns: ({ theme }) => ({
        ...Object.fromEntries(
          Object.entries(theme("width")).map(([k, v]) => [
            `fill-${k}`,
            `repeat(auto-fill, minmax(${v}, 1fr))`,
          ])
        ),
      }),
    },
  },
  plugins: [],
};
