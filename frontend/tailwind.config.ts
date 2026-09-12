import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: 'var(--color-bg)',
        surface: 'var(--color-surface)',
        border: 'var(--color-border)',
        'text-primary': 'var(--color-text-primary)',
        'text-secondary': 'var(--color-text-secondary)',
        'risk-low': {
          DEFAULT: 'var(--color-risk-low)',
          bg: 'var(--color-risk-low-bg)',
        },
        'risk-medium': {
          DEFAULT: 'var(--color-risk-medium)',
          bg: 'var(--color-risk-medium-bg)',
        },
        'risk-high': {
          DEFAULT: 'var(--color-risk-high)',
          bg: 'var(--color-risk-high-bg)',
        },
      },
      borderRadius: {
        card: 'var(--radius-card)',
        control: 'var(--radius-control)',
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [],
};

export default config;
