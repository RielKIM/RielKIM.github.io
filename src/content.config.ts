import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';

const posts = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/posts' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    subtitle: z.string().optional(),
    date: z.coerce.date(),
    updated: z.coerce.date().optional(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(true),
    imported: z.boolean().default(false),
    sources: z.array(z.object({ name: z.enum(['Brunch']), url: z.url() }).refine(source => {
      const url = new URL(source.url);
      if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) return false;
      return url.origin === 'https://brunch.co.kr' && /^\/@ukai\/\d+\/?$/.test(url.pathname);
    }, { message: 'Original sources must be HTTPS articles on the approved author accounts.' })).default([]),
    archiveNote: z.string().optional(),
  }),
});
export const collections = { posts };
