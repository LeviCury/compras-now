/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        minerva: {
          DEFAULT: '#e34852', // Minerva red oficial
          dark: '#b03742',
          light: '#ed6e76',
        },
        // Paleta corporativa Minerva - azuis
        navy: {
          DEFAULT: '#2e5371',
          deep: '#172a39',
          muted: '#2c3d4c',
          bright: '#145a86',
        },
        // Paleta corporativa Minerva - amarelos/bege
        sand: {
          DEFAULT: '#afae89',
          light: '#cdcca8',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
        display: ['Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        bignumber: ['6rem', { lineHeight: '1', letterSpacing: '-0.04em', fontWeight: '700' }],
        kilonumber: ['4rem', { lineHeight: '1', letterSpacing: '-0.03em', fontWeight: '700' }],
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
        shimmer: 'shimmer 2s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      boxShadow: {
        card: '0 1px 2px rgba(23, 42, 57, 0.04), 0 1px 3px rgba(23, 42, 57, 0.06)',
        glow: '0 0 0 1px rgba(227, 72, 82, 0.25)',
      },
    },
  },
  plugins: [],
};
