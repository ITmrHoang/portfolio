// Thông tin chung của site — BaseHead (thẻ <title>, meta), Header, RSS và các trang đều lấy từ đây.
export const SITE_TITLE = 'HiMo Portfolio';
export const SITE_AUTHOR = 'Nguyễn Văn Hoàng';
export const SITE_DESCRIPTION =
	'Portfolio cá nhân & blog công nghệ của HiMo (Nguyễn Văn Hoàng): dự án, kiến thức lập trình, lộ trình học và sổ tay ghi chú.';
export const SITE_LANG = 'vi';

export const SOCIAL_LINKS = {
	github: 'https://github.com/ITmrHoang',
};

// Thứ tự hiển thị các NHÓM chủ đề ở trang Ghi chú. Chủ đề không có trong danh sách sẽ xếp cuối (theo ABC).
export const TOPIC_ORDER = [
	'DSA',
	'Design Pattern',
	'Software Engineering',
	'HTML/CSS/JS',
	'CSS',
	'Vanilla JS',
	'React & Web Tools',
];

// Cấp độ ghi chú, theo thứ tự hiển thị.
export const NOTE_LEVELS = ['Cơ bản', 'Trung cấp', 'Nâng cao', 'Chuyên sâu'] as const;

// Bình luận Giscus (dùng GitHub Discussions).
// Để bật: vào Settings của repo → bật Discussions → cài app https://github.com/apps/giscus
// → lấy categoryId trên https://giscus.app rồi điền vào dưới đây. Để trống thì khung bình luận tự ẩn.
export const GISCUS = {
	repo: 'ITmrHoang/portfolio',
	repoId: 'R_kgDORs_7CQ',
	category: 'Announcements',
	categoryId: '',
};
