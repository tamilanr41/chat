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
          DEFAULT: '#ec4899',
          light: '#f472b6',
          dark: '#db2777',
        },
        accent: {
          DEFAULT: '#f472b6',
          light: '#f9a8d4',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'sans-serif'],
        display: ['var(--font-display)', 'serif'],
      },
      backgroundImage: {
        'romantic-gradient': 'linear-gradient(135deg, #db2777 0%, #ec4899 50%, #f472b6 100%)',
        'glass-gradient': 'linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))',
      },
      boxShadow: {
        glow: '0 0 40px rgba(236, 72, 153, 0.4)',
        'glow-pink': '0 0 40px rgba(236, 72, 153, 0.35)',
      },
    },
  },
  plugins: [],
};
