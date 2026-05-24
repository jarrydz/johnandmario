// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  // For a GitHub Pages *project* site the live URL is split in two:
  //   `site` is the github.io origin, and
  //   `base` is the repo name, because the site is served from a sub-path.
  // Live URL = https://jarrydz.github.io/johnandmario/
  site: 'https://jarrydz.github.io',
  base: '/johnandmario',
  integrations: [sitemap()],
});
