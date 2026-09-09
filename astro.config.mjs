import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { unified } from '@astrojs/markdown-remark';
import rehypeArticleImages from './src/plugins/rehype-article-images.mjs';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkArticleHeadings from './src/plugins/remark-article-headings.mjs';
import remarkContentSafety from './src/plugins/remark-content-safety.mjs';

export default defineConfig({
  site: 'https://rielkim.github.io',
  output: 'static',
  trailingSlash: 'always',
  integrations: [sitemap({ filter: page => !page.endsWith('/writing/') && !page.endsWith('/search/') })],
  markdown: {
    shikiConfig: { theme: 'github-dark' },
    processor: unified({
      remarkPlugins: [remarkMath, remarkContentSafety, remarkArticleHeadings],
      rehypePlugins: [[rehypeKatex, { strict: false, throwOnError: false, trust: false }], rehypeArticleImages],
    }),
  },
});
