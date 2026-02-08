/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // --- NEW DYNAMIC BRAND COLOR ---
        // Automatically swaps between Orange/Blue based on your CSS variable
        primary: 'var(--color-primary)', 

        // --- YOUR EXISTING COLORS ---
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