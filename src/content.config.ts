import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const pages = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './docs' }),
  schema: z.object({
    title: z.string(),
    type: z.enum(['text', 'image', 'video', 'folder']).default('text'),
    folder: z.string().optional(),
    icon: z.string().optional(),
    thumbnail: z.string().optional(),
    vimeo_url: z.string().optional(),
    image: z.string().optional(),
  }),
});

const site = defineCollection({
  loader: glob({ pattern: 'site.md', base: './settings' }),
  schema: z.object({
    title: z.string().default('Desktop'),
    description: z.string().default('A personal website'),
    wallpaper: z.string().optional(),
    icon_text: z.string().optional(),
    icon_image: z.string().optional(),
    icon_video: z.string().optional(),
    icon_folder: z.string().optional(),
  }),
});

const dock = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './dock' }),
  schema: z.object({
    title: z.string(),
    icon: z.string().optional(),
    url: z.string().optional(),
    entry_id: z.string().optional(),
    order: z.number().default(99),
  }),
});

export const collections = { pages, site, dock };
