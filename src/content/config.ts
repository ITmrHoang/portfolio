import { z, defineCollection } from 'astro:content';

const projectsCollection = defineCollection({
    type: 'content',
    schema: z.object({
        title: z.string(),
        description: z.string().optional(),
        coverImage: z.string().optional(),
        technologies: z.array(z.string()).optional(),
    }),
});

const blogCollection = defineCollection({
    type: 'content',
    schema: z.object({
        title: z.string(),
        date: z.date(),
        excerpt: z.string().optional(),
    }),
});

const notesCollection = defineCollection({
    type: 'content',
    schema: z.object({
        title: z.string(),
        date: z.date(),
        topic: z.string(),
    }),
});

export const collections = {
    'projects': projectsCollection,
    'blog': blogCollection,
    'notes': notesCollection,
};
