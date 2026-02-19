/** @type {import('tailwindcss').Config} */
import colors from 'tailwindcss/colors';

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // --- GRADIENT PALETTES ---
        teal: colors.teal,     // [NEW] For Instructor Card (Professional/Tech look)
        cyan: colors.cyan,     // [NEW] Matches well with Teal
        sky: colors.sky,
        indigo: colors.indigo,
        violet: colors.violet,
        fuchsia: colors.fuchsia,
        pink: colors.pink,
        rose: colors.rose,
        amber: colors.amber,
        niceOrange: colors.orange,

        // --- YOUR EXISTING COLORS ---
        primary: 'var(--color-primary)', 
        midnight: '#12161F',
        slate: '#1F2531',
        orange: '#F57F17', 
        header: '#1A202C',
        textGrey: '#B0BEC5',
        gridLine: '#2C3340',
        statusGreen: '#00C853',
        statusRed: '#D50000',
        statusYellow: '#FFAB00',
        statusBlue: '#2979FF',
      }
    },
  },
  plugins: [
    require("tailwindcss-animate"),
  ],
}