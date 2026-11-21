// Logic thuần của game Đua Vịt: kiểu dữ liệu, chọn host, vịt máy, xếp hạng.
// Không phụ thuộc React hay Trystero để dễ đọc và dễ kiểm tra.

export type InputMode = 'any' | 'tap' | 'voice';

export type RoomConfig = {
	maxPlayers: number; // 2..8 người thật
	trackLength: number; // mét, 50..500
	estTime: number; // giây về đích nếu chỉ chạy tốc độ mặc định, 15..120
	inputMode: InputMode; // cách điều khiển được phép
	bots: number; // số vịt máy 0..4
};

export type Player = { id: string; name: string; ready: boolean; joinedAt: number };

export type Phase = 'lobby' | 'racing';

export type RoomState = {
	hostId: string;
	createdAt: number; // lúc phòng được tạo, dùng để phân xử khi có 2 host
	config: RoomConfig;
	players: Player[]; // theo thứ tự vào phòng
	phase: Phase;
	round: number;
};

export type Racer = { id: string; name: string; color: string; bot: boolean };

export type StartMsg = { round: number; seed: number; config: RoomConfig; racers: Racer[] };

export type Ranked = Racer & { place: number; timeMs: number | null };

export const LIMITS = {
	maxPlayers: [2, 8],
	trackLength: [50, 500],
	estTime: [15, 120],
	bots: [0, 4],
} as const;

/** Boost tối đa của người chơi (tốc độ ×2.5) và của vịt máy (≈ ×1.6). */
export const MAX_BOOST = 1.5;
export const BOT_MAX_BOOST = 0.6;
export const COUNTDOWN_MS = 3000;
export const SEARCH_MS = 5000;

export const DEFAULT_CONFIG: RoomConfig = {
	maxPlayers: 4,
	trackLength: 100,
	estTime: 30,
	inputMode: 'any',
	bots: 0,
};

export const COLORS = [
	'#f59e0b', '#3b82f6', '#ef4444', '#10b981', '#8b5cf6', '#ec4899',
	'#14b8a6', '#f97316', '#6366f1', '#84cc16', '#06b6d4', '#a855f7',
];

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function sanitizeConfig(c: Partial<RoomConfig> | undefined): RoomConfig {
	const m = { ...DEFAULT_CONFIG, ...(c || {}) };
	const num = (v: unknown, [lo, hi]: readonly [number, number], d: number) =>
		Number.isFinite(Number(v)) ? clamp(Math.round(Number(v)), lo, hi) : d;
	return {
		maxPlayers: num(m.maxPlayers, LIMITS.maxPlayers, DEFAULT_CONFIG.maxPlayers),
		trackLength: num(m.trackLength, LIMITS.trackLength, DEFAULT_CONFIG.trackLength),
		estTime: num(m.estTime, LIMITS.estTime, DEFAULT_CONFIG.estTime),
		inputMode: m.inputMode === 'tap' || m.inputMode === 'voice' ? m.inputMode : 'any',
		bots: num(m.bots, LIMITS.bots, DEFAULT_CONFIG.bots),
	};
}

/** Mã phòng: chữ thường, số, gạch ngang; tối đa 32 ký tự. */
export function normalizeRoomId(raw: string): string {
	return raw
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.replace(/đ/gi, 'd')
		.toLowerCase()
		.replace(/[^a-z0-9-]+/g, '-')
		.replace(/-+/g, '-')
		.replace(/^-|-$/g, '')
		.slice(0, 32);
}

export function randomRoomId(): string {
	const words = ['ao', 'ho', 'song', 'suoi', 'dam', 'bien', 'vung', 'kenh'];
	const w = words[Math.floor(Math.random() * words.length)];
	return `vit-${w}-${Math.floor(1000 + Math.random() * 9000)}`;
}

export const cleanName = (s: string) => s.replace(/\s+/g, ' ').trim().slice(0, 20);

/** Ai thắng khi có 2 host cùng phòng: phòng tạo sớm hơn, hoà thì id nhỏ hơn. */
export function betterHost(a: { createdAt: number; hostId: string }, b: { createdAt: number; hostId: string }) {
	if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? a : b;
	return a.hostId < b.hostId ? a : b;
}

/** Host mới khi host cũ rời: người vào sớm nhất còn lại (mọi máy tự tính ra cùng một người). */
export function nextHost(players: Player[], leftId: string): string | null {
	const rest = players.filter((p) => p.id !== leftId).sort((a, b) => a.joinedAt - b.joinedAt || (a.id < b.id ? -1 : 1));
	return rest[0]?.id ?? null;
}

export const baseSpeed = (c: RoomConfig) => c.trackLength / c.estTime; // m/s

// ---------- Vịt máy: đường chạy tất định từ seed ----------

export function mulberry32(seed: number) {
	let a = seed >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

const BOT_STEP_MS = 50;

export type BotTrack = { pos: Float32Array; finishMs: number };

/** Mô phỏng 1 vịt máy theo bước 50ms: nhịp lên xuống ngẫu nhiên, trần BOT_MAX_BOOST. */
export function simulateBot(seed: number, index: number, c: RoomConfig): BotTrack {
	const rnd = mulberry32((seed ^ Math.imul(index + 1, 0x9e3779b1)) >>> 0);
	const f1 = 0.15 + rnd() * 0.35; // nhịp chậm (Hz)
	const f2 = 0.6 + rnd() * 0.9; // nhịp nhanh
	const p1 = rnd() * Math.PI * 2;
	const p2 = rnd() * Math.PI * 2;
	const effort = 0.55 + rnd() * 0.45; // "sức" riêng của từng con
	const base = baseSpeed(c);
	const L = c.trackLength;
	const steps = Math.ceil((c.estTime * 1000) / BOT_STEP_MS) + 2;
	const pos = new Float32Array(steps + 1);
	let d = 0;
	let finishMs = c.estTime * 1000;
	let burst = 0;
	for (let i = 1; i <= steps; i++) {
		const t = (i * BOT_STEP_MS) / 1000;
		if (burst <= 0 && rnd() < 0.01) burst = 0.6 + rnd() * 1.2; // thỉnh thoảng bứt tốc
		const wave = 0.45 + 0.3 * Math.sin(2 * Math.PI * f1 * t + p1) + 0.2 * Math.sin(2 * Math.PI * f2 * t + p2);
		const level = clamp(wave * effort + (burst > 0 ? 0.35 : 0), 0, 1);
		burst -= BOT_STEP_MS / 1000;
		const prev = d;
		d += base * (1 + BOT_MAX_BOOST * level) * (BOT_STEP_MS / 1000);
		if (d >= L) {
			finishMs = ((i - 1) + (L - prev) / (d - prev)) * BOT_STEP_MS;
			d = L;
			pos[i] = L;
			pos.fill(L, i);
			break;
		}
		pos[i] = d;
	}
	return { pos, finishMs };
}

export function botDistance(track: BotTrack, ms: number): number {
	if (ms <= 0) return 0;
	const i = ms / BOT_STEP_MS;
	const lo = Math.floor(i);
	if (lo >= track.pos.length - 1) return track.pos[track.pos.length - 1];
	return track.pos[lo] + (track.pos[lo + 1] - track.pos[lo]) * (i - lo);
}

// ---------- Xếp hạng ----------

/** Xếp theo thời gian về đích, hoà thì so id. Ai không về (rời phòng) xếp cuối. */
export function rankRacers(racers: Racer[], finish: Record<string, number>): Ranked[] {
	const done = racers
		.filter((r) => finish[r.id] != null)
		.sort((a, b) => finish[a.id] - finish[b.id] || (a.id < b.id ? -1 : 1));
	const dnf = racers.filter((r) => finish[r.id] == null);
	return [
		...done.map((r, i) => ({ ...r, place: i + 1, timeMs: finish[r.id] })),
		...dnf.map((r) => ({ ...r, place: 0, timeMs: null })),
	];
}

export const fmtTime = (ms: number) => (ms / 1000).toFixed(2) + ' s';
