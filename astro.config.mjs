import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
export default defineConfig({site: 'https://rielkim.github.io', output: 'static', trailingSlash: 'always', integrations: [sitemap()], markdown: { shikiConfig: { theme: 'github-dark' } }});
