/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,tsx,jsx}",
    "node_modules/flowbite-react/**/*.{js,jsx,ts,tsx}"
  ],  theme: {
    extend: {},
  },
  plugins: [
    require('flowbite/plugin')
  ],
};
