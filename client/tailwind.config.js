/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Uno卡牌色
        'uno-red': '#ef4444',
        'uno-yellow': '#eab308',
        'uno-green': '#22c55e',
        'uno-blue': '#3b82f6',
        'uno-wild': '#1f2937',
        // 主题色
        primary: {
          DEFAULT: '#6366f1',
          dark: '#4f46e5',
        },
        surface: {
          DEFAULT: '#1e293b',
          light: '#334155',
        },
      },
      animation: {
        'pulse-fast': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-short': 'bounce 0.5s infinite',
      },
    },
  },
  plugins: [],
}
