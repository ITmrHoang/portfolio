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
// → lấy category + categoryId trên https://giscus.app rồi đặt vào biến môi trường:
//   - Máy local: file .env (xem .env.example)
//   - GitHub Actions: Settings → Secrets and variables → Actions → tab Variables
// Biến được đọc lúc BUILD. Thiếu categoryId thì khung bình luận tự ẩn.
const env = import.meta.env;
export const GISCUS = {
	repo: env.PUBLIC_GISCUS_REPO || 'ITmrHoang/portfolio',
	repoId: env.PUBLIC_GISCUS_REPO_ID || 'R_kgDORs_7CQ',
	category: env.PUBLIC_GISCUS_CATEGORY || 'Announcements',
	categoryId: env.PUBLIC_GISCUS_CATEGORY_ID || '',
};

// Mã phiên bản build (astro.config.mjs đặt vào env). Dạng YYYYMMDDHHmm[-sha].
export const BUILD_ID: string = import.meta.env.PUBLIC_BUILD_ID || 'dev';

// Đổi favicon theo ngày (MM-DD, theo giờ máy người xem). Ngoài các khoảng này dùng favicon mặc định.
// Khoảng có thể vắt qua năm mới, vd { from: '12-28', to: '01-03' }.
// Đặt file icon trong public/icons/. Tết âm lịch đổi ngày mỗi năm — nhớ chỉnh lại.
export const FAVICON_SCHEDULE: { from: string; to: string; icon: string }[] = [
	{ from: '12-15', to: '12-31', icon: '/icons/noel.svg' },
	{ from: '01-28', to: '02-14', icon: '/icons/tet.svg' }, // Tết Đinh Mùi: 06/02/2027
];
