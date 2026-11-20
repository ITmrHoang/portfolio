import { NOTE_LEVELS, TOPIC_ORDER } from '../consts';

export const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

/** Thêm base path (/portfolio) cho đường dẫn nội bộ như "/uploads/a.png". URL tuyệt đối giữ nguyên. */
export function withBase(path?: string): string | undefined {
	if (!path) return path;
	if (/^(https?:)?\/\//.test(path) || path.startsWith('data:')) return path;
	if (!path.startsWith('/')) return path;
	if (BASE && (path === BASE || path.startsWith(BASE + '/'))) return path;
	return BASE + path;
}

/** Ước tính thời gian đọc (phút) từ nội dung Markdown thô. */
export function readingTime(body: string): number {
	const text = body
		.replace(/```[\s\S]*?```/g, ' ')
		.replace(/<[^>]+>/g, ' ')
		.replace(/[#>*_`|\-\[\]()]/g, ' ');
	const words = text.split(/\s+/).filter(Boolean).length;
	const code = (body.match(/```[\s\S]*?```/g) || []).join('\n').split('\n').length;
	// ~220 từ/phút cho chữ, ~30 dòng code/phút (code thường được đọc lướt)
	return Math.max(1, Math.round(words / 220 + code / 30));
}

export const formatDate = (d: Date) => d.toLocaleDateString('vi-VN');

export const tagSlug = (tag: string) => tag.trim();

type NoteLike = { slug: string; data: { topic?: string; level?: string; date: Date } };

/** Chủ đề hiển thị của ghi chú (ghi chú không khai báo topic → "Khác"). */
export const noteTopic = (n: { data: { topic?: string } }) => n.data.topic || 'Khác';

/** Nhóm ghi chú: chủ đề theo TOPIC_ORDER → cấp độ theo NOTE_LEVELS → trong nhóm bài mới nhất lên đầu. */
export function groupNotes<T extends NoteLike>(notes: T[]) {
	const topicRank = (t: string) => {
		const i = TOPIC_ORDER.indexOf(t);
		return i === -1 ? TOPIC_ORDER.length : i;
	};
	const levelRank = (l?: string) => {
		const i = l ? (NOTE_LEVELS as readonly string[]).indexOf(l) : -1;
		return i === -1 ? NOTE_LEVELS.length : i;
	};
	const topics = [...new Set(notes.map(noteTopic))].sort(
		(a, b) => topicRank(a) - topicRank(b) || a.localeCompare(b, 'vi'),
	);
	return topics.map((topic) => {
		const inTopic = notes.filter((n) => noteTopic(n) === topic);
		const levels = [...new Set(inTopic.map((n) => n.data.level ?? ''))].sort(
			(a, b) => levelRank(a) - levelRank(b),
		);
		return {
			topic,
			count: inTopic.length,
			levels: levels.map((level) => ({
				level: level || 'Khác',
				notes: inTopic
					.filter((n) => (n.data.level ?? '') === level)
					.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf()),
			})),
		};
	});
}

export const LEVEL_STYLES: Record<string, string> = {
	'Cơ bản': 'bg-emerald-50 text-emerald-700 border-emerald-100',
	'Trung cấp': 'bg-sky-50 text-sky-700 border-sky-100',
	'Nâng cao': 'bg-amber-50 text-amber-700 border-amber-100',
	'Chuyên sâu': 'bg-rose-50 text-rose-700 border-rose-100',
	Khác: 'bg-gray-50 text-gray-600 border-gray-100',
};
