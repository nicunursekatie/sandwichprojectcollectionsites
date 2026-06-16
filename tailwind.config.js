/** @type {import('tailwindcss').Config} */
// Tailwind v3 config. Scans the host-finder markup and the JSX source so the
// production stylesheet (public/tailwind.build.css) contains exactly the
// utility classes the app uses — replacing the cdn.tailwindcss.com runtime.
module.exports = {
  content: [
    './public/index.html',
    './public/app.js',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
