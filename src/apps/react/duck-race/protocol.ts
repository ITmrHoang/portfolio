// Logic thuần của game Đua Vịt: kiểu dữ liệu, kiểu dáng vịt, chọn host, vịt máy, xếp hạng.
// Không phụ thuộc React hay Trystero để dễ đọc và dễ kiểm tra.

export type InputMode = 'any' | 'tap' | 'voice';

// ---------- Kiểu dáng vịt ----------

export const COLORS = [
	'#facc15', '#fb923c', '#f472b6', '#a78bfa', '#60a5fa', '#34d399',
	'#f87171', '#e5e7eb', '#a3e635', '#22d3ee', '#c084fc', '#fbbf24',
];
export const HATS = ['none', 'cap', 'beanie', 'tophat', 'crown', 'chef', 'xmas', 'cowboy', 'flower', 'headband'] as const;
export const OUTFITS = ['none', 'scarf', 'bowtie', 'ring', 'cape', 'jersey'] as const;
export const GLASSES = ['none', 'sun', 'round', 'star'] as const;
export type HatId = (typeof HATS)[number];
export type OutfitId = (typeof OUTFITS)[number];
export type GlassesId = (typeof GLASSES)[number];

export type DuckStyle = { color: number; hat: HatId; outfit: OutfitId; glasses: GlassesId };

export const HAT_LABEL: Record<HatId, string> = {
	none: 'Không', cap: 'Mũ lưỡi trai', beanie: 'Mũ len', tophat: 'Mũ chóp', crown: 'Vương miện',
	chef: 'Mũ đầu bếp', xmas: 'Mũ Noel', cowboy: 'Mũ cao bồi', flower: 'Hoa cài', headband: 'Băng đô',
};
export const OUTFIT_LABEL: Record<OutfitId, string> = {
	none: 'Không', scarf: 'Khăn quàng', bowtie: 'Nơ', ring: 'Phao bơi', cape: 'Áo choàng', jersey: 'Áo số',
};
export const GLASSES_LABEL: Record<GlassesId, string> = { none: 'Không', sun: 'Kính râm', round: 'Kính tròn', star: 'Kính sao' };

const pick = <T,>(arr: readonly T[], r: () => number) => arr[Math.floor(r() * arr.length)];

export function randomStyle(r: () => number = Math.random): DuckStyle {
	return {
		color: Math.floor(r() * COLORS.length),
		hat: r() < 0.15 ? 'none' : pick(HATS.slice(1), r),
		outfit: r() < 0.3 ? 'none' : pick(OUTFITS.slice(1), r),
		glasses: r() < 0.6 ? 'none' : pick(GLASSES.slice(1), r),
	};
}

export function sanitizeStyle(s: any): DuckStyle {
	const color = Number.isInteger(s?.color) && s.color >= 0 && s.color < COLORS.length ? s.color : 0;
	return {
		color,
		hat: (HATS as readonly string[]).includes(s?.hat) ? s.hat : 'none',
		outfit: (OUTFITS as readonly string[]).includes(s?.outfit) ? s.outfit : 'none',
		glasses: (GLASSES as readonly string[]).includes(s?.glasses) ? s.glasses : 'none',
	};
}

// ---------- Tên ngẫu nhiên ----------

const NAME_A = ['Vịt', 'Bé', 'Cô', 'Anh', 'Chú', 'Nàng', 'Ông', 'Cậu'];
const NAME_B = [
	'Bầu', 'Xiêm', 'Cỏ', 'Mít', 'Na', 'Su Su', 'Bí Đỏ', 'Cốm', 'Tôm', 'Tép', 'Kẹo', 'Mochi',
	'Bánh Bao', 'Xôi', 'Chè', 'Nấm', 'Đậu', 'Bắp', 'Gạo', 'Bông', 'Tia Chớp', 'Lốc Xoáy',
	'Mập', 'Lém', 'Sóc', 'Mây', 'Gió', 'Sấm', 'Tí Hon', 'Lạc', 'Vừng', 'Quẩy',
];

export function randomNames(n: number, r: () => number = Math.random): string[] {
	const out = new Set<string>();
	let guard = 0;
	while (out.size < n && guard++ < 500) out.add(`${pick(NAME_A, r)} ${pick(NAME_B, r)}`);
	let i = 1;
	while (out.size < n) out.add(`Vịt số ${i++}`);
	return [...out];
}

// ---------- Cấu hình phòng ----------

export type BotEntry = { name: string; style: DuckStyle };

export type RoomConfig = {
	maxPeople: number; // số người tối đa trong phòng (cả người đua lẫn người xem), 2..100
	trackLength: number; // mét, 50..500
	estTime: number; // giây về đích ở tốc độ mặc định, 10..120
	inputMode: InputMode; // cách điều khiển của người thật
};

export type Player = { id: string; name: string; ready: boolean; joinedAt: number; style: DuckStyle };

/** Một ô đua: trống (chờ người vào), người thật đã nhận ô, hoặc vịt máy host thêm. */
export type Seat = { kind: 'empty' } | { kind: 'human'; id: string } | { kind: 'bot'; name: string; style: DuckStyle };

export type Phase = 'lobby' | 'racing';

export type RoomState = {
	hostId: string;
	createdAt: number; // lúc phòng được tạo, dùng để phân xử khi có 2 host
	epoch: number; // tăng mỗi lần đổi host; host mới hơn thắng host cũ quay lại
	v: number; // số phiên bản trạng thái, tăng mỗi lần host gửi thay đổi
	config: RoomConfig;
	players: Player[]; // mọi người trong phòng, theo thứ tự vào
	seats: Seat[]; // các ô đua; người không ngồi ô nào là người xem
	phase: Phase;
	round: number;
};

export type Racer = { id: string; name: string; number: number; style: DuckStyle; bot: boolean };

/** elapsed/finished: chỉ gửi cho người vào giữa ván, để họ xem tiếp từ đúng thời điểm. */
export type StartMsg = {
	round: number;
	seed: number;
	config: RoomConfig;
	racers: Racer[];
	elapsed?: number;
	finished?: Record<string, number>;
};

export type Ranked = Racer & { place: number; timeMs: number | null };

export const LIMITS = {
	maxPeople: [2, 100],
	trackLength: [50, 500],
	estTime: [10, 120],
	seats: [2, 100],
} as const;

/** Boost tối đa của người chơi (tốc độ ×2.5) và của vịt máy khi đua cùng người (≈ ×1.6). */
export const MAX_BOOST = 1.5;
export const BOT_MAX_BOOST = 0.6;
export const COUNTDOWN_MS = 3000;
export const SEARCH_MS = 5000;
export const DEFAULT_SEATS = 4;

export const DEFAULT_CONFIG: RoomConfig = {
	maxPeople: 20,
	trackLength: 100,
	estTime: 30,
	inputMode: 'any',
};

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export const cleanName = (s: string) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, 20);

export function sanitizeConfig(c: Partial<RoomConfig> | undefined): RoomConfig {
	const m = { ...DEFAULT_CONFIG, ...(c || {}) };
	const num = (v: unknown, [lo, hi]: readonly [number, number], d: number) =>
		Number.isFinite(Number(v)) ? clamp(Math.round(Number(v)), lo, hi) : d;
	return {
		maxPeople: num(m.maxPeople, LIMITS.maxPeople, DEFAULT_CONFIG.maxPeople),
		trackLength: num(m.trackLength, LIMITS.trackLength, DEFAULT_CONFIG.trackLength),
		estTime: num(m.estTime, LIMITS.estTime, DEFAULT_CONFIG.estTime),
		inputMode: m.inputMode === 'tap' || m.inputMode === 'voice' ? m.inputMode : 'any',
	};
}

export function sanitizeSeats(raw: unknown): Seat[] {
	const arr = Array.isArray(raw) ? raw.slice(0, LIMITS.seats[1]) : [];
	const seen = new Set<string>();
	const seats: Seat[] = arr.map((s: any) => {
		if (s?.kind === 'human' && typeof s.id === 'string' && !seen.has(s.id)) {
			seen.add(s.id);
			return { kind: 'human', id: s.id };
		}
		if (s?.kind === 'bot') return { kind: 'bot', name: cleanName(s.name) || 'Vịt máy', style: sanitizeStyle(s.style) };
		return { kind: 'empty' };
	});
	while (seats.length < LIMITS.seats[0]) seats.push({ kind: 'empty' });
	return seats;
}

// ---------- Thao tác trên các ô (host thực hiện, trả về mảng mới) ----------

export const seatOf = (seats: Seat[], id: string) => seats.findIndex((s) => s.kind === 'human' && s.id === id);

/** Người `id` nhận ô `index` (hoặc ô trống đầu tiên). Hết ô trống thì thêm ô nếu còn chỗ. */
export function takeSeat(seats: Seat[], id: string, index?: number): Seat[] | null {
	const out = seats.map((s) => (s.kind === 'human' && s.id === id ? ({ kind: 'empty' } as Seat) : s));
	let i = index != null && out[index]?.kind === 'empty' ? index : out.findIndex((s) => s.kind === 'empty');
	if (i < 0) {
		if (out.length >= LIMITS.seats[1]) return null;
		out.push({ kind: 'empty' });
		i = out.length - 1;
	}
	out[i] = { kind: 'human', id };
	return out;
}

export const leaveSeat = (seats: Seat[], id: string): Seat[] =>
	seats.map((s) => (s.kind === 'human' && s.id === id ? { kind: 'empty' } : s));

/** Đổi số ô: thêm ô trống; bớt thì bỏ ô trống ở cuối trước, rồi tới vịt máy; không bao giờ đẩy người thật ra. */
export function resizeSeats(seats: Seat[], n: number): Seat[] {
	const humans = seats.filter((s) => s.kind === 'human').length;
	const target = clamp(n, Math.max(LIMITS.seats[0], humans), LIMITS.seats[1]);
	const out = [...seats];
	while (out.length < target) out.push({ kind: 'empty' });
	for (const kind of ['empty', 'bot'] as const) {
		for (let i = out.length - 1; i >= 0 && out.length > target; i--) if (out[i].kind === kind) out.splice(i, 1);
	}
	return out;
}

/** Điền vịt máy (tên ngẫu nhiên) vào mọi ô trống. */
export function fillBots(seats: Seat[]): Seat[] {
	const taken = new Set(seats.flatMap((s) => (s.kind === 'bot' ? [s.name] : [])));
	const names = randomNames(seats.length * 2 + 4).filter((n) => !taken.has(n));
	return seats.map((s) => (s.kind === 'empty' ? { kind: 'bot', name: names.shift() ?? 'Vịt máy', style: randomStyle() } : s));
}

/**
 * Danh sách tên vịt máy, mỗi dòng một vịt. Vịt máy cũ được đổi tên theo thứ tự (giữ trang phục),
 * dòng thừa điền vào ô trống rồi thêm ô mới; thiếu dòng thì bỏ bớt ô vịt máy.
 */
export function setBotNames(seats: Seat[], names: string[]): Seat[] {
	const list = names.map(cleanName).filter(Boolean);
	const out: Seat[] = [];
	let k = 0;
	for (const s of seats) {
		if (s.kind !== 'bot') out.push(s);
		else if (k < list.length) out.push({ kind: 'bot', name: list[k++], style: s.style });
	}
	for (let i = 0; i < out.length && k < list.length; i++) {
		if (out[i].kind === 'empty') out[i] = { kind: 'bot', name: list[k++], style: randomStyle() };
	}
	while (k < list.length && out.length < LIMITS.seats[1]) out.push({ kind: 'bot', name: list[k++], style: randomStyle() });
	while (out.length < LIMITS.seats[0]) out.push({ kind: 'empty' });
	return out;
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

type HostClaim = Pick<RoomState, 'createdAt' | 'epoch' | 'hostId' | 'players'>;
const hostJoinedAt = (s: HostClaim) => s.players.find((p) => p.id === s.hostId)?.joinedAt ?? Infinity;

/**
 * Hai máy cùng nhận là host (tạo phòng cùng lúc, hoặc host cũ quay lại sau khi đã đổi host): ai thắng?
 * 1) phòng tạo sớm hơn, 2) lượt đổi host mới hơn (epoch lớn hơn), 3) người vào phòng sớm hơn, 4) id nhỏ hơn.
 */
export function isBetterHost(a: HostClaim, b: HostClaim): boolean {
	if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt;
	if (a.epoch !== b.epoch) return a.epoch > b.epoch;
	const ja = hostJoinedAt(a);
	const jb = hostJoinedAt(b);
	if (ja !== jb) return ja < jb;
	return a.hostId < b.hostId;
}

/** Thứ tự kế nhiệm khi host mất: người vào phòng sớm nhất còn lại đứng đầu. */
export function successionOrder(players: Player[], leftId: string): string[] {
	return players
		.filter((p) => p.id !== leftId)
		.sort((a, b) => a.joinedAt - b.joinedAt || (a.id < b.id ? -1 : 1))
		.map((p) => p.id);
}

export const baseSpeed = (c: RoomConfig) => c.trackLength / c.estTime; // m/s

/** Danh sách vịt sẽ đua: các ô đã có người hoặc vịt máy, số áo = số thứ tự ô. */
export function lineup(seats: Seat[], players: Player[]): Racer[] {
	const out: Racer[] = [];
	seats.forEach((s, i) => {
		if (s.kind === 'bot') out.push({ id: `bot-${i}`, name: s.name, number: i + 1, style: s.style, bot: true });
		else if (s.kind === 'human') {
			const p = players.find((x) => x.id === s.id);
			if (p) out.push({ id: p.id, name: p.name, number: i + 1, style: p.style, bot: false });
		}
	});
	return out;
}

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

const smooth = (t: number) => t * t * (3 - 2 * t);

/**
 * Mô phỏng 1 vịt máy theo bước 50ms.
 * - 'gentle' (đua cùng người thật): nhịp lên xuống, trần BOT_MAX_BOOST, không quá nhanh.
 * - 'race' (phòng toàn vịt máy): tốc độ đổi liên tục quanh mức mặc định, có bứt tốc và hụt hơi,
 *   nên thứ tự thay đổi nhiều lần và kết quả khó đoán.
 */
export function simulateBot(seed: number, index: number, c: RoomConfig, profile: 'gentle' | 'race'): BotTrack {
	const rnd = mulberry32((seed ^ Math.imul(index + 1, 0x9e3779b1)) >>> 0);
	const base = baseSpeed(c);
	const L = c.trackLength;
	const maxMs = c.estTime * 1000 * 3;
	const steps = Math.ceil(maxMs / BOT_STEP_MS) + 2;
	const pos = new Float32Array(steps + 1);
	let d = 0;
	let finishMs = maxMs;

	// gentle
	const f1 = 0.15 + rnd() * 0.35;
	const f2 = 0.6 + rnd() * 0.9;
	const p1 = rnd() * Math.PI * 2;
	const p2 = rnd() * Math.PI * 2;
	const effort = 0.55 + rnd() * 0.45;
	let burst = 0;
	// race: các mốc tốc độ ngẫu nhiên mỗi ~0.8–2s, nội suy mượt
	const keyGap = () => 800 + rnd() * 1200;
	const keyVal = () => {
		const r = rnd();
		if (r < 0.1) return 1.5 + rnd() * 0.35; // bứt tốc
		if (r < 0.2) return 0.55 + rnd() * 0.2; // hụt hơi
		return 0.8 + rnd() * 0.45;
	};
	let kFrom = 0.9 + rnd() * 0.2;
	let kTo = keyVal();
	let kStart = 0;
	let kLen = keyGap();

	for (let i = 1; i <= steps; i++) {
		const tMs = i * BOT_STEP_MS;
		let factor: number;
		if (profile === 'gentle') {
			const t = tMs / 1000;
			if (burst <= 0 && rnd() < 0.01) burst = 0.6 + rnd() * 1.2;
			const wave = 0.45 + 0.3 * Math.sin(2 * Math.PI * f1 * t + p1) + 0.2 * Math.sin(2 * Math.PI * f2 * t + p2);
			factor = 1 + BOT_MAX_BOOST * clamp(wave * effort + (burst > 0 ? 0.35 : 0), 0, 1);
			burst -= BOT_STEP_MS / 1000;
		} else {
			while (tMs > kStart + kLen) {
				kStart += kLen;
				kFrom = kTo;
				kTo = keyVal();
				kLen = keyGap();
			}
			factor = kFrom + (kTo - kFrom) * smooth((tMs - kStart) / kLen);
		}
		const prev = d;
		d += base * factor * (BOT_STEP_MS / 1000);
		if (d >= L) {
			finishMs = (i - 1 + (L - prev) / (d - prev)) * BOT_STEP_MS;
			pos.fill(L, i);
			d = L;
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

/** Xếp theo thời gian về đích, hoà thì so số áo. Ai không về (rời phòng) xếp cuối. */
export function rankRacers(racers: Racer[], finish: Record<string, number>): Ranked[] {
	const done = racers
		.filter((r) => finish[r.id] != null)
		.sort((a, b) => finish[a.id] - finish[b.id] || a.number - b.number);
	const dnf = racers.filter((r) => finish[r.id] == null);
	return [
		...done.map((r, i) => ({ ...r, place: i + 1, timeMs: finish[r.id] })),
		...dnf.map((r) => ({ ...r, place: 0, timeMs: null })),
	];
}

export const fmtTime = (ms: number) => (ms / 1000).toFixed(2) + ' s';
