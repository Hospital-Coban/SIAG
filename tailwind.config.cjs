/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/renderer/index.html',
    './src/renderer/src/**/*.{js,jsx}'
  ],
  theme: {
    extend: {}
  },
  plugins: [require('daisyui')],
  daisyui: {
    darkTheme: 'dark',
    themes: [
      {
        light: {
          primary: '#2563EB',
          'primary-content': '#FFFFFF',
          secondary: '#DBEAFE',
          'secondary-content': '#1D4ED8',
          accent: '#1D4ED8',
          'accent-content': '#FFFFFF',
          neutral: '#64748B',
          'neutral-content': '#0F172A',
          info: '#DBEAFE',
          'info-content': '#1E3A8A',
          success: '#36d399',
          'success-content': '#0A3B2E',
          warning: '#fbbd23',
          'warning-content': '#3B2000',
          error: '#f87272',
          'error-content': '#450A0A',
          'base-100': '#FFFFFF',
          'base-200': '#EFF6FF',
          'base-300': '#F8FAFC',
          'base-content': '#0F172A'
        }
      },
      {
        dark: {
          primary: '#3B82F6',
          'primary-content': '#FFFFFF',
          secondary: '#1E3A8A',
          'secondary-content': '#DBEAFE',
          accent: '#60A5FA',
          'accent-content': '#F8FAFC',
          neutral: '#94A3B8',
          'neutral-content': '#0B1120',
          info: '#1E3A8A',
          'info-content': '#DBEAFE',
          success: '#36d399',
          'success-content': '#0A3B2E',
          warning: '#fbbd23',
          'warning-content': '#3B2000',
          error: '#f87272',
          'error-content': '#450A0A',
          'base-100': '#1E293B',
          'base-200': '#111827',
          'base-300': '#0B1120',
          'base-content': '#F8FAFC'
        }
      }
    ]
  }
}
