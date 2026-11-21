// Vịt tự vẽ bằng SVG (hình đơn giản, không dựa trên sản phẩm nào khác).
type Props = { color: string; size?: number; mine?: boolean };

export default function Duck({ color, size = 44, mine = false }: Props) {
	return (
		<svg width={size} height={size * 0.75} viewBox="0 0 64 48" aria-hidden="true" className="block overflow-visible">
			{mine && <ellipse cx="30" cy="30" rx="31" ry="18" fill="none" stroke="#111827" strokeWidth="2.5" strokeDasharray="4 3" />}
			{/* thân */}
			<path d="M6 26c0-8 9-12 20-11 6 .5 9 3 13 3 4 0 5-3 6-6 2 4 1 11-3 15-5 6-14 8-23 7C10 33 6 31 6 26z" fill={color} />
			{/* cánh */}
			<path d="M16 23c5-3 12-3 16 1-4 4-11 5-16 3-1-1-1-3 0-4z" fill="#000" opacity=".15" />
			{/* đầu */}
			<circle cx="46" cy="13" r="9" fill={color} />
			{/* mỏ */}
			<path d="M54 12l9 2.5-9 3.5c-1.5-1.8-1.5-4.2 0-6z" fill="#fb923c" />
			{/* mắt */}
			<circle cx="48.5" cy="10.5" r="2.2" fill="#fff" />
			<circle cx="49.2" cy="10.6" r="1.2" fill="#111827" />
			{/* gợn nước */}
			<path d="M2 37c5-3 9 3 14 0s9 3 14 0 9 3 14 0 9 3 14 0" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" opacity=".8" />
		</svg>
	);
}
