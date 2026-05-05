import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{js,ts,jsx,tsx,mdx}', './components/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        ink: '#17202a',
        mist: '#f4f8f8',
        line: '#d9e6e8',
        river: '#008c95',
        ember: '#d92d20',
        sun: '#f97316',
      },
      boxShadow: {
        soft: '0 18px 45px rgba(15, 23, 42, 0.08)',
        lift: '0 22px 55px rgba(0, 140, 149, 0.16)',
      },
    },
  },
  plugins: [],
};

export default config;
