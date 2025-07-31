/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        },
        therapy: {
          calm: '#e0f2fe',
          focus: '#0ea5e9',
          alert: '#ef4444',
          safe: '#22c55e',
        },
      },
      animation: {
        'bilateral-horizontal': 'bilateral-horizontal 2s infinite ease-in-out',
        'bilateral-vertical': 'bilateral-vertical 2s infinite ease-in-out',
        'pulse-slow': 'pulse 3s infinite',
      },
      keyframes: {
        'bilateral-horizontal': {
          '0%': { transform: 'translateX(-50px)' },
          '50%': { transform: 'translateX(50px)' },
          '100%': { transform: 'translateX(-50px)' },
        },
        'bilateral-vertical': {
          '0%': { transform: 'translateY(-30px)' },
          '50%': { transform: 'translateY(30px)' },
          '100%': { transform: 'translateY(-30px)' },
        },
      },
    },
  },
  plugins: [],
};
