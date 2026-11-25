// Kết nối P2P cho game Đua Vịt bằng Trystero (WebRTC, signaling qua relay Nostr công cộng).
//
// Kết nối hình sao để chơi được đông người (tới ~100):
// - Host vào phòng ở chế độ "active", khách vào ở chế độ "passive" của Trystero: khách chỉ nối với host,
//   không nối với nhau (mỗi khách 1 kết nối, host N-1 kết nối).
// - Host giữ trạng thái phòng (người, ô đua, luật), nhận/từ chối người mới, gom vị trí rồi phát cho cả phòng.
// - Mỗi máy tự chạy vịt của mình (ấn/hét → tốc độ); vịt máy tính lại từ seed trên mọi máy.
//   Nên host mất kết nối giữa ván thì ván vẫn chạy tiếp trên từng máy.
// - Host mất kết nối: chờ HOST_GRACE_MS xem host có quay lại không; không thì người vào phòng sớm nhất
//   còn lại tự làm host (nếu người đó cũng đã đi thì người kế tiếp, mỗi người chờ thêm SUCCESSION_STEP_MS).
import type { MessageAction, Room } from 'trystero';
import {
	COUNTDOWN_MS,
	DEFAULT_SEATS,
	MAX_BOOST,
	SEARCH_MS,
	baseSpeed,
	cleanName,
	fillBots,
	isBetterHost,
	leaveSeat,
	lineup,
	rankRacers,
	resizeSeats,
	sanitizeConfig,
	sanitizeSeats,
	sanitizeStyle,
	seatOf,
	setBotNames,
	simulateBot,
	successionOrder,
	takeSeat,
	type BotTrack,
	type DuckStyle,
	type Player,
	type Ranked,
	type RoomConfig,
	type RoomState,
	type Seat,
	type StartMsg,
} from './protocol';

const APP_ID = 'himo-duck-race-v2';
const TICK_MS = 50;
const POS_EVERY_MS = 200; // khách → host
const POS_ALL_EVERY_MS = 250; // host → cả phòng
const STATE_FLUSH_MS = 120; // gom nhiều thay đổi thành một lần gửi
export const HOST_GRACE_MS = 10_000; // chờ host cũ quay lại
const SUCCESSION_STEP_MS = 5_000; // người kế tiếp chờ thêm
const RECONNECT_PRUNE_MS = 20_000; // host mới bỏ những người không nối lại
const END_GRACE_MS = 8_000; // host chờ thêm sau estTime rồi chốt kết quả
const LOCAL_END_GRACE_MS = 25_000; // không có host thì máy tự chốt

export type Status = 'connecting' | 'searching' | 'waiting' | 'joined' | 'full' | 'left';

export type RaceRun = StartMsg & {
	t0: number; // performance.now() lúc hết đếm ngược trên máy này
	participant: boolean;
	finish: Record<string, number>; // người thật đã về đích: id → ms
	left: Record<string, true>;
	bots: Record<string, BotTrack>;
	myD: number;
	lastTick: number;
	ended: boolean;
	results: Ranked[] | null;
};

type RaceReport = { round: number; d: number; finish?: number };
type Hello = { name: string; style: DuckStyle; race?: RaceReport };
type Patch = Pick<RoomState, 'hostId' | 'createdAt' | 'epoch' | 'v' | 'phase' | 'round'> & {
	config?: RoomConfig;
	seats?: Seat[];
	upsert?: Player[];
	remove?: string[];
};
type Ready = { ready: boolean };
type Pos = { round: number; d: number };
type PosAll = { round: number; d: (number | null)[] };
type Finish = { round: number; timeMs: number };
type Fin = { round: number; finish: Record<string, number>; ended?: boolean };
type Reject = { reason: 'full' };
type SeatOp = { op: 'take'; index?: number } | { op: 'leave' };
type Promote = { epoch: number };

type Acts = {
	hello: MessageAction<any>;
	state: MessageAction<any>;
	patch: MessageAction<any>;
	need: MessageAction<any>;
	reject: MessageAction<any>;
	ready: MessageAction<any>;
	seat: MessageAction<any>;
	start: MessageAction<any>;
	pos: MessageAction<any>;
	posAll: MessageAction<any>;
	finish: MessageAction<any>;
	fin: MessageAction<any>;
	promote: MessageAction<any>;
};

export class DuckRoomClient {
	selfId = '';
	status: Status = 'connecting';
	state: RoomState | null = null;
	race: RaceRun | null = null;
	notice = '';
	/** Đang mất host: thời điểm mất và lúc mình (nếu là người kế nhiệm) sẽ nhận làm host. */
	hostLost: { since: number; takeoverAt: number | null; rank: number | null; oldHostName: string } | null = null;
	/** Vị trí người khác (mét) nhận qua `posAll` (khách) hoặc `pos` (host). */
	remote: Record<string, number> = {};
	/** UI gán hàm đọc boost hiện tại (0..MAX_BOOST) từ ấn/micro. */
	getBoost: () => number = () => 0;

	private lib: typeof import('trystero') | null = null;
	private room: Room | null = null;
	private act = {} as Acts;
	private listeners = new Set<() => void>();
	private version = 0;
	private destroyed = false;
	private timers = new Set<ReturnType<typeof setTimeout>>();
	private searchTimer: ReturnType<typeof setTimeout> | undefined;
	private startTimer: ReturnType<typeof setTimeout> | undefined;
	private successionTimer: ReturnType<typeof setTimeout> | undefined;
	private pruneTimer: ReturnType<typeof setTimeout> | undefined;
	private flushTimer: ReturnType<typeof setTimeout> | undefined;
	private simTimer: ReturnType<typeof setInterval> | undefined;
	private helloSentTo = '';
	private lastPosSent = 0;
	private lastPosAll = 0;
	private lastRound = 0;
	private lastJoinedAt = 0;
	/** Thay đổi đang chờ gửi (host). */
	private pending = { upsert: new Set<string>(), remove: new Set<string>(), seats: false, config: false };
	/** Host mới: những người đã nối lại. */
	private reconnected = new Set<string>();

	constructor(
		public roomId: string,
		public name: string,
		public style: DuckStyle,
		private initialConfig: RoomConfig,
	) {}

	// ---------- store cho React (useSyncExternalStore) ----------
	subscribe = (fn: () => void) => {
		this.listeners.add(fn);
		return () => void this.listeners.delete(fn);
	};
	getVersion = () => this.version;
	private emit() {
		this.version++;
		this.listeners.forEach((f) => f());
	}

	get isHost() {
		return !!this.state && this.state.hostId === this.selfId && !this.hostLost;
	}
	get me(): Player | undefined {
		return this.state?.players.find((p) => p.id === this.selfId);
	}
	get mySeat() {
		return this.state ? seatOf(this.state.seats, this.selfId) : -1;
	}

	private later(fn: () => void, ms: number) {
		const t = setTimeout(() => {
			this.timers.delete(t);
			if (!this.destroyed) fn();
		}, ms);
		this.timers.add(t);
		return t;
	}

	// ---------- vào / rời phòng ----------
	async connect() {
		this.lib = await import('trystero');
		if (this.destroyed) return;
		this.selfId = this.lib.selfId;
		this.join(true);
		this.status = 'searching';
		this.emit();
		// Không thấy host trong SEARCH_MS → phòng chưa có, mình tạo và làm host.
		this.searchTimer = this.later(() => {
			if (!this.state) this.createRoom();
		}, SEARCH_MS);
	}

	/** (Vào lại) phòng ở chế độ passive (khách) hoặc active (host). Danh tính selfId giữ nguyên. */
	private join(passive: boolean) {
		const lib = this.lib!;
		const old = this.room;
		if (old) {
			old.onPeerJoin = null;
			old.onPeerLeave = null;
			old.leave().catch(() => {});
		}
		const room = lib.joinRoom({ appId: APP_ID, passive }, this.roomId, {
			onJoinError: (d) => {
				console.warn('[duck-race] join error', d);
				this.notice = 'Không kết nối được với một người (mạng có thể chặn WebRTC).';
				this.emit();
			},
		});
		this.room = room;
		const mk = (n: string) => room.makeAction(n) as MessageAction<any>;
		const a: Acts = {
			hello: mk('hello'),
			state: mk('state'),
			patch: mk('patch'),
			need: mk('need'),
			reject: mk('reject'),
			ready: mk('ready'),
			seat: mk('seat'),
			start: mk('start'),
			pos: mk('pos'),
			posAll: mk('posAll'),
			finish: mk('finish'),
			fin: mk('fin'),
			promote: mk('promote'),
		};
		this.act = a;
		const live = (fn: (d: any, peerId: string) => void) => (d: any, { peerId }: { peerId: string }) => {
			if (this.room === room && !this.destroyed) fn(d, peerId);
		};
		a.hello.onMessage = live((d, p) => this.onHello(p, d));
		a.state.onMessage = live((d, p) => this.onState(p, d));
		a.patch.onMessage = live((d, p) => this.onPatch(p, d));
		a.need.onMessage = live((_d, p) => this.isHost && this.sendState(p));
		a.reject.onMessage = live((_d, p) => this.onReject(p));
		a.ready.onMessage = live((d, p) => this.onReady(p, d));
		a.seat.onMessage = live((d, p) => this.onSeatOp(p, d));
		a.start.onMessage = live((d, p) => this.onStart(p, d));
		a.pos.onMessage = live((d, p) => this.onPos(p, d));
		a.posAll.onMessage = live((d, p) => this.onPosAll(p, d));
		a.finish.onMessage = live((d, p) => this.onFinish(p, d));
		a.fin.onMessage = live((d, p) => this.onFin(p, d));
		a.promote.onMessage = live((d, p) => this.onPromote(p, d));
		room.onPeerJoin = (p) => this.room === room && this.onPeerJoin(p);
		room.onPeerLeave = (p) => this.room === room && this.onPeerLeave(p);
	}

	/** Rời phòng. Host còn người khác trong phòng thì trao quyền host cho người kế nhiệm trước. */
	leave() {
		if (this.destroyed) return;
		const s = this.state;
		if (this.isHost && s && s.players.length > 1) {
			const next = successionOrder(s.players, this.selfId)[0];
			if (next) this.act.promote.send({ epoch: s.epoch + 1 } satisfies Promote, { target: next }).catch(() => {});
			const room = this.room;
			setTimeout(() => room?.leave().catch(() => {}), 400);
			this.room = null;
		}
		this.destroyed = true;
		this.timers.forEach(clearTimeout);
		clearInterval(this.simTimer);
		this.room?.leave().catch(() => {});
		this.room = null;
		if (this.status !== 'full') this.status = 'left';
		this.emit();
	}

	private createRoom() {
		const now = Date.now();
		this.lastJoinedAt = now;
		this.state = {
			hostId: this.selfId,
			createdAt: now,
			epoch: 0,
			v: 0,
			config: sanitizeConfig(this.initialConfig),
			players: [{ id: this.selfId, name: this.name, ready: false, joinedAt: now, style: this.style }],
			// Host mặc định nhận ô số 1; có thể rời ô để chỉ xem.
			seats: [{ kind: 'human', id: this.selfId }, ...Array.from({ length: DEFAULT_SEATS - 1 }, (): Seat => ({ kind: 'empty' }))],
			phase: 'lobby',
			round: 0,
		};
		this.status = 'joined';
		this.join(false);
		this.emit();
	}

	// ---------- host: gửi trạng thái ----------
	private sendState(target?: string) {
		if (!this.state || !this.room) return;
		this.act.state.send(this.state, target ? { target } : undefined).catch(() => {});
	}

	/** Host đổi trạng thái: cập nhật ngay trên máy mình, gom thay đổi rồi gửi bản vá nhỏ cho cả phòng. */
	private commit(next: RoomState, changed: { upsert?: string[]; remove?: string[]; seats?: boolean; config?: boolean } = {}) {
		this.state = next;
		changed.upsert?.forEach((id) => this.pending.upsert.add(id));
		changed.remove?.forEach((id) => {
			this.pending.remove.add(id);
			this.pending.upsert.delete(id);
		});
		if (changed.seats) this.pending.seats = true;
		if (changed.config) this.pending.config = true;
		if (!this.flushTimer) this.flushTimer = this.later(() => this.flush(), STATE_FLUSH_MS);
		this.emit();
	}
	private flush() {
		clearTimeout(this.flushTimer);
		this.flushTimer = undefined;
		const s = this.state;
		if (!this.isHost || !s) return;
		const v = s.v + 1;
		this.state = { ...s, v };
		const pd = this.pending;
		const patch: Patch = {
			hostId: s.hostId,
			createdAt: s.createdAt,
			epoch: s.epoch,
			v,
			phase: s.phase,
			round: s.round,
			...(pd.config ? { config: s.config } : {}),
			...(pd.seats ? { seats: s.seats } : {}),
			...(pd.upsert.size ? { upsert: s.players.filter((p) => pd.upsert.has(p.id)) } : {}),
			...(pd.remove.size ? { remove: [...pd.remove] } : {}),
		};
		this.pending = { upsert: new Set(), remove: new Set(), seats: false, config: false };
		this.act.patch.send(patch).catch(() => {});
	}

	// ---------- sự kiện mạng ----------
	private onPeerJoin(peerId: string) {
		if (this.isHost) {
			this.sendState(peerId);
			this.sendRaceTo(peerId);
		} else {
			// Khách chỉ nối với máy active (host) → chào để được nhận vào / báo đã nối lại.
			this.act.hello.send(this.hello(), { target: peerId }).catch(() => {});
		}
	}

	private hello(): Hello {
		const r = this.race;
		const race: RaceReport | undefined =
			r && r.participant ? { round: r.round, d: r.myD, ...(r.finish[this.selfId] != null ? { finish: r.finish[this.selfId] } : {}) } : undefined;
		return { name: this.name, style: this.style, ...(race ? { race } : {}) };
	}

	/** Đang có ván đua → gửi cho người mới / người nối lại để xem tiếp đúng thời điểm. */
	private sendRaceTo(peerId: string) {
		const r = this.race;
		if (!r || r.ended || this.state?.phase !== 'racing') return;
		const msg: StartMsg = {
			round: r.round,
			seed: r.seed,
			config: r.config,
			racers: r.racers,
			elapsed: performance.now() - r.t0 + COUNTDOWN_MS,
			finished: { ...r.finish },
		};
		this.act.start.send(msg, { target: peerId }).catch(() => {});
	}

	private onHello(peerId: string, d: Hello) {
		if (!this.isHost || !this.state) return;
		const name = cleanName(d?.name) || 'Vịt ẩn danh';
		const style = sanitizeStyle(d?.style);
		const s = this.state;
		this.reconnected.add(peerId);
		// Báo cáo ván đua (người nối lại sau khi đổi host): nhận thời gian về đích / vị trí.
		const r = this.race;
		if (r && d?.race && d.race.round === r.round && r.racers.some((x) => x.id === peerId && !x.bot)) {
			delete r.left[peerId];
			if (Number.isFinite(d.race.d)) this.remote[peerId] = Math.max(0, Math.min(r.config.trackLength, d.race.d));
			if (d.race.finish != null && Number.isFinite(d.race.finish) && r.finish[peerId] == null) {
				r.finish[peerId] = Math.max(0, d.race.finish);
				this.broadcastFin();
			}
		}
		const existing = s.players.find((p) => p.id === peerId);
		if (existing) {
			if (existing.name !== name || JSON.stringify(existing.style) !== JSON.stringify(style)) {
				this.commit({ ...s, players: s.players.map((p) => (p.id === peerId ? { ...p, name, style } : p)) }, { upsert: [peerId] });
			}
			return;
		}
		if (s.players.length >= s.config.maxPeople) {
			this.act.reject.send({ reason: 'full' } satisfies Reject, { target: peerId }).catch(() => {});
			return;
		}
		// Dùng đồng hồ của host để xếp thứ tự vào phòng (tránh lệch giờ giữa các máy).
		const joinedAt = Math.max(Date.now(), this.lastJoinedAt + 1);
		this.lastJoinedAt = joinedAt;
		this.commit({ ...s, players: [...s.players, { id: peerId, name, ready: false, joinedAt, style }] }, { upsert: [peerId] });
	}

	/** Nhận trạng thái đầy đủ từ một máy đang làm host. */
	private onState(peerId: string, raw: RoomState) {
		if (!raw || raw.hostId !== peerId || !Array.isArray(raw.players)) return; // chỉ tin host tự phát
		const incoming: RoomState = {
			...raw,
			epoch: Number(raw.epoch) || 0,
			v: Number(raw.v) || 0,
			config: sanitizeConfig(raw.config),
			seats: sanitizeSeats(raw.seats),
		};
		const cur = this.state;
		if (cur && this.isHost) {
			// Hai host cùng lúc: bên "tốt hơn" giữ quyền, bên kia lùi về làm khách.
			if (!isBetterHost(incoming, cur)) {
				this.sendState(peerId);
				return;
			}
			this.demote(incoming);
			return;
		}
		if (cur && cur.hostId !== incoming.hostId && !this.hostLost && !isBetterHost(incoming, cur)) return;
		this.adopt(incoming);
	}

	/** Khách nhận trạng thái của host (mới). */
	private adopt(s: RoomState) {
		clearTimeout(this.searchTimer);
		clearTimeout(this.successionTimer);
		const hostChanged = !!this.state && this.state.hostId !== s.hostId;
		if (this.hostLost) {
			const newHost = s.players.find((p) => p.id === s.hostId)?.name ?? '';
			this.notice = `Đã nối lại. ${newHost} đang là host.`;
			this.hostLost = null;
		} else if (hostChanged) {
			const newHost = s.players.find((p) => p.id === s.hostId)?.name ?? '';
			this.notice = `${newHost} đang là host.`;
		}
		this.state = s;
		this.lastJoinedAt = Math.max(this.lastJoinedAt, ...s.players.map((p) => p.joinedAt));
		const key = `${s.hostId}:${s.epoch}`;
		const inRoom = s.players.some((p) => p.id === this.selfId);
		this.status = inRoom ? 'joined' : 'waiting';
		// Chào host (mới) một lần: để được nhận vào, hoặc báo đã nối lại kèm thời gian về đích nếu đang đua.
		if (this.helloSentTo !== key && (!inRoom || hostChanged)) {
			this.helloSentTo = key;
			this.act.hello.send(this.hello(), { target: s.hostId }).catch(() => {});
		}
		this.emit();
	}

	/** Bản vá trạng thái từ host hiện tại; lệch phiên bản thì xin lại bản đầy đủ. */
	private onPatch(peerId: string, p: Patch) {
		const s = this.state;
		if (!p || p.hostId !== peerId || this.isHost) return;
		if (!s || s.hostId !== p.hostId || s.epoch !== p.epoch || p.v !== s.v + 1) {
			this.act.need.send(1, { target: peerId }).catch(() => {});
			return;
		}
		let players = s.players;
		if (p.remove?.length) players = players.filter((x) => !p.remove!.includes(x.id));
		for (const u of p.upsert ?? []) {
			const pl: Player = { id: String(u.id), name: cleanName(u.name) || 'Vịt', ready: !!u.ready, joinedAt: Number(u.joinedAt) || 0, style: sanitizeStyle(u.style) };
			const i = players.findIndex((x) => x.id === pl.id);
			players = i >= 0 ? players.map((x, j) => (j === i ? pl : x)) : [...players, pl];
		}
		this.state = {
			...s,
			v: p.v,
			phase: p.phase === 'racing' ? 'racing' : 'lobby',
			round: Number(p.round) || s.round,
			players,
			...(p.config ? { config: sanitizeConfig(p.config) } : {}),
			...(p.seats ? { seats: sanitizeSeats(p.seats) } : {}),
		};
		const inRoom = players.some((x) => x.id === this.selfId);
		this.status = inRoom ? 'joined' : 'waiting';
		this.emit();
	}

	private onReject(peerId: string) {
		if (this.state && peerId !== this.state.hostId) return;
		this.status = 'full';
		this.leave();
	}

	private onPeerLeave(peerId: string) {
		const s = this.state;
		if (!s) return;
		if (this.isHost) {
			// Khách rời phòng.
			delete this.remote[peerId];
			const r = this.race;
			if (r && !r.ended && r.racers.some((x) => x.id === peerId) && r.finish[peerId] == null) r.left[peerId] = true;
			if (s.players.some((p) => p.id === peerId)) {
				this.commit(
					{ ...s, players: s.players.filter((p) => p.id !== peerId), seats: leaveSeat(s.seats, peerId) },
					{ remove: [peerId], seats: true },
				);
				this.maybeAutoStart();
			}
			this.checkEnd();
			return;
		}
		if (peerId === s.hostId && !this.hostLost) this.onHostLost();
	}

	// ---------- đổi host ----------
	/** Khách mất kết nối với host: chờ host quay lại, không thì người kế nhiệm nhận làm host. */
	private onHostLost() {
		const s = this.state!;
		const oldHostName = s.players.find((p) => p.id === s.hostId)?.name ?? 'Host';
		const order = successionOrder(s.players, s.hostId);
		const rank = order.indexOf(this.selfId);
		const now = Date.now();
		clearTimeout(this.successionTimer);
		if (rank < 0) {
			this.hostLost = { since: now, takeoverAt: null, rank: null, oldHostName };
		} else {
			const wait = HOST_GRACE_MS + rank * SUCCESSION_STEP_MS;
			this.hostLost = { since: now, takeoverAt: now + wait, rank, oldHostName };
			const oldHost = s.hostId;
			this.successionTimer = this.later(() => this.takeOver(oldHost, true), wait);
		}
		this.notice = '';
		this.emit();
	}

	/** Nhận làm host (khi host cũ mất kết nối, hoặc được host trao quyền). */
	private takeOver(oldHost: string, dropOldHost: boolean, epoch?: number) {
		const s = this.state;
		if (!s || s.hostId !== oldHost) return; // đã có host khác
		clearTimeout(this.successionTimer);
		const oldName = s.players.find((p) => p.id === oldHost)?.name ?? 'Host';
		const players = dropOldHost ? s.players.filter((p) => p.id !== oldHost) : s.players;
		const seats = dropOldHost ? leaveSeat(s.seats, oldHost) : s.seats;
		const r = this.race;
		if (dropOldHost && r && !r.ended && r.racers.some((x) => x.id === oldHost) && r.finish[oldHost] == null) r.left[oldHost] = true;
		this.state = { ...s, hostId: this.selfId, epoch: epoch ?? s.epoch + 1, players, seats };
		if (s.phase === 'racing' && (!r || r.ended)) this.state.phase = 'lobby';
		this.hostLost = null;
		this.status = 'joined';
		this.notice = dropOldHost ? `${oldName} mất kết nối, bạn là host mới.` : `${oldName} đã trao quyền host cho bạn.`;
		this.reconnected = new Set([this.selfId, ...(dropOldHost ? [] : [oldHost])]);
		this.join(false);
		// Ai không nối lại với host mới sau một lúc thì coi như đã rời phòng.
		clearTimeout(this.pruneTimer);
		this.pruneTimer = this.later(() => this.pruneGone(), RECONNECT_PRUNE_MS);
		this.emit();
	}

	private pruneGone() {
		const s = this.state;
		if (!this.isHost || !s) return;
		const peers = this.room?.getPeers() ?? {};
		const gone = s.players.filter((p) => p.id !== this.selfId && !this.reconnected.has(p.id) && !peers[p.id]).map((p) => p.id);
		if (!gone.length) return;
		let seats = s.seats;
		for (const id of gone) seats = leaveSeat(seats, id);
		const r = this.race;
		if (r && !r.ended) for (const id of gone) if (r.racers.some((x) => x.id === id) && r.finish[id] == null) r.left[id] = true;
		this.commit({ ...s, players: s.players.filter((p) => !gone.includes(p.id)), seats }, { remove: gone, seats: true });
		this.checkEnd();
	}

	/** Host trao quyền cho người khác (mình ở lại làm khách). */
	handover(toId: string) {
		const s = this.state;
		if (!this.isHost || !s || toId === this.selfId || !s.players.some((p) => p.id === toId)) return;
		this.act.promote.send({ epoch: s.epoch + 1 } satisfies Promote, { target: toId }).catch(() => {});
		this.notice = 'Đang trao quyền host…';
		this.emit();
	}

	private onPromote(peerId: string, d: Promote) {
		const s = this.state;
		if (!s || peerId !== s.hostId || this.isHost) return;
		this.takeOver(peerId, false, Math.max(s.epoch + 1, Number(d?.epoch) || 0));
	}

	/** Host cũ gặp host "tốt hơn" (vd. đã trao quyền / bị thay khi mất mạng): lùi về làm khách. */
	private demote(winner: RoomState) {
		clearTimeout(this.startTimer);
		clearTimeout(this.pruneTimer);
		clearTimeout(this.flushTimer);
		this.flushTimer = undefined;
		this.notice = `${winner.players.find((p) => p.id === winner.hostId)?.name ?? 'Người khác'} đang là host.`;
		this.state = winner;
		this.helloSentTo = '';
		this.status = winner.players.some((p) => p.id === this.selfId) ? 'joined' : 'waiting';
		this.join(true); // nối lại ở chế độ khách → sẽ chào host mới
		this.emit();
	}

	// ---------- thao tác của người chơi ----------
	setReady(ready: boolean) {
		const s = this.state;
		if (!s || s.phase !== 'lobby' || !this.me) return;
		if (this.isHost) this.applyReady(this.selfId, ready);
		else {
			this.act.ready.send({ ready } satisfies Ready, { target: s.hostId }).catch(() => {});
			this.state = { ...s, players: s.players.map((p) => (p.id === this.selfId ? { ...p, ready } : p)) };
			this.emit();
		}
	}
	private onReady(peerId: string, d: Ready) {
		if (!this.isHost || !this.state || this.state.phase !== 'lobby') return;
		this.applyReady(peerId, !!d?.ready);
	}
	private applyReady(id: string, ready: boolean) {
		const s = this.state!;
		this.commit({ ...s, players: s.players.map((p) => (p.id === id ? { ...p, ready } : p)) }, { upsert: [id] });
		this.maybeAutoStart();
	}

	/** Đổi kiểu dáng vịt của mình (gửi lại hello để host cập nhật). */
	setStyle(style: DuckStyle) {
		this.style = sanitizeStyle(style);
		const s = this.state;
		if (!s) return;
		if (this.isHost) this.commit({ ...s, players: s.players.map((p) => (p.id === this.selfId ? { ...p, style: this.style } : p)) }, { upsert: [this.selfId] });
		else {
			this.act.hello.send(this.hello(), { target: s.hostId }).catch(() => {});
			this.emit();
		}
	}

	// ---------- ô đua ----------
	joinSeat(index?: number) {
		this.requestSeat({ op: 'take', index });
	}
	leaveMySeat() {
		this.requestSeat({ op: 'leave' });
	}
	private requestSeat(op: SeatOp) {
		if (!this.state || this.state.phase !== 'lobby') return;
		if (this.isHost) this.onSeatOp(this.selfId, op);
		else this.act.seat.send(op, { target: this.state.hostId }).catch(() => {});
	}
	private onSeatOp(peerId: string, d: SeatOp) {
		const s = this.state;
		if (!this.isHost || !s || s.phase !== 'lobby' || !s.players.some((p) => p.id === peerId)) return;
		let seats: Seat[] | null = s.seats;
		if (d?.op === 'take') seats = takeSeat(s.seats, peerId, Number.isInteger(d.index) ? d.index : undefined);
		else if (d?.op === 'leave') seats = leaveSeat(s.seats, peerId);
		if (!seats) return;
		// đổi ô thì xác nhận sẵn sàng lại
		this.commit({ ...s, seats, players: s.players.map((p) => (p.id === peerId ? { ...p, ready: false } : p)) }, { seats: true, upsert: [peerId] });
		this.maybeAutoStart();
	}
	private setSeats(seats: Seat[]) {
		if (!this.isHost || !this.state || this.state.phase !== 'lobby') return;
		this.commit({ ...this.state, seats: sanitizeSeats(seats) }, { seats: true });
		this.maybeAutoStart();
	}
	setSeatCount(n: number) {
		if (this.state) this.setSeats(resizeSeats(this.state.seats, n));
	}
	fillWithBots() {
		if (this.state) this.setSeats(fillBots(this.state.seats));
	}
	setBotNames(names: string[]) {
		if (this.state) this.setSeats(setBotNames(this.state.seats, names));
	}
	setBot(index: number, bot: { name: string; style: DuckStyle }) {
		const s = this.state;
		if (!s || !s.seats[index] || s.seats[index].kind === 'human') return;
		this.setSeats(s.seats.map((x, i): Seat => (i === index ? { kind: 'bot', name: cleanName(bot.name) || 'Vịt máy', style: sanitizeStyle(bot.style) } : x)));
	}
	clearSeat(index: number) {
		const s = this.state;
		if (!s || s.seats[index]?.kind !== 'bot') return;
		this.setSeats(s.seats.map((x, i): Seat => (i === index ? { kind: 'empty' } : x)));
	}

	updateConfig(patch: Partial<RoomConfig>) {
		const s = this.state;
		if (!this.isHost || !s || s.phase !== 'lobby') return;
		const config = sanitizeConfig({ ...s.config, ...patch });
		config.maxPeople = Math.max(config.maxPeople, s.players.length);
		// Đổi luật thì mọi người xác nhận sẵn sàng lại.
		const players = s.players.map((p) => ({ ...p, ready: false }));
		this.commit({ ...s, config, players }, { config: true, upsert: s.players.filter((p) => p.ready).map((p) => p.id) });
	}

	/** Đóng kết quả ván trước để về phòng chờ. */
	dismissRace() {
		if (this.race?.ended) {
			this.race = null;
			this.emit();
		}
	}

	// ---------- vòng đua ----------
	seated(s: RoomState) {
		return s.players.filter((p) => seatOf(s.seats, p.id) >= 0);
	}
	/** Đủ ≥2 vịt và mọi người ngồi ô đã sẵn sàng (host bấm bắt đầu thì không cần host sẵn sàng). */
	canStart(s: RoomState, byHost = false) {
		if (s.phase !== 'lobby' || lineup(s.seats, s.players).length < 2) return false;
		return this.seated(s).every((p) => p.ready || (byHost && p.id === s.hostId));
	}
	hostStart() {
		if (this.isHost && this.state && this.canStart(this.state, true)) {
			clearTimeout(this.startTimer);
			this.startRace();
		}
	}
	private maybeAutoStart() {
		clearTimeout(this.startTimer);
		// Tự bắt đầu khi có người đua và tất cả đã sẵn sàng; chỉ có vịt máy thì chờ host bấm.
		if (!this.isHost || !this.state || this.seated(this.state).length === 0 || !this.canStart(this.state)) return;
		this.startTimer = this.later(() => {
			if (this.isHost && this.state && this.canStart(this.state)) this.startRace();
		}, 800);
	}

	private startRace() {
		const s = this.state!;
		const round = Math.max(s.round, this.lastRound) + 1;
		const seed = crypto.getRandomValues(new Uint32Array(1))[0];
		const racers = lineup(s.seats, s.players);
		const msg: StartMsg = { round, seed, config: s.config, racers };
		const readyIds = s.players.filter((p) => p.ready).map((p) => p.id);
		this.commit({ ...s, phase: 'racing', round, players: s.players.map((p) => ({ ...p, ready: false })) }, { upsert: readyIds });
		this.flush(); // gửi trạng thái "đang đua" ngay
		this.act.start.send(msg).catch(() => {});
		this.beginRace(msg);
	}

	private onStart(peerId: string, d: StartMsg) {
		if (!this.state || peerId !== this.state.hostId || !d || !Array.isArray(d.racers)) return;
		const racers = d.racers.slice(0, 120).map((r: any, i: number) => ({
			id: String(r?.id ?? `x-${i}`),
			name: cleanName(r?.name) || 'Vịt',
			number: Number.isInteger(r?.number) ? r.number : i + 1,
			style: sanitizeStyle(r?.style),
			bot: !!r?.bot,
		}));
		const finished: Record<string, number> = {};
		for (const [id, t] of Object.entries(d.finished ?? {})) if (Number.isFinite(t)) finished[String(id)] = Number(t);
		const elapsed = Number(d.elapsed);
		this.beginRace({
			round: Number(d.round) || 0,
			seed: Number(d.seed) >>> 0,
			config: sanitizeConfig(d.config),
			racers,
			elapsed: Number.isFinite(elapsed) && elapsed > 0 ? elapsed : undefined,
			finished,
		});
	}

	private beginRace(msg: StartMsg) {
		if (msg.round <= this.lastRound) return;
		this.lastRound = msg.round;
		const bots: Record<string, BotTrack> = {};
		const withHumans = msg.racers.some((x) => !x.bot);
		msg.racers.forEach((r, i) => {
			// Có người thật đua → vịt máy chạy vừa phải; toàn vịt máy → tốc độ đổi liên tục, khó đoán.
			if (r.bot) bots[r.id] = simulateBot(msg.seed, i, msg.config, withHumans ? 'gentle' : 'race');
		});
		const t0 = performance.now() + COUNTDOWN_MS - (msg.elapsed ?? 0);
		this.remote = {};
		this.notice = '';
		this.race = {
			...msg,
			t0,
			participant: msg.racers.some((r) => r.id === this.selfId),
			finish: { ...(msg.finished ?? {}) },
			left: {},
			bots,
			myD: 0,
			lastTick: t0,
			ended: false,
			results: null,
		};
		clearInterval(this.simTimer);
		// setInterval thay vì requestAnimationFrame: tab bị ẩn vẫn tiếp tục tính (theo dt thực).
		this.simTimer = setInterval(() => this.tick(), TICK_MS);
		this.emit();
	}

	private tick() {
		const r = this.race;
		if (!r || r.ended) return;
		const now = performance.now();
		if (now < r.t0) return;
		if (r.participant && r.finish[this.selfId] == null) {
			const from = Math.max(r.lastTick, r.t0);
			const dt = (now - from) / 1000;
			const boost = Math.min(MAX_BOOST, Math.max(0, this.getBoost() || 0));
			const speed = baseSpeed(r.config) * (1 + boost);
			const prev = r.myD;
			r.myD += speed * dt;
			const L = r.config.trackLength;
			if (r.myD >= L) {
				const timeMs = from - r.t0 + ((L - prev) / speed) * 1000;
				r.myD = L;
				r.finish[this.selfId] = timeMs;
				if (this.isHost) this.broadcastFin();
				else if (this.state && !this.hostLost) this.act.finish.send({ round: r.round, timeMs } satisfies Finish, { target: this.state.hostId }).catch(() => {});
				this.emit();
			} else if (!this.isHost && this.state && !this.hostLost && now - this.lastPosSent >= POS_EVERY_MS) {
				this.lastPosSent = now;
				this.act.pos.send({ round: r.round, d: Math.round(r.myD * 10) / 10 } satisfies Pos, { target: this.state.hostId }).catch(() => {});
			}
		}
		r.lastTick = now;
		// Host gom vị trí mọi người đua rồi phát cho cả phòng.
		if (this.isHost && now - this.lastPosAll >= POS_ALL_EVERY_MS) {
			this.lastPosAll = now;
			const d = r.racers.map((x) => (x.bot ? null : x.id === this.selfId ? Math.round(r.myD * 10) / 10 : (this.remote[x.id] ?? null)));
			if (d.some((v) => v != null)) this.act.posAll.send({ round: r.round, d } satisfies PosAll).catch(() => {});
		}
		this.checkEnd();
	}

	private onPos(peerId: string, d: Pos) {
		const r = this.race;
		if (!this.isHost || !r || d?.round !== r.round || !r.racers.some((x) => x.id === peerId && !x.bot)) return;
		this.remote[peerId] = Math.min(r.config.trackLength, Math.max(0, Number(d.d) || 0));
	}

	private onPosAll(peerId: string, m: PosAll) {
		const r = this.race;
		if (!r || !this.state || peerId !== this.state.hostId || m?.round !== r.round || !Array.isArray(m.d)) return;
		r.racers.forEach((x, i) => {
			const v = m.d[i];
			if (!x.bot && x.id !== this.selfId && typeof v === 'number' && Number.isFinite(v)) this.remote[x.id] = Math.min(r.config.trackLength, Math.max(0, v));
		});
	}

	private onFinish(peerId: string, d: Finish) {
		const r = this.race;
		if (!this.isHost || !r || d?.round !== r.round || !r.racers.some((x) => x.id === peerId && !x.bot)) return;
		if (r.finish[peerId] != null || !Number.isFinite(d.timeMs)) return;
		r.finish[peerId] = Math.max(0, d.timeMs);
		this.remote[peerId] = r.config.trackLength;
		delete r.left[peerId];
		this.broadcastFin();
		this.checkEnd();
		this.emit();
	}

	/** Host phát toàn bộ thời gian về đích (và đã chốt hay chưa) cho cả phòng. */
	private broadcastFin() {
		const r = this.race;
		if (!r || !this.isHost) return;
		this.act.fin.send({ round: r.round, finish: r.finish, ...(r.ended ? { ended: true } : {}) } satisfies Fin).catch(() => {});
	}

	private onFin(peerId: string, m: Fin) {
		const r = this.race;
		if (!r || !this.state || peerId !== this.state.hostId || m?.round !== r.round) return;
		for (const [id, t] of Object.entries(m.finish ?? {})) {
			if (Number.isFinite(t) && r.racers.some((x) => x.id === id) && (id !== this.selfId || r.finish[id] == null)) {
				r.finish[id] = Number(t);
				if (id !== this.selfId) this.remote[id] = r.config.trackLength;
			}
		}
		if (m.ended) this.endRace();
		else if (r.ended) r.results = this.rank(r);
		this.emit();
	}

	private rank(r: RaceRun) {
		const all = { ...r.finish };
		for (const [id, b] of Object.entries(r.bots)) all[id] = b.finishMs;
		return rankRacers(r.racers, all);
	}

	/** Host chốt ván khi mọi người đã về / đã rời; khách chỉ tự chốt khi lâu không có host. */
	private checkEnd() {
		const r = this.race;
		if (!r || r.ended) return;
		const el = performance.now() - r.t0;
		const lastBot = Math.max(0, ...Object.values(r.bots).map((b) => b.finishMs));
		if (this.isHost) {
			const humansDone = r.racers.every((x) => x.bot || r.finish[x.id] != null || r.left[x.id]);
			const botsDone = el >= lastBot;
			const timeout = el > Math.max(r.config.estTime * 1000 + END_GRACE_MS, lastBot + 300);
			if ((humansDone && botsDone) || timeout) {
				this.endRace();
				this.broadcastFin();
			}
		} else if (el > Math.max(r.config.estTime * 1000, lastBot) + LOCAL_END_GRACE_MS) {
			this.endRace();
		}
	}

	private endRace() {
		const r = this.race;
		if (!r) return;
		if (!r.ended) {
			r.ended = true;
			clearInterval(this.simTimer);
			if (this.isHost && this.state) this.commit({ ...this.state, phase: 'lobby' });
		}
		r.results = this.rank(r);
		this.emit();
	}
}
