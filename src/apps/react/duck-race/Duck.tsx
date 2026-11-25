// Vịt tự vẽ bằng SVG, nhìn nghiêng sang phải, có mũ / trang phục / kính tuỳ chọn.
// Hình vẽ riêng cho site này, không dựa trên nhân vật của sản phẩm nào khác.
import { COLORS, type DuckStyle } from './protocol';

type Props = { duck: DuckStyle; number?: number; size?: number; mine?: boolean };

const OUT = 'rgba(15,23,42,.45)';

function shade(hex: string, amt: number) {
	const n = parseInt(hex.slice(1), 16);
	const f = (c: number) => Math.max(0, Math.min(255, Math.round(c + amt * 255)));
	const r = f(n >> 16), g = f((n >> 8) & 255), b = f(n & 255);
	return `rgb(${r},${g},${b})`;
}

function Hat({ id }: { id: DuckStyle['hat'] }) {
	switch (id) {
		case 'cap':
			return (
				<g stroke={OUT} strokeWidth="1.5">
					<path d="M65 24 Q82 2 99 24 Z" fill="#ef4444" />
					<path d="M92 22 L114 25 Q104 31 92 27 Z" fill="#b91c1c" />
					<circle cx="82" cy="9" r="2.5" fill="#fff" />
				</g>
			);
		case 'beanie':
			return (
				<g stroke={OUT} strokeWidth="1.5">
					<path d="M65 25 Q82 -2 99 25 Z" fill="#38bdf8" />
					<rect x="63" y="20" width="38" height="8" rx="4" fill="#0ea5e9" />
					<path d="M72 13 l3 3 M80 10 l3 3 M88 13 l3 3" stroke="#fff" strokeWidth="2" />
					<circle cx="82" cy="3" r="5" fill="#fff" />
				</g>
			);
		case 'tophat':
			return (
				<g stroke={OUT} strokeWidth="1.5">
					<rect x="70" y="-10" width="24" height="28" rx="2" fill="#1f2937" />
					<rect x="70" y="10" width="24" height="5" fill="#dc2626" />
					<rect x="62" y="17" width="40" height="6" rx="3" fill="#111827" />
				</g>
			);
		case 'crown':
			return (
				<g stroke={OUT} strokeWidth="1.5">
					<path d="M67 22 L69 4 L76 13 L82 0 L88 13 L95 4 L97 22 Z" fill="#fbbf24" />
					<circle cx="82" cy="16" r="2.5" fill="#ef4444" />
					<circle cx="73" cy="17" r="2" fill="#3b82f6" />
					<circle cx="91" cy="17" r="2" fill="#10b981" />
				</g>
			);
		case 'chef':
			return (
				<g stroke={OUT} strokeWidth="1.5" fill="#fff">
					<circle cx="72" cy="6" r="8" />
					<circle cx="82" cy="1" r="9" />
					<circle cx="92" cy="6" r="8" />
					<rect x="68" y="8" width="28" height="15" rx="2" />
				</g>
			);
		case 'xmas':
			return (
				<g stroke={OUT} strokeWidth="1.5">
					<path d="M66 22 Q74 -6 100 2 Q108 6 104 12 Q92 8 98 22 Z" fill="#dc2626" />
					<rect x="63" y="18" width="38" height="8" rx="4" fill="#fff" />
					<circle cx="105" cy="13" r="5" fill="#fff" />
				</g>
			);
		case 'cowboy':
			return (
				<g stroke={OUT} strokeWidth="1.5">
					<ellipse cx="82" cy="21" rx="26" ry="5" fill="#92400e" />
					<path d="M70 20 Q70 2 82 4 Q94 2 94 20 Z" fill="#b45309" />
					<rect x="70" y="14" width="24" height="4" fill="#451a03" />
				</g>
			);
		case 'flower':
			return (
				<g stroke={OUT} strokeWidth="1">
					{[0, 72, 144, 216, 288].map((a) => (
						<circle key={a} cx={74 + 6 * Math.cos((a * Math.PI) / 180)} cy={16 + 6 * Math.sin((a * Math.PI) / 180)} r="4.5" fill="#f472b6" />
					))}
					<circle cx="74" cy="16" r="3.5" fill="#fde047" />
				</g>
			);
		case 'headband':
			return (
				<g>
					<path d="M64 27 Q82 15 100 27" fill="none" stroke="#dc2626" strokeWidth="6" strokeLinecap="round" />
					<path d="M65 26 L54 22 M65 27 L55 31" stroke="#dc2626" strokeWidth="4" strokeLinecap="round" />
				</g>
			);
		default:
			return null;
	}
}

function Glasses({ id }: { id: DuckStyle['glasses'] }) {
	switch (id) {
		case 'sun':
			return (
				<g>
					<path d="M70 27 L83 26" stroke="#111827" strokeWidth="2" />
					<path d="M82 24 Q90 22 96 25 Q96 33 89 34 Q83 33 82 24 Z" fill="#111827" />
					<path d="M86 26 l4 0" stroke="#fff" strokeWidth="1.5" opacity=".7" />
				</g>
			);
		case 'round':
			return (
				<g fill="none" stroke="#1f2937" strokeWidth="2">
					<circle cx="89" cy="29" r="7" fill="rgba(255,255,255,.25)" />
					<path d="M70 27 L82 28" />
				</g>
			);
		case 'star':
			return (
				<g>
					<path d="M70 27 L82 28" stroke="#be185d" strokeWidth="2" />
					<path
						d="M89 20 L91.5 26 L98 26.3 L93 30.3 L94.8 36.5 L89 33 L83.2 36.5 L85 30.3 L80 26.3 L86.5 26 Z"
						fill="#ec4899"
						stroke="#9d174d"
						strokeWidth="1"
					/>
				</g>
			);
		default:
			return null;
	}
}

export default function Duck({ duck, number, size = 72, mine = false }: Props) {
	const body = COLORS[duck.color] ?? COLORS[0];
	const dark = shade(body, -0.18);
	const outfit = duck.outfit;
	return (
		<svg width={size} height={(size * 100) / 120} viewBox="-6 -14 126 114" aria-hidden="true" className="block overflow-visible">
			{mine && <ellipse cx="54" cy="66" rx="58" ry="32" fill="rgba(255,255,255,.18)" stroke="#fff" strokeWidth="3" strokeDasharray="7 5" />}
			{/* áo choàng (sau thân) */}
			{outfit === 'cape' && <path d="M74 46 Q40 40 4 70 Q30 64 40 80 Q56 60 78 58 Z" fill="#7c3aed" stroke={OUT} strokeWidth="1.5" />}
			{/* thân + đuôi */}
			<path
				d="M14 58 Q6 38 22 44 Q32 47 40 44 Q64 38 86 50 Q98 58 94 72 Q88 90 56 90 Q24 90 16 76 Q11 68 14 58 Z"
				fill={body}
				stroke={OUT}
				strokeWidth="2"
			/>
			{/* cổ + đầu */}
			<ellipse cx="78" cy="49" rx="13" ry="11" fill={body} />
			<circle cx="82" cy="32" r="18" fill={body} stroke={OUT} strokeWidth="2" />
			<path d="M66 44 Q72 52 86 50" fill={body} />
			{/* cánh */}
			<path d="M32 62 Q50 48 68 60 Q60 78 40 76 Q30 72 32 62 Z" fill={dark} stroke={OUT} strokeWidth="1.5" />
			<path d="M40 64 Q50 60 58 65" fill="none" stroke="rgba(255,255,255,.5)" strokeWidth="2" strokeLinecap="round" />
			{/* áo số */}
			{outfit === 'jersey' && (
				<g>
					<path d="M30 56 Q56 44 84 56 L86 74 Q58 84 28 74 Z" fill="#fff" stroke={OUT} strokeWidth="1.5" />
					<text x="57" y="72" textAnchor="middle" fontSize="18" fontWeight="900" fill="#1f2937" fontFamily="system-ui, sans-serif">
						{number ?? ''}
					</text>
				</g>
			)}
			{/* mỏ */}
			<path d="M96 31 Q114 30 116 37 Q108 44 96 41 Z" fill="#f97316" stroke={OUT} strokeWidth="1.5" />
			<path d="M98 37 Q106 38 114 37" fill="none" stroke="#c2410c" strokeWidth="1.5" />
			{/* mắt + má */}
			<circle cx="89" cy="28" r="5.5" fill="#fff" />
			<circle cx="90.5" cy="28.5" r="3.2" fill="#111827" />
			<circle cx="91.5" cy="27.2" r="1.1" fill="#fff" />
			<ellipse cx="85" cy="40" rx="4.5" ry="2.6" fill="#fb7185" opacity=".45" />
			<Glasses id={duck.glasses} />
			{/* phụ kiện cổ */}
			{outfit === 'scarf' && (
				<g stroke={OUT} strokeWidth="1.5">
					<path d="M66 46 Q80 54 94 46 L94 52 Q80 60 66 52 Z" fill="#10b981" />
					<path d="M70 52 L62 68 L70 68 L74 54 Z" fill="#059669" />
				</g>
			)}
			{outfit === 'bowtie' && (
				<g stroke={OUT} strokeWidth="1.5" fill="#e11d48">
					<path d="M80 52 L70 46 L70 58 Z" />
					<path d="M80 52 L90 46 L90 58 Z" />
					<circle cx="80" cy="52" r="3" fill="#9f1239" />
				</g>
			)}
			{outfit === 'ring' && (
				<ellipse cx="54" cy="80" rx="42" ry="9" fill="none" stroke="#fff" strokeWidth="7" strokeDasharray="14 12" />
			)}
			{outfit === 'ring' && (
				<ellipse cx="54" cy="80" rx="42" ry="9" fill="none" stroke="#ef4444" strokeWidth="7" strokeDasharray="12 14" strokeDashoffset="13" />
			)}
			<Hat id={duck.hat} />
		</svg>
	);
}
