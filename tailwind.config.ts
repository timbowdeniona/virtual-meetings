import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './pages/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: '#0b0f1a',
          50: '#101624',
          100: '#0b0f1a',
          900: '#05070c',
        }
      },
      boxShadow: {
        soft: '0 10px 25px 0 rgba(0,0,0,0.35)'
      }
    },
  },
  plugins: [],
}
export default config
