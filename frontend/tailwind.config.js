/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Clinical White Theme Semantic Colors
        brand: {
          navy: '#17365D',
          blue: '#2563EB',
          'blue-light': '#EAF2FF',
          bg: '#F7F9FC',
          card: '#FFFFFF',
          text: '#172B4D',
          muted: '#64748B',
          border: '#E5EAF1',
          success: '#15803D',
          warning: '#D97706',
          danger: '#DC2626',
          subtle: '#F1F5F9',
        },
        navy: {
          950: '#060B14',
          900: '#17365D', // Remap dark navy to brand navy for seamless compatibility
          850: '#1e3a63',
          800: '#234676',
          750: '#2d548b',
          700: '#E5EAF1', // border tone
          600: '#64748B',
          500: '#64748B',
          400: '#64748B',
          300: '#94A3B8',
          200: '#CBD5E1',
          100: '#F1F5F9',
        },
        biochem: {
          normal: '#15803D',
          low: '#2563EB',
          high: '#D97706',
          critical: '#DC2626',
          neutral: '#64748B',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
      },
      boxShadow: {
        subtle: '0 1px 3px 0 rgba(0, 0, 0, 0.04), 0 1px 2px -1px rgba(0, 0, 0, 0.04)',
        card: '0 1px 3px 0 rgba(17, 24, 39, 0.05), 0 1px 2px -1px rgba(17, 24, 39, 0.05)',
      },
    },
  },
  plugins: [],
};
