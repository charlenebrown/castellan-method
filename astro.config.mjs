import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

// GitHub Pages serves a project repo at https://<user>.github.io/<repo>/
// The deploy workflow sets SITE and BASE; locally we fall back to sensible defaults.
const site = process.env.SITE ?? 'https://example.github.io';
const base = process.env.BASE ?? '/castellan-method';

export default defineConfig({
  site,
  base,
  integrations: [react(), sitemap()],
  vite: { plugins: [tailwindcss()] },
});
