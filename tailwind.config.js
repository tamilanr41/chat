/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: '#000000',
          card: '#0a0f1a',
        },
        primary: {
          DEFAULT: '#ff5d8f',
          light: '#ff8fb1',
          dark: '#c2386a',
        },
        accent: {
          DEFAULT: '#a78bfa',
          light: '#c4b5fd',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'sans-serif'],
        display: ['var(--font-display)', 'serif'],
      },
      backgroundImage: {
        'romantic-gradient': 'linear-gradient(135deg, #ff5d8f 0%, #a78bfa 50%, #6366f1 100%)',
        'glass-gradient': 'linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))',
      },
      boxShadow: {
        glow: '0 0 40px rgba(255, 93, 143, 0.35)',
      },
    },
  },
  plugins: [],
};
