import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Assets resolve from the domain root by default, which is what Vercel, a
// custom domain and any plain static host serve. GitHub Pages publishes under
// https://<user>.github.io/Tarmem/, so its workflow sets BASE_PATH=/Tarmem/.
const base = process.env.BASE_PATH ?? '/';

export default defineConfig({
  base,
  plugins: [react()],
});
