import type { Config } from 'tailwindcss'

export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // App backgrounds
        background: '#FFF8F2',
        surface: '#FFFFFF',
        'surface-dim': '#DFD9D2',
        'surface-container': '#F4EDE6',
        'surface-container-low': '#F9F2EC',
        'surface-container-high': '#EEE7E0',
        'surface-container-highest': '#E8E1DB',

        // Primary blue
        primary: '#004AC6',
        'primary-container': '#2563EB',
        'on-primary': '#FFFFFF',
        'on-primary-container': '#EEEFFF',
        'primary-soft': '#DBEAFE',
        'primary-fixed': '#DBE1FF',
        'primary-fixed-dim': '#B4C5FF',
        'inverse-primary': '#B4C5FF',

        // Secondary/Accent orange
        accent: '#FD761A',
        'accent-dark': '#9D4300',
        'on-accent': '#FFFFFF',

        // Tertiary green
        'tertiary': '#006329',
        'tertiary-container': '#007F36',

        // Semantic status colors
        aman: '#16A34A',
        'aman-soft': '#DCFCE7',
        waspada: '#F59E0B',
        'waspada-soft': '#FEF3C7',
        bahaya: '#DC2626',
        'bahaya-soft': '#FEE2E2',
        info: '#0EA5E9',

        // Error
        error: '#BA1A1A',
        'error-container': '#FFDAD6',
        'on-error': '#FFFFFF',

        // Text
        'text-primary': '#1F2937',
        'text-secondary': '#6B7280',
        'text-muted': '#9CA3AF',
        'on-surface': '#1E1B17',
        'on-surface-variant': '#434655',

        // Surface variants
        'inverse-surface': '#33302C',
        'inverse-on-surface': '#F6F0E9',

        // Borders
        outline: '#737686',
        'outline-variant': '#C3C6D7',
        border: '#E5E7EB',
      },

      fontFamily: {
        display: ['"Nunito Sans"', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
      },

      fontSize: {
        'headline-lg': ['32px', { lineHeight: '38px', fontWeight: '800', letterSpacing: '-0.03em' }],
        'headline-lg-mobile': ['28px', { lineHeight: '34px', fontWeight: '800' }],
        'headline-md': ['24px', { lineHeight: '32px', fontWeight: '800', letterSpacing: '-0.02em' }],
        'headline-sm': ['18px', { lineHeight: '24px', fontWeight: '700' }],
        'amount-lg': ['36px', { lineHeight: '44px', fontWeight: '900', letterSpacing: '-0.04em' }],
        'amount-md': ['20px', { lineHeight: '28px', fontWeight: '800', letterSpacing: '-0.02em' }],
        'body-lg': ['16px', { lineHeight: '24px', fontWeight: '400' }],
        'body-sm': ['14px', { lineHeight: '20px', fontWeight: '400' }],
        'label-caps': ['12px', { lineHeight: '16px', fontWeight: '700', letterSpacing: '0.02em' }],
      },

      borderRadius: {
        'card': '24px',
        'pocket': '32px',
        'pill': '9999px',
        'input': '18px',
      },

      spacing: {
        'xs': '4px',
        'safe': '16px',
        'gutter': '12px',
      },

      maxWidth: {
        'app': '480px',
      },

      boxShadow: {
        'card': '0 2px 8px rgba(0, 74, 198, 0.06)',
        'card-hover': '0 4px 16px rgba(0, 74, 198, 0.1)',
        'nav': '0 -2px 10px rgba(0, 74, 198, 0.08)',
        'sheet': '0 -8px 32px rgba(0, 74, 198, 0.12)',
        'elevated': '0 4px 12px rgba(0, 74, 198, 0.08)',
      },

      animation: {
        'slide-up': 'slideUp 0.3s ease-out',
        'fade-in': 'fadeIn 0.2s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
      },

      keyframes: {
        slideUp: {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
} satisfies Config
