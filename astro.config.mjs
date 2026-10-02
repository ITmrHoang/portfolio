// @ts-check

import mdx from '@astrojs/mdx';
import { defineConfig } from 'astro/config';

import tailwind from '@astrojs/tailwind';
import react from '@astrojs/react';
import vue from '@astrojs/vue';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

const isDev = process.argv.includes('dev');

// https://astro.build/config
export default defineConfig({
    site: process.env.SITE_URL ?? 'https://itmrhoang.github.io',
    base: process.env.BASE_URL ?? (isDev ? '/' : '/portfolio'),
    integrations: [
        mdx({
            remarkPlugins: [remarkMath],
            rehypePlugins: [rehypeKatex],
        }),
        tailwind(),
        react(),
        vue()
    ],
    markdown: {
        remarkPlugins: [remarkMath],
        rehypePlugins: [rehypeKatex],
    },
});