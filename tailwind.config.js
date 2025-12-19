import defaultTheme from 'tailwindcss/defaultTheme'

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    colors: {
      ...defaultTheme.colors,
      brand: {
        DEFAULT: '#FD3101',
        dark: '#E92C00',
        light: '#FF5027',
        soft: '#FFE6DC',
      },
      slate: {
        50: '#FBFBFB',
        100: '#F7F7F7',
        200: '#E8E8E8',
        300: '#DADADA',
        400: '#C3C3C3',
        500: '#888888',
        600: '#444444',
        700: '#333333',
        800: '#2A2A2A',
        900: '#222222',
        950: '#111111',
      },
    },
    extend: {
      fontFamily: {
        sans: ['Poppins', 'Open Sans', ...defaultTheme.fontFamily.sans],
      },
    },
  },
  plugins: [],
}
