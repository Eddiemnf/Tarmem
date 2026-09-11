import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// The site is published to GitHub Pages at https://<user>.github.io/Tarmem/,
// so assets resolve under that sub-path. Set BASE_PATH=/ when serving from a
// domain root (a custom domain, Netlify, Vercel, or a plain static host).
const base = process.env.BASE_PATH ?? '/Tarmem/';

export default defineConfig({
  base,
  plugins: [react()],
});
