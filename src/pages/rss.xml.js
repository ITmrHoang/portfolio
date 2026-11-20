import { getCollection } from 'astro:content';
import rss from '@astrojs/rss';
import { SITE_AUTHOR, SITE_DESCRIPTION, SITE_LANG, SITE_TITLE } from '../consts';

// RSS feed: người đọc dán link /rss.xml vào app đọc tin (Feedly, Inoreader...) để nhận bài mới tự động.
export async function GET(context) {
	const base = import.meta.env.BASE_URL.replace(/\/$/, '');
	const blog = await getCollection('blog');
	const notes = await getCollection('notes');

	const items = [
		...blog.map((post) => ({
			title: post.data.title,
			pubDate: post.data.date,
			description: post.data.excerpt,
			categories: post.data.tags,
			link: `${base}/blog/${post.slug}/`,
		})),
		...notes.map((note) => ({
			title: note.data.title,
			pubDate: note.data.date,
			description: `Ghi chú ${note.data.topic ?? 'Khác'}${note.data.level ? ` · ${note.data.level}` : ''}`,
			categories: [note.data.topic ?? 'Khác', ...note.data.tags],
			link: `${base}/notes/${note.slug}/`,
		})),
	].sort((a, b) => b.pubDate.valueOf() - a.pubDate.valueOf());

	return rss({
		title: SITE_TITLE,
		description: SITE_DESCRIPTION,
		site: new URL(`${base}/`, context.site).href,
		items,
		customData: `<language>${SITE_LANG}</language><copyright>© ${new Date().getFullYear()} ${SITE_AUTHOR}</copyright>`,
	});
}
