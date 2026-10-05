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
        tags: z.array(z.string()).optional().default([]),
    }),
});

const notesCollection = defineCollection({
    type: 'content',
    schema: z.object({
        title: z.string(),
        date: z.date(),
        topic: z.string().optional(),
        tags: z.array(z.string()).optional().default([]),
    }),
});

const learnCollection = defineCollection({
    type: 'content',
    schema: z.object({
        title: z.string(),
        description: z.string().optional(),
        categoryTitle: z.string().optional(),
        categoryOrder: z.number().default(99),
        sessionTitle: z.string().optional(),
        sessionOrder: z.number().default(99),
        order: z.number().default(99),
        type: z.enum(['lesson', 'quiz', 'test', 'reference']).optional().default('lesson'),
        tags: z.array(z.string()).optional().default([]),
    }),
});


export const collections = {
    'projects': projectsCollection,
    'blog': blogCollection,
    'notes': notesCollection,
    'learn': learnCollection,
};
