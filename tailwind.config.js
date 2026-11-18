/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#09090b', card: '#121215', card2: '#18181c', line: '#27272a', line2: '#3f3f46',
        fg: '#fafafa', muted: '#a1a1aa', faint: '#71717a',
        accent: '#8fa8ff', 'accent-ink': '#0b1026', good: '#4ade80', warn: '#fbbf24', bad: '#f87171',
      },
    },
  },
  plugins: [],
};
