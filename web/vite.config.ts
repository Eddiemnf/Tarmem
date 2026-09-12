import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Assets resolve from the domain root by default, which is what Vercel, a
// custom domain and any plain static host serve. GitHub Pages publishes under
// https://<user>.github.io/Tarmem/, so its workflow sets BASE_PATH=/Tarmem/.
const base = process.env.BASE_PATH ?? '/';

// Baked into the bundle for the preview password screen. Unset means no gate.
const sitePassword = process.env.SITE_PASSWORD ?? '';

export default defineConfig({
  base,
  define: { __SITE_PASSWORD__: JSON.stringify(sitePassword) },
  plugins: [react()],
});
