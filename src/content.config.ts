import { z, defineCollection } from 'astro:content';
import { NOTE_LEVELS } from './consts';

const projectsCollection = defineCollection({
    type: 'content',
    schema: z.object({
        title: z.string(),
        description: z.string().optional(),
        coverImage: z.string().optional(),
        technologies: z.array(z.string()).optional(),
        role: z.string().optional(),
        date: z.coerce.date().optional(),
        github: z.string().url().optional(),
        // Link demo: URL trang khác (https://...) hoặc trang trong site này (/playground/...)
        demo: z.string().regex(/^(https:\/\/|\/)/, 'demo phải bắt đầu bằng https:// hoặc /').optional(),
        // true = hiển thị demo bằng iframe ngay trong trang dự án
        embed: z.boolean().default(false),
        embedHeight: z.number().int().min(300).max(1600).optional(),
    }),
});

const blogCollection = defineCollection({
    type: 'content',
    schema: z.object({
        title: z.string(),
        date: z.coerce.date(),
        updatedDate: z.coerce.date().optional(),
        excerpt: z.string().optional(),
        coverImage: z.string().optional(),
        tags: z.array(z.string()).optional().default([]),
    }),
});

const notesCollection = defineCollection({
    type: 'content',
    schema: z.object({
        title: z.string(),
        date: z.coerce.date(),
        updatedDate: z.coerce.date().optional(),
        topic: z.string().optional(),
        level: z.enum(NOTE_LEVELS).optional(),
        tags: z.array(z.string()).optional().default([]),
    }),
});

// Chứng chỉ — mỗi chứng chỉ là 1 file .yml trong src/content/certificates (thêm qua /admin)
const certificatesCollection = defineCollection({
    type: 'data',
    schema: z.object({
        title: z.string(),
        issuer: z.string(),
        date: z.coerce.date(),
        image: z.string(),
        credentialUrl: z.string().url().optional(),
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
    'certificates': certificatesCollection,
};
