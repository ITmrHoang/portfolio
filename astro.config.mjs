// @ts-check

import mdx from '@astrojs/mdx';
import { defineConfig } from 'astro/config';

import tailwind from '@astrojs/tailwind';
import react from '@astrojs/react';
import vue from '@astrojs/vue';
import sitemap from '@astrojs/sitemap';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { readFile, writeFile } from 'node:fs/promises';

const isDev = process.argv.includes('dev');

// Mã phiên bản cho mỗi lần build: YYYYMMDDHHmm[-sha]. Sắp xếp được theo thời gian.
// Dùng cho service worker (đổi cache) và để trang biết mình là bản cũ hay mới.
const sha = process.env.GITHUB_SHA ? '-' + process.env.GITHUB_SHA.slice(0, 7) : '';
const BUILD_ID = new Date().toISOString().replace(/\D/g, '').slice(0, 12) + sha;
process.env.PUBLIC_BUILD_ID = BUILD_ID;

// Ghi BUILD_ID vào dist/sw.js -> mỗi lần deploy sw.js đổi nội dung -> trình duyệt tự cài SW mới
const swVersion = () => ({
    name: 'sw-version',
    hooks: {
        'astro:build:done': async ({ dir }) => {
            const file = new URL('sw.js', dir);
            const src = await readFile(file, 'utf8');
            await writeFile(file, src.replaceAll('__BUILD_ID__', BUILD_ID));
        },
    },
});

// https://astro.build/config
export default defineConfig({
    site: process.env.SITE_URL ?? 'https://itmrhoang.github.io',
    base: process.env.BASE_URL ?? (isDev ? '/' : '/portfolio'),
    // bất kỳ liên kết nào trên màn hình viewport sẽ được tự động tải trước.
    // prefetch: {
    //     prefetchAll: true,
    //     defaultStrategy: 'viewport',
    // },
    integrations: [
        mdx({
            remarkPlugins: [remarkMath],
            rehypePlugins: [rehypeKatex],
        }),
        tailwind(),
        react(),
        vue(),
        // Tạo sitemap-index.xml cho Google (bỏ qua trang tìm kiếm)
        sitemap({
            filter: (page) => !page.includes('/search'),
        }),
        swVersion(),
    ],
    markdown: {
        remarkPlugins: [remarkMath],
        rehypePlugins: [rehypeKatex],
    },
});