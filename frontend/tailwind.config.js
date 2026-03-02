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
          bg: '#f8fafc',
          surface: '#ffffff',
          border: '#e2e8f0',
          muted: '#94a3b8',
          accent: '#6366f1',
        },
        sud: {
          0: '#22c55e',
          1: '#4ade80',
          2: '#86efac',
          3: '#fde047',
          4: '#facc15',
          5: '#f59e0b',
          6: '#f97316',
          7: '#ef4444',
          8: '#dc2626',
          9: '#b91c1c',
          10: '#991b1b',
        },
        voc: {
          1: '#ef4444',
          2: '#f97316',
          3: '#f59e0b',
          4: '#a3a3a3',
          5: '#86efac',
          6: '#4ade80',
          7: '#22c55e',
        },
      },
      fontFamily: {
        therapy: ['Inter', 'system-ui', 'sans-serif'],
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
