// Sân đua: các làn nước xếp chéo, camera bám theo vịt dẫn đầu, nền nhiều lớp chuyển động (parallax),
// vạch đích chỉ hiện khi gần tới, có chế độ toàn màn hình.
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import Duck from './Duck';
import { COLORS, type Racer } from './protocol';

export type StageProps = {
	racers: Racer[];
	trackLength: number;
	selfId?: string;
	/** Quãng đường hiển thị (mét, có thể > trackLength sau khi về đích) tại thời điểm `el` ms kể từ xuất phát. */
	getDistance?: (r: Racer, el: number) => number;
	/** performance.now() lúc hết đếm ngược; null = chưa đua (xếp hàng ở vạch xuất phát). */
	t0?: number | null;
	/** Ấn vào sân để tăng tốc (chế độ người thật). */
	onTap?: () => void;
	/** Camera luôn giữ vịt này trong khung hình. */
	followId?: string;
	hud?: ReactNode;
	overlay?: ReactNode;
	bottom?: ReactNode;
};

// ---------- hình nền (SVG tự vẽ, lặp ngang) ----------
const svgUrl = (w: number, h: number, body: string) =>
	`url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}' viewBox='0 0 ${w} ${h}'>${body}</svg>`)}")`;

const BG = {
	clouds: svgUrl(
		700, 120,
		`<g fill='#fff' opacity='.9'><ellipse cx='90' cy='50' rx='50' ry='18'/><ellipse cx='120' cy='38' rx='34' ry='20'/><ellipse cx='60' cy='42' rx='26' ry='14'/>` +
			`<ellipse cx='420' cy='80' rx='60' ry='16'/><ellipse cx='455' cy='68' rx='34' ry='18'/><ellipse cx='600' cy='30' rx='30' ry='10'/></g>`,
	),
	hills: svgUrl(
		640, 160,
		`<path d='M0 160 L0 90 Q80 30 170 80 Q240 40 330 70 Q420 20 520 75 Q590 50 640 90 L640 160Z' fill='#86efac'/>` +
			`<path d='M0 160 L0 115 Q120 75 220 110 Q330 80 430 112 Q540 85 640 115 L640 160Z' fill='#4ade80'/>`,
	),
	trees: svgUrl(
		420, 120,
		`<g><rect x='40' y='70' width='8' height='30' fill='#92400e'/><circle cx='44' cy='60' r='22' fill='#16a34a'/><circle cx='30' cy='72' r='14' fill='#15803d'/>` +
			`<rect x='190' y='78' width='6' height='24' fill='#92400e'/><path d='M193 30 L215 82 L171 82Z' fill='#15803d'/>` +
			`<rect x='300' y='74' width='40' height='26' fill='#fde68a'/><path d='M294 76 L320 54 L346 76Z' fill='#ef4444'/><rect x='314' y='84' width='10' height='16' fill='#92400e'/>` +
			`<ellipse cx='120' cy='96' rx='30' ry='12' fill='#22c55e'/><ellipse cx='390' cy='98' rx='24' ry='10' fill='#22c55e'/></g>`,
	),
	bank: svgUrl(
		300, 40,
		`<path d='M0 0 H300 V22 Q280 30 255 24 Q230 32 200 25 Q170 33 140 24 Q110 32 80 25 Q50 33 25 24 Q10 28 0 24Z' fill='#a16207'/>` +
			`<path d='M0 0 H300 V14 Q270 20 240 14 Q210 20 180 14 Q150 20 120 14 Q90 20 60 14 Q30 20 0 14Z' fill='#65a30d'/>` +
			`<g stroke='#3f6212' stroke-width='2' fill='none'><path d='M40 16 l-3 -10 M44 16 l1 -12 M48 16 l4 -9'/><path d='M190 16 l-3 -9 M194 16 l2 -12'/></g>`,
	),
	waves: svgUrl(
		260, 90,
		`<g fill='none' stroke='#fff' stroke-linecap='round' opacity='.35' stroke-width='3'>` +
			`<path d='M10 20 q12 -8 24 0 t24 0'/><path d='M150 55 q12 -8 24 0 t24 0'/><path d='M80 80 q10 -6 20 0 t20 0'/></g>`,
	),
	wavesFine: svgUrl(
		180, 60,
		`<g fill='none' stroke='#e0f2fe' stroke-linecap='round' opacity='.3' stroke-width='2'><path d='M20 15 q8 -5 16 0'/><path d='M110 40 q8 -5 16 0'/></g>`,
	),
	front: svgUrl(
		520, 70,
		`<g><path d='M30 70 Q34 30 40 10 Q42 40 44 70Z' fill='#4d7c0f'/><path d='M44 70 Q50 34 60 20 Q54 46 52 70Z' fill='#65a30d'/>` +
			`<rect x='37' y='8' width='6' height='16' rx='3' fill='#78350f'/>` +
			`<ellipse cx='260' cy='60' rx='26' ry='8' fill='#16a34a'/><path d='M260 60 L282 56' stroke='#0f766e' stroke-width='2'/><circle cx='252' cy='56' r='4' fill='#f9a8d4'/>` +
			`<path d='M430 70 Q436 36 444 22 Q446 46 448 70Z' fill='#4d7c0f'/></g>`,
	),
};

const SKY_RATIO = 0.27; // phần trời + bờ phía trên

function niceStep(x: number) {
	const steps = [5, 10, 20, 25, 50, 100];
	return steps.find((s) => s >= x) ?? 100;
}

export default function RaceStage({ racers, trackLength: L, selfId, getDistance, t0 = null, onTap, followId, hud, overlay, bottom }: StageProps) {
	const rootRef = useRef<HTMLDivElement>(null);
	const [size, setSize] = useState({ w: 800, h: 480 });
	const [full, setFull] = useState<'off' | 'native' | 'css'>('off');
	const [leaderId, setLeaderId] = useState<string | null>(null);
	const [winner, setWinner] = useState<Racer | null>(null);
	const [tapFx, setTapFx] = useState<{ id: number; x: number; y: number }[]>([]);

	const duckRefs = useRef<Record<string, HTMLDivElement | null>>({});
	const chipRefs = useRef<Record<string, HTMLDivElement | null>>({});
	const layerRefs = useRef<Record<string, HTMLDivElement | null>>({});
	const markRefs = useRef<Record<number, HTMLDivElement | null>>({});
	const finishRef = useRef<HTMLDivElement>(null);
	const startRef = useRef<HTMLDivElement>(null);
	const flagRef = useRef<HTMLDivElement>(null);
	const countRef = useRef<HTMLDivElement>(null);
	const miniRefs = useRef<Record<string, HTMLDivElement | null>>({});
	const nearRef = useRef<HTMLDivElement>(null);
	const camRef = useRef<{ t0: number | null; cam: number }>({ t0: null, cam: 0 });

	// Kích thước sân theo khung chứa.
	useLayoutEffect(() => {
		const el = rootRef.current;
		if (!el) return;
		const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
		ro.observe(el);
		setSize({ w: el.clientWidth, h: el.clientHeight });
		return () => ro.disconnect();
	}, [full]); // phần tử gốc đổi khi vào/ra toàn màn hình kiểu CSS (portal)

	// Toàn màn hình: dùng Fullscreen API, máy không hỗ trợ (iPhone) thì phủ kín bằng CSS.
	useEffect(() => {
		const onChange = () => {
			if (!document.fullscreenElement) setFull((f) => (f === 'native' ? 'off' : f));
		};
		document.addEventListener('fullscreenchange', onChange);
		return () => document.removeEventListener('fullscreenchange', onChange);
	}, []);
	useEffect(() => {
		if (full !== 'css') return;
		const prev = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setFull('off');
		window.addEventListener('keydown', onKey);
		return () => {
			document.body.style.overflow = prev;
			window.removeEventListener('keydown', onKey);
		};
	}, [full]);
	const toggleFull = async () => {
		if (full === 'native') return void document.exitFullscreen().catch(() => setFull('off'));
		if (full === 'css') return setFull('off');
		const el = rootRef.current as any;
		if (!el?.requestFullscreen || !document.fullscreenEnabled) return setFull('css');
		// Một số trình duyệt nhúng không bao giờ trả lời yêu cầu → sau 700ms chưa vào được thì phủ bằng CSS.
		const fallback = setTimeout(() => {
			if (!document.fullscreenElement) setFull('css');
		}, 700);
		try {
			await el.requestFullscreen({ navigationUI: 'hide' });
			clearTimeout(fallback);
			setFull('native');
			(screen.orientation as any)?.lock?.('landscape').catch(() => {});
		} catch {
			clearTimeout(fallback);
			setFull('css');
		}
	};

	// Đổi đợt đua → xoá người thắng cũ.
	useEffect(() => {
		setWinner(null);
		setLeaderId(null);
	}, [t0, racers]);

	// ---------- bố cục ----------
	const N = Math.max(1, racers.length);
	// Tối đa 10 làn; đông hơn thì nhiều vịt chung một làn, mỗi con lệch lên/xuống một chút.
	// Thứ tự xếp: làn dưới cùng → lên trên, hết 10 làn thì quay lại làn dưới, dàn đều trong làn.
	const LANES = Math.min(10, N);
	const ROWS = Math.ceil(N / LANES);
	const W = size.w;
	const H = size.h;
	const skyH = H * SKY_RATIO;
	const waterH = H - skyH;
	const topPad = Math.min(46, waterH * 0.14);
	const bottomPad = bottom ? Math.min(76, waterH * 0.22) : waterH * 0.06;
	const laneGap = (waterH - topPad - bottomPad) / LANES;
	const duckW = Math.max(40, Math.min(laneGap * 2.1, W * 0.17, 130));
	const duckH = (duckW * 100) / 120;
	const skew = Math.min(laneGap * 0.5, 26);
	const visibleM = Math.min(Math.max(L * 0.32, 18), 70);
	const small = N > 10;
	const crowded = N > 20; // đông quá: chỉ hiện tên vịt của mình, vịt khác chỉ hiện số
	const tagW = crowded ? 46 : small ? 78 : 104; // bảng tên nằm phía sau đuôi vịt
	const startX = Math.max(duckW * 0.87 + tagW + 6, W * 0.13);
	const ppm = (W - startX) / visibleM;
	const laneY = (lane: number) => skyH + topPad + laneGap * (lane + 0.5);
	const laneX = (lane: number) => (LANES - 1 - lane) * skew;
	const laneOf = (i: number) => LANES - 1 - (i % LANES);
	const subStep = ROWS > 1 ? (laneGap * 0.7) / (ROWS - 1) : 0;
	/** Vị trí dọc và độ lệch ngang (theo vạch chéo) của vịt thứ i. */
	const duckY = (i: number) => laneY(laneOf(i)) + (Math.floor(i / LANES) - (ROWS - 1) / 2) * subStep;
	const duckX = (i: number) => laneX(laneOf(i));
	const markStep = niceStep(L / 6);
	const marks: number[] = [];
	for (let m = markStep; m < L; m += markStep) marks.push(m);

	// ---------- vòng vẽ mỗi khung hình ----------
	useEffect(() => {
		let raf = 0;
		// Giữ vị trí camera khi vòng vẽ khởi động lại (đổi kích thước, vào toàn màn hình); về 0 khi sang ván mới.
		if (camRef.current.t0 !== t0) camRef.current = { t0, cam: 0 };
		let cam = camRef.current.cam;
		let last = performance.now();
		const prevD: Record<string, number> = {};
		let shownLeader: string | null = null;
		let winnerSet = false;
		const tStart = performance.now();

		const loop = () => {
			const now = performance.now();
			const dt = Math.min(0.1, (now - last) / 1000);
			last = now;
			const el = t0 == null ? -1 : now - t0;
			const ds: Record<string, number> = {};
			let lead = racers[0];
			let leadD = -1;
			for (const r of racers) {
				const d = el > 0 && getDistance ? getDistance(r, el) : 0;
				ds[r.id] = d;
				if (d > leadD) {
					leadD = d;
					lead = r;
				}
			}
			// camera: vịt đầu ở khoảng 2/3 màn hình; luôn giữ vịt được theo dõi trong khung
			// Vịt đầu ở ~65% chiều ngang; khi tới đích thì dừng camera để vạch đích nằm ở ~58%,
			// chừa chỗ cho các vịt trôi qua vạch.
			const leadIdx = Math.max(0, racers.indexOf(lead));
			let target = Math.min(leadD, L) - (W * 0.65 - startX - duckX(leadIdx)) / ppm;
			if (followId && ds[followId] != null) target = Math.min(target, ds[followId] - (W * 0.25 - startX) / ppm);
			const camMax = L - (W * 0.58 - startX - laneX(0)) / ppm;
			target = Math.max(0, Math.min(target, camMax));
			cam += (target - cam) * Math.min(1, dt * 3.5);
			camRef.current.cam = cam;
			const camPx = cam * ppm;

			// nền parallax (mây còn tự trôi chậm)
			const drift = (now - tStart) / 1000;
			const setBg = (k: string, factor: number, extra = 0) => {
				const n = layerRefs.current[k];
				if (n) n.style.backgroundPositionX = `${(-camPx * factor - extra).toFixed(1)}px`;
			};
			setBg('clouds', 0.06, drift * 6);
			setBg('hills', 0.15);
			setBg('trees', 0.35);
			setBg('bank', 0.6);
			setBg('waves', 1, drift * 10);
			setBg('wavesFine', 1.1, -drift * 6);
			const ropes = layerRefs.current.ropes;
			if (ropes) {
				const rx = -camPx;
				ropes.style.backgroundPosition = `${rx.toFixed(1)}px ${-laneGap / 2}px, ${(rx + ppm * 0.6).toFixed(1)}px ${-laneGap / 2}px`;
			}
			setBg('front', 1.4);

			const worldX = (m: number) => startX + m * ppm - camPx;
			const placeLine = (node: HTMLDivElement | null, m: number) => {
				if (!node) return;
				const x = worldX(m);
				const vis = x > -80 && x < W + 80;
				node.style.display = vis ? 'block' : 'none';
				if (vis) node.style.transform = `translate3d(${x.toFixed(1)}px,0,0)`;
			};
			placeLine(startRef.current, 0);
			placeLine(finishRef.current, L);
			if (flagRef.current) {
				const x = worldX(L) + laneX(0);
				flagRef.current.style.display = x < W + 60 ? 'block' : 'none';
				flagRef.current.style.transform = `translate3d(${x.toFixed(1)}px,0,0)`;
			}
			for (const m of marks) {
				const n = markRefs.current[m];
				if (!n) continue;
				const x = worldX(m) + laneX(0);
				n.style.display = x > -60 && x < W + 60 ? 'block' : 'none';
				n.style.transform = `translate3d(${x.toFixed(1)}px,0,0)`;
			}
			if (nearRef.current) nearRef.current.style.opacity = el > 0 && leadD > L * 0.85 && leadD < L ? '1' : '0';

			racers.forEach((r, i) => {
				const d = ds[r.id];
				const node = duckRefs.current[r.id];
				const speed = prevD[r.id] != null && dt > 0 ? (d - prevD[r.id]) / dt : 0;
				prevD[r.id] = d;
				const xNose = worldX(d) + duckX(i);
				const x = xNose - duckW * 0.95;
				if (node) {
					node.style.transform = `translate3d(${x.toFixed(1)}px,${(duckY(i) - duckH * 0.78).toFixed(1)}px,0)`;
					const wake = node.firstElementChild as HTMLElement | null;
					if (wake) wake.style.opacity = String(Math.min(1, Math.max(0, speed / ((L / 30) * 1.6))));
				}
				const chip = chipRefs.current[r.id];
				if (chip) chip.style.display = x + duckW < 0 ? 'flex' : 'none';
				const mini = miniRefs.current[r.id];
				if (mini) mini.style.left = `${Math.min(100, (d / L) * 100).toFixed(2)}%`;
			});

			// đếm ngược
			const cn = countRef.current;
			if (cn) {
				const txt = t0 == null ? '' : el < 0 ? String(Math.ceil(-el / 1000)) : el < 800 ? 'GO!' : '';
				if (cn.dataset.t !== txt) {
					cn.dataset.t = txt;
					cn.textContent = txt;
					cn.style.display = txt ? 'flex' : 'none';
					cn.classList.remove('count-pop');
					void cn.offsetWidth;
					if (txt) cn.classList.add('count-pop');
				}
			}

			if (el > 0 && lead && lead.id !== shownLeader) {
				shownLeader = lead.id;
				setLeaderId(lead.id);
			}
			if (!winnerSet && el > 0 && leadD >= L) {
				winnerSet = true;
				setWinner(lead);
			}
			raf = requestAnimationFrame(loop);
		};
		raf = requestAnimationFrame(loop);
		return () => cancelAnimationFrame(raf);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [racers, L, t0, getDistance, followId, W, H, N, bottom != null]);

	const handlePointer = (e: React.PointerEvent) => {
		if (!onTap) return;
		if ((e.target as HTMLElement).closest('button,a,input,select,textarea,[data-no-tap]')) return;
		e.preventDefault();
		onTap();
		const rect = rootRef.current!.getBoundingClientRect();
		const fx = { id: Math.random(), x: e.clientX - rect.left, y: e.clientY - rect.top };
		setTapFx((a) => [...a.slice(-6), fx]);
		setTimeout(() => setTapFx((a) => a.filter((t) => t.id !== fx.id)), 500);
	};

	const lineStyle = (h: number): React.CSSProperties => ({
		top: skyH + topPad * 0.4,
		height: h,
		left: 0,
		transformOrigin: 'top left',
	});
	const lineH = waterH - topPad * 0.4;
	const skewDeg = (Math.atan2(skew, laneGap) * 180) / Math.PI;
	const leader = racers.find((r) => r.id === leaderId);

	const stage = (
		<div
			ref={rootRef}
			onPointerDown={handlePointer}
			className={`duck-stage select-none overflow-hidden bg-sky-300 ${
				full === 'css' ? 'fixed inset-0 z-[1000] h-[100dvh] w-screen rounded-none' : full === 'native' ? 'relative h-full w-full' : 'relative rounded-2xl'
			} ${onTap ? 'cursor-pointer' : ''}`}
			style={full === 'off' ? { height: 'clamp(340px, 62vw, 620px)' } : undefined}
		>
			{/* trời + bờ xa */}
			<div className="absolute inset-x-0 top-0" style={{ height: skyH, background: 'linear-gradient(#7dd3fc,#bae6fd 70%,#dcfce7)' }} />
			<div className="absolute rounded-full bg-yellow-200" style={{ width: skyH * 0.35, height: skyH * 0.35, right: W * 0.12, top: skyH * 0.12, boxShadow: '0 0 40px #fde68a' }} />
			<div ref={(n) => void (layerRefs.current.clouds = n)} className="absolute inset-x-0 top-0" style={{ height: skyH * 0.6, backgroundImage: BG.clouds, backgroundSize: `auto ${skyH * 0.6}px`, backgroundRepeat: 'repeat-x' }} />
			<div ref={(n) => void (layerRefs.current.hills = n)} className="absolute inset-x-0" style={{ top: skyH * 0.25, height: skyH * 0.75, backgroundImage: BG.hills, backgroundSize: `auto ${skyH * 0.75}px`, backgroundRepeat: 'repeat-x' }} />
			<div ref={(n) => void (layerRefs.current.trees = n)} className="absolute inset-x-0" style={{ top: skyH * 0.45, height: skyH * 0.55, backgroundImage: BG.trees, backgroundSize: `auto ${skyH * 0.55}px`, backgroundRepeat: 'repeat-x' }} />

			{/* nước */}
			<div className="absolute inset-x-0 bottom-0" style={{ top: skyH, background: 'linear-gradient(#0ea5e9,#0284c7 55%,#0369a1)' }} />
			<div ref={(n) => void (layerRefs.current.waves = n)} className="absolute inset-x-0 bottom-0" style={{ top: skyH, backgroundImage: BG.waves, backgroundSize: `${Math.round(ppm * 9)}px auto` }} />
			<div ref={(n) => void (layerRefs.current.wavesFine = n)} className="absolute inset-x-0 bottom-0" style={{ top: skyH, backgroundImage: BG.wavesFine }} />
			{/* dây phao chia làn */}
			<div
				ref={(n) => void (layerRefs.current.ropes = n)}
				className="pointer-events-none absolute inset-x-0"
				style={{
					top: skyH + topPad,
					height: laneGap * LANES,
					backgroundImage: `radial-gradient(circle, rgba(255,255,255,.75) 2.5px, transparent 3px), radial-gradient(circle, rgba(250,204,21,.85) 2.5px, transparent 3px)`,
					backgroundSize: `${Math.round(ppm * 1.2)}px ${laneGap}px, ${Math.round(ppm * 1.2)}px ${laneGap}px`,
					backgroundPosition: `0 ${-laneGap / 2}px, ${Math.round(ppm * 0.6)}px ${-laneGap / 2}px`,
					opacity: 0.8,
				}}
			/>
			{/* bờ gần trời */}
			<div ref={(n) => void (layerRefs.current.bank = n)} className="absolute inset-x-0" style={{ top: skyH - 8, height: 26, backgroundImage: BG.bank, backgroundSize: 'auto 26px', backgroundRepeat: 'repeat-x' }} />

			{/* mốc khoảng cách trên bờ */}
			{marks.map((m) => (
				<div key={m} ref={(n) => void (markRefs.current[m] = n)} className="pointer-events-none absolute left-0" style={{ top: skyH - 30 }}>
					<div className="-translate-x-1/2 rounded-md border-2 border-amber-900/40 bg-amber-50 px-1.5 text-[11px] font-black text-amber-900 shadow">{m} m</div>
					<div className="mx-auto h-3 w-1 -translate-x-1/2 bg-amber-900/50" />
				</div>
			))}

			{/* vạch xuất phát + vạch đích (xếp chéo theo các làn) */}
			<div ref={startRef} className="pointer-events-none absolute" style={lineStyle(lineH)}>
				<div className="h-full w-2 bg-white/80" style={{ transform: `translateX(${laneX(0)}px) skewX(${-skewDeg}deg)`, transformOrigin: 'top left' }} />
			</div>
			<div ref={finishRef} className="pointer-events-none absolute" style={lineStyle(lineH)}>
				<div className="finish-band h-full" style={{ width: Math.max(14, duckW * 0.22), transform: `translateX(${laneX(0)}px) skewX(${-skewDeg}deg)`, transformOrigin: 'top left' }} />
			</div>
			<div ref={flagRef} className="pointer-events-none absolute left-0" style={{ top: skyH - 54 }}>
				<div className="flex -translate-x-1/2 flex-col items-center">
					<div className="rounded-lg bg-white px-2 py-0.5 text-xs font-black tracking-wider text-gray-900 shadow-md ring-2 ring-gray-900">🏁 ĐÍCH</div>
					<div className="h-8 w-1 bg-gray-800" />
				</div>
			</div>

			{/* vịt */}
			{racers.map((r, i) => {
				const mine = r.id === selfId;
				const color = COLORS[r.style.color] ?? COLORS[0];
				return (
					<div
						key={r.id}
						ref={(n) => void (duckRefs.current[r.id] = n)}
						className="pointer-events-none absolute left-0 top-0 will-change-transform"
						style={{ width: duckW, zIndex: 10 + Math.round(duckY(i)), transform: `translate3d(${startX + duckX(i) - duckW * 0.95}px,${duckY(i) - duckH * 0.78}px,0)` }}
					>
						<div className="wake absolute" style={{ left: -duckW * 0.35, bottom: duckH * 0.02, width: duckW * 0.7, height: duckH * 0.3, opacity: 0 }} />
						<div
							className={`absolute flex -translate-y-1/2 items-center gap-1 whitespace-nowrap rounded-full bg-white/95 py-0.5 pl-0.5 font-bold text-gray-900 shadow ${crowded && !mine ? 'pr-0.5' : 'pr-2'} ${
								mine ? 'ring-2 ring-amber-400' : ''
							}`}
							style={{ right: duckW * 0.92, top: duckH * 0.62, fontSize: small ? 9 : 11, maxWidth: mine ? 104 : tagW }}
						>
							<span className="grid shrink-0 place-items-center rounded-full font-black text-gray-900" style={{ background: color, width: small ? 14 : 18, height: small ? 14 : 18, fontSize: small ? 8 : 10 }}>
								{r.number}
							</span>
							{(!crowded || mine) && <span className="truncate">{r.name}</span>}
						</div>
						<div className="duck-bob" style={{ animationDelay: `${(i * 0.17) % 1}s` }}>
							<Duck duck={r.style} number={r.number} size={duckW} mine={mine} />
						</div>
					</div>
				);
			})}

			{/* vịt bị bỏ lại phía sau khung hình */}
			{racers.map((r, i) =>
				crowded && r.id !== selfId ? null : (
				<div
					key={r.id}
					ref={(n) => void (chipRefs.current[r.id] = n)}
					className="pointer-events-none absolute left-1 hidden items-center gap-0.5 rounded-full bg-black/45 px-1.5 text-[10px] font-bold text-white"
					style={{ top: duckY(i) - 8, zIndex: 40 }}
				>
					◀ {r.number}
				</div>
				),
			)}

			{/* cây cỏ phía trước */}
			<div ref={(n) => void (layerRefs.current.front = n)} className="pointer-events-none absolute inset-x-0 bottom-0 z-[45]" style={{ height: Math.min(60, H * 0.1), backgroundImage: BG.front, backgroundSize: `auto ${Math.min(60, H * 0.1)}px`, backgroundRepeat: 'repeat-x' }} />

			{/* HUD */}
			<div className="pointer-events-none absolute inset-x-2 top-2 z-[80] flex items-start gap-2 [&>*]:pointer-events-auto" data-no-tap>
				<div className="min-w-0 flex-1 space-y-1">
					{hud}
					{t0 != null && leader && (
						<div className="inline-flex max-w-full items-center gap-1 rounded-full bg-black/45 px-2 py-0.5 text-xs font-bold text-white">
							🥇 <span className="truncate">{leader.number}. {leader.name}</span> dẫn đầu
						</div>
					)}
				</div>
				<button
					type="button"
					onClick={toggleFull}
					className="shrink-0 rounded-lg bg-black/45 px-2.5 py-1.5 text-sm font-bold text-white hover:bg-black/60"
					title={full !== 'off' ? 'Thoát toàn màn hình (Esc)' : 'Toàn màn hình'}
				>
					{full !== 'off' ? '✕ Thoát' : '⛶ Toàn màn hình'}
				</button>
			</div>
			{/* bản đồ nhỏ */}
			{t0 != null && (
				<div className="absolute inset-x-4 z-50" style={{ top: Math.max(40, skyH - 40) }} data-no-tap>
					<div className="relative h-2 rounded-full bg-white/50">
						<div className="absolute -top-1 right-0 text-[10px]">🏁</div>
						{racers.map((r) => (
							<div
								key={r.id}
								ref={(n) => void (miniRefs.current[r.id] = n)}
								className={`absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white ${r.id === selfId ? 'z-10 ring-2 ring-amber-400' : ''}`}
								style={{ left: 0, background: COLORS[r.style.color] }}
							/>
						))}
					</div>
				</div>
			)}

			<div ref={nearRef} className="pointer-events-none absolute left-1/2 z-50 -translate-x-1/2 rounded-full bg-amber-400 px-3 py-1 text-sm font-black text-gray-900 shadow-lg transition-opacity duration-500" style={{ top: skyH + 8, opacity: 0 }}>
				Sắp về đích!
			</div>

			<div ref={countRef} className="pointer-events-none absolute inset-0 z-[60] hidden items-center justify-center text-8xl font-black text-white" style={{ textShadow: '0 4px 0 #f59e0b, 0 8px 24px rgba(0,0,0,.35)' }} />

			{winner && !overlay && (
				<div className="pointer-events-none absolute left-1/2 z-[60] -translate-x-1/2 animate-bounce rounded-2xl bg-white/95 px-4 py-2 text-center text-lg font-black text-gray-900 shadow-xl" style={{ top: skyH * 0.45 }}>
					🏆 {winner.number}. {winner.name} về nhất!
				</div>
			)}
			{winner && <Confetti key={winner.id} />}

			{tapFx.map((t) => (
				<div key={t.id} className="tap-fx pointer-events-none absolute z-[55] text-2xl font-black text-white" style={{ left: t.x - 12, top: t.y - 16 }}>
					+
				</div>
			))}

			{bottom && (
				<div className="absolute inset-x-2 bottom-2 z-[56]" data-no-tap>
					{bottom}
				</div>
			)}
			{overlay && (
				<div className="absolute inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-slate-900/35 p-3 backdrop-blur-[2px]" data-no-tap>
					{overlay}
				</div>
			)}

			<StageStyles />
		</div>
	);

	// Toàn màn hình kiểu CSS: đưa sân ra thẳng <body> để không bị khung cha (transform/overflow) cắt;
	// để lại một khoảng trống cùng chiều cao cho trang khỏi nhảy.
	if (full === 'css') {
		return (
			<>
				<div className="rounded-2xl bg-sky-100" style={{ height: 'clamp(340px, 62vw, 620px)' }} />
				{createPortal(stage, document.body)}
			</>
		);
	}
	return stage;
}

function Confetti() {
	const bits = useRef(
		Array.from({ length: 48 }, (_, i) => ({
			left: Math.random() * 100,
			delay: Math.random() * 0.6,
			dur: 1.6 + Math.random() * 1.4,
			color: COLORS[i % COLORS.length],
			rot: Math.random() * 360,
			w: 6 + Math.random() * 6,
		})),
	).current;
	return (
		<div className="pointer-events-none absolute inset-0 z-[65] overflow-hidden">
			{bits.map((b, i) => (
				<span
					key={i}
					className="confetti absolute top-0"
					style={{ left: `${b.left}%`, width: b.w, height: b.w * 0.5, background: b.color, animationDelay: `${b.delay}s`, animationDuration: `${b.dur}s`, transform: `rotate(${b.rot}deg)` }}
				/>
			))}
		</div>
	);
}

function StageStyles() {
	return (
		<style>{`
			.duck-stage { touch-action: manipulation; -webkit-tap-highlight-color: transparent; }
			.duck-stage:fullscreen { width: 100vw; height: 100vh; border-radius: 0; }
			@keyframes duckBob { 0%,100% { transform: translateY(0) rotate(-2.5deg) } 50% { transform: translateY(-3px) rotate(2.5deg) } }
			.duck-bob { animation: duckBob 0.9s ease-in-out infinite; }
			.wake { border-radius: 50%; background: radial-gradient(ellipse at right, rgba(255,255,255,.95), rgba(255,255,255,.45) 45%, transparent 70%); filter: blur(1px); transition: opacity .2s; }
			.finish-band { background: repeating-conic-gradient(#111827 0 25%, #fff 0 50%) 0 0 / 14px 14px; box-shadow: 0 0 0 2px rgba(255,255,255,.5); }
			@keyframes countPop { 0% { transform: scale(2.2); opacity: 0 } 30% { transform: scale(1); opacity: 1 } 100% { transform: scale(.9); opacity: .9 } }
			.count-pop { animation: countPop .9s ease-out; }
			@keyframes confFall { 0% { transform: translateY(-20px) rotate(0) } 100% { transform: translateY(110vh) rotate(720deg) } }
			.confetti { animation: confFall linear forwards; border-radius: 2px; }
			@keyframes tapFx { 0% { transform: scale(.6); opacity: 1 } 100% { transform: translateY(-30px) scale(1.4); opacity: 0 } }
			.tap-fx { animation: tapFx .5s ease-out forwards; text-shadow: 0 2px 6px rgba(0,0,0,.4); }
		`}</style>
	);
}
