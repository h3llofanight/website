import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const pages = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './docs' }),
  schema: z.object({
    title: z.string(),
    type: z.enum(['text', 'image', 'video', 'folder']).default('text'),
    folder: z.string().optional(),
    thumbnail: z.string().optional(),
    vimeo_url: z.string().optional(),
    image: z.string().optional(),
  }),
});

export const collections = { pages };
