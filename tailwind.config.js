/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  corePlugins: {
    // Disable preflight so Tailwind reset doesn't override existing CSS
    preflight: false,
  },
  theme: {
    extend: {
      colors: {
        border:      'var(--ds-border-default)',
        input:       'var(--ds-border-default)',
        ring:        'var(--ds-accent)',
        background:  'var(--ds-bg-0)',
        foreground:  'var(--ds-text-primary)',
        primary: {
          DEFAULT:    'var(--ds-accent)',
          foreground: '#ffffff',
        },
        secondary: {
          DEFAULT:    'var(--ds-bg-3)',
          foreground: 'var(--ds-text-primary)',
        },
        destructive: {
          DEFAULT:    'var(--ds-danger-red)',
          foreground: '#ffffff',
        },
        muted: {
          DEFAULT:    'var(--ds-bg-4)',
          foreground: 'var(--ds-text-secondary)',
        },
        accent: {
          DEFAULT:    'var(--ds-accent-soft)',
          foreground: 'var(--ds-accent)',
        },
        popover: {
          DEFAULT:    'var(--ds-bg-2)',
          foreground: 'var(--ds-text-primary)',
        },
        card: {
          DEFAULT:    'var(--ds-bg-3)',
          foreground: 'var(--ds-text-primary)',
        },
      },
      borderRadius: {
        lg: 'var(--ds-r-lg)',
        md: 'var(--ds-r-md)',
        sm: 'var(--ds-r-sm)',
      },
    },
  },
  plugins: [],
}
