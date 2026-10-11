/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: { 950: '#07070a', 900: '#0c0c10', 800: '#121217', 700: '#18181f', 600: '#22222b', 500: '#2e2e39' },
        accent: { DEFAULT: '#ff7900', soft: '#ff9a3d', dim: '#b35400' },
      },
      fontFamily: {
        sans: ['"Inter"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      boxShadow: {
        panel: '0 10px 30px -12px rgba(0,0,0,0.7)',
        glow: '0 0 0 1px rgba(255,121,0,0.35), 0 8px 30px -8px rgba(255,121,0,0.35)',
      },
      keyframes: {
        pulseRing: { '0%': { transform: 'scale(0.8)', opacity: '0.8' }, '100%': { transform: 'scale(2.2)', opacity: '0' } },
        slideIn: { from: { transform: 'translateX(24px)', opacity: '0' }, to: { transform: 'translateX(0)', opacity: '1' } },
        fadeUp: { from: { transform: 'translateY(8px)', opacity: '0' }, to: { transform: 'translateY(0)', opacity: '1' } },
        scan: { '0%': { transform: 'translateX(-100%)' }, '100%': { transform: 'translateX(100%)' } },
      },
      animation: {
        pulseRing: 'pulseRing 1.6s ease-out infinite',
        slideIn: 'slideIn 0.25s ease-out',
        fadeUp: 'fadeUp 0.35s ease-out both',
        scan: 'scan 1.4s linear infinite',
      },
    },
  },
  plugins: [],
};
