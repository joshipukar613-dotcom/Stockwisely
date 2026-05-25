/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#4F46E5', // indigo-600
          secondary: '#0EA5E9', // sky-500
          accent: '#22C55E', // emerald-500
        },
        chart: {
          indigo: '#4F46E5',
          sky: '#0EA5E9',
          emerald: '#10B981',
          amber: '#F59E0B',
          rose: '#F43F5E',
          violet: '#8B5CF6',
          slate: '#64748B',
        },
      },
    },
  },
  plugins: [],
};
