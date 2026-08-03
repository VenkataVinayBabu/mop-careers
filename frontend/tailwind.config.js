/** MOP Careers brand palette. */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#0B1E46', // primary
          50: '#F2F5FA',
          100: '#E3E9F3',
          200: '#C3CFE3',
          300: '#95A8CB',
          400: '#5D77A9',
          // 500 was originally missing from this ramp, which silently broke every
          // `text-navy-500` in the app — the class simply didn't exist, so no
          // colour was applied and the text inherited whatever was around it.
          500: '#35507F',
          600: '#0E2757',
          700: '#0B1E46',
          800: '#081736',
          900: '#050F24',
        },
        teal: {
          DEFAULT: '#00989D', // secondary
          50: '#EAFAFA',
          100: '#CDF2F3',
          200: '#9BE5E7',
          300: '#5CD2D6',
          400: '#1FB4BA',
          500: '#00989D',
          600: '#00898E',
          700: '#00676B',
        },
        orange: {
          DEFAULT: '#EE5905', // CTAs
          50: '#FFF3EC',
          100: '#FFE2D2',
          200: '#FFC1A0',
          300: '#FF9A63',
          400: '#F97316',
          500: '#EE5905',
          600: '#D44E04',
          700: '#A93E03',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Segoe UI', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px rgba(11,30,70,0.08), 0 1px 2px rgba(11,30,70,0.04)',
        lift: '0 4px 16px rgba(11,30,70,0.10)',
      },
    },
  },
  plugins: [],
};
