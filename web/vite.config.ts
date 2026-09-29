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
  build: {
    // The default target lets the minifier rewrite `@media (max-width: 460px)` as
    // `@media (width<=460px)`, which Safari before 16.4 ignores — on an older iPhone every
    // responsive rule in the design would silently stop applying. Build for 2020-era browsers.
    target: ['es2020', 'chrome87', 'firefox78', 'safari14'],
    cssTarget: ['chrome87', 'firefox78', 'safari14'],
    // Everything the first page needs still loads at once (these are static imports, preloaded from index.html), but in
    // separate files: React and the Supabase client change only when their versions do, and the design's copy/data and
    // logic only when the design does, so a site-only release leaves them cached. It also keeps every file under
    // Vite's 500 kB warning (the one main file was 1.1 MB).
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: 'react', test: /[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/, priority: 30 },
            { name: 'supabase', test: /[\\/]node_modules[\\/]@supabase[\\/]/, priority: 20 },
            { name: 'design-data', test: /[\\/]src[\\/]data[\\/]tarmem-data\.ts$/, priority: 10 },
            { name: 'design-logic', test: /[\\/]src[\\/]state[\\/]designLogic\.generated\.ts$/, priority: 10 },
          ],
        },
      },
    },
  },
});
