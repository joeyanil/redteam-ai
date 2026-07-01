import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        neon: {
          green: '#00ff9f',
          cyan: '#00e5ff',
          purple: '#bf00ff',
          red: '#ff003c',
          amber: '#ffaa00',
        },
        dark: {
          base: '#0a0a0f',
          panel: '#0f0f1a',
          border: '#1a1a2e',
          hover: '#16213e',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      boxShadow: {
        'neon-green': '0 0 10px #00ff9f, 0 0 20px #00ff9f40',
        'neon-cyan':  '0 0 10px #00e5ff, 0 0 20px #00e5ff40',
        'neon-purple':'0 0 10px #bf00ff, 0 0 20px #bf00ff40',
      },
      keyframes: {
        flicker: {
          '0%, 100%': { opacity: '1' },
          '50%':       { opacity: '0.85' },
        },
      },
      animation: {
        flicker: 'flicker 3s infinite',
      },
    },
  },
  plugins: [],
} satisfies Config
