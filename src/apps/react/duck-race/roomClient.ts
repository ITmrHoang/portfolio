// Kết nối P2P cho game Đua Vịt bằng Trystero (WebRTC, signaling qua relay Nostr công cộng).
//
// Vai trò:
// - Host (người tạo phòng): giữ cấu hình + danh sách người chơi, nhận/từ chối người mới, phát lệnh bắt đầu.
// - Mỗi máy tự chạy vịt của mình (ấn/hét → tốc độ), phát vị trí (`pos`) và thời gian về đích (`finish`).
//   Kết quả do mọi máy tự xếp hạng từ cùng tập `finish`, nên host rời giữa ván cũng không sao.
import type { MessageAction, Room } from 'trystero';
import {
	COLORS,
	COUNTDOWN_MS,
	MAX_BOOST,
	SEARCH_MS,
	baseSpeed,
	betterHost,
	nextHost,
	rankRacers,
	sanitizeConfig,
	simulateBot,
	type BotTrack,
	type Player,
	type Racer,
	type Ranked,
	type RoomConfig,
	type RoomState,
	type StartMsg,
} from './protocol';

const APP_ID = 'himo-duck-race-v1';
const TICK_MS = 50;
const POS_EVERY_MS = 100;
const END_GRACE_MS = 8000; // chờ thêm sau estTime trước khi coi người chưa về là bỏ cuộc

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

type Hello = { name: string };
type Ready = { ready: boolean };
type Pos = { round: number; d: number };
type Finish = { round: number; timeMs: number };
type Reject = { reason: 'full' };

export class DuckRoomClient {
	selfId = '';
	status: Status = 'connecting';
	state: RoomState | null = null;
	race: RaceRun | null = null;
	notice = '';
	/** Vị trí người khác (mét) nhận qua `pos`. */
	remote: Record<string, number> = {};
	/** UI gán hàm đọc boost hiện tại (0..MAX_BOOST) từ ấn/micro. */
	getBoost: () => number = () => 0;

	private room: Room | null = null;
	private act = {} as {
		hello: MessageAction<any>;
		state: MessageAction<any>;
		reject: MessageAction<any>;
		ready: MessageAction<any>;
		start: MessageAction<any>;
		pos: MessageAction<any>;
		finish: MessageAction<any>;
	};
	private listeners = new Set<() => void>();
	private version = 0;
	private destroyed = false;
	private searchTimer: ReturnType<typeof setTimeout> | undefined;
	private startTimer: ReturnType<typeof setTimeout> | undefined;
	private simTimer: ReturnType<typeof setInterval> | undefined;
	private helloSentTo = '';
	private lastPosSent = 0;
	private lastRound = 0;
	private lastJoinedAt = 0;

	constructor(
		public roomId: string,
		public name: string,
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
		return !!this.state && this.state.hostId === this.selfId;
	}
	get me(): Player | undefined {
		return this.state?.players.find((p) => p.id === this.selfId);
	}

	// ---------- vào phòng ----------
	async connect() {
		const { joinRoom, selfId } = await import('trystero');
		if (this.destroyed) return;
		this.selfId = selfId;
		const room = joinRoom({ appId: APP_ID }, this.roomId, {
			onJoinError: (d) => {
				console.warn('[duck-race] join error', d);
				this.notice = 'Không kết nối được với một người chơi (mạng có thể chặn WebRTC).';
				this.emit();
			},
		});
		this.room = room;
		const mk = (name: string) => room.makeAction(name) as MessageAction<any>;
		this.act = {
			hello: mk('hello'),
			state: mk('state'),
			reject: mk('reject'),
			ready: mk('ready'),
			start: mk('start'),
			pos: mk('pos'),
			finish: mk('finish'),
		};
		this.act.hello.onMessage = (d: Hello, { peerId }) => this.onHello(peerId, d);
		this.act.state.onMessage = (d: RoomState, { peerId }) => this.onState(peerId, d);
		this.act.reject.onMessage = (d: Reject, { peerId }) => this.onReject(peerId, d);
		this.act.ready.onMessage = (d: Ready, { peerId }) => this.onReady(peerId, d);
		this.act.start.onMessage = (d: StartMsg, { peerId }) => this.onStart(peerId, d);
		this.act.pos.onMessage = (d: Pos, { peerId }) => this.onPos(peerId, d);
		this.act.finish.onMessage = (d: Finish, { peerId }) => this.onFinish(peerId, d);
		room.onPeerJoin = (peerId) => this.onPeerJoin(peerId);
		room.onPeerLeave = (peerId) => this.onPeerLeave(peerId);

		this.status = 'searching';
		this.emit();
		// Không ai trả lời trong SEARCH_MS → phòng chưa có, mình tạo và làm host.
		this.searchTimer = setTimeout(() => {
			if (!this.state && !this.destroyed) this.becomeHost();
		}, SEARCH_MS);
	}

	leave() {
		if (this.destroyed) return;
		this.destroyed = true;
		clearTimeout(this.searchTimer);
		clearTimeout(this.startTimer);
		clearInterval(this.simTimer);
		this.room?.leave().catch(() => {});
		this.room = null;
		if (this.status !== 'full') this.status = 'left';
		this.emit();
	}

	private becomeHost() {
		const now = Date.now();
		this.lastJoinedAt = now;
		this.state = {
			hostId: this.selfId,
			createdAt: now,
			config: sanitizeConfig(this.initialConfig),
			players: [{ id: this.selfId, name: this.name, ready: false, joinedAt: now }],
			phase: 'lobby',
			round: 0,
		};
		this.status = 'joined';
		this.broadcastState();
		this.emit();
	}

	private broadcastState(target?: string) {
		if (!this.state || !this.room) return;
		this.act.state.send(this.state, target ? { target } : undefined).catch(() => {});
	}

	private peerConnected(id: string) {
		return id === this.selfId || !!this.room?.getPeers()[id];
	}

	// ---------- sự kiện mạng ----------
	private onPeerJoin(peerId: string) {
		this.act.hello.send({ name: this.name } satisfies Hello, { target: peerId }).catch(() => {});
		if (this.isHost) this.broadcastState(peerId);
	}

	private onHello(peerId: string, d: Hello) {
		if (!this.isHost || !this.state) return;
		const name = String(d?.name || 'Vịt ẩn danh').slice(0, 20);
		const s = this.state;
		const existing = s.players.find((p) => p.id === peerId);
		if (existing) {
			if (existing.name !== name) {
				this.state = { ...s, players: s.players.map((p) => (p.id === peerId ? { ...p, name } : p)) };
				this.broadcastState();
				this.emit();
			}
			return;
		}
		if (s.players.length >= s.config.maxPlayers) {
			this.act.reject.send({ reason: 'full' } satisfies Reject, { target: peerId }).catch(() => {});
			return;
		}
		// Dùng đồng hồ của host để xếp thứ tự vào phòng (tránh lệch giờ giữa các máy).
		const joinedAt = Math.max(Date.now(), this.lastJoinedAt + 1);
		this.lastJoinedAt = joinedAt;
		this.state = { ...s, players: [...s.players, { id: peerId, name, ready: false, joinedAt }] };
		this.broadcastState();
		this.emit();
	}

	private onState(peerId: string, s: RoomState) {
		if (!s || s.hostId !== peerId || !Array.isArray(s.players)) return; // chỉ tin host tự phát
		const incoming: RoomState = { ...s, config: sanitizeConfig(s.config) };
		const cur = this.state;
		if (cur && this.isHost) {
			// Hai host cùng một phòng (tạo cùng lúc): phòng cũ hơn thắng.
			if (betterHost(cur, incoming) === cur) {
				this.broadcastState(peerId);
				return;
			}
			clearTimeout(this.startTimer);
		} else if (cur && cur.hostId !== incoming.hostId) {
			// Đổi sang host khác chỉ khi host đó "tốt hơn" hoặc host hiện tại đã mất kết nối.
			if (betterHost(cur, incoming) !== incoming && this.peerConnected(cur.hostId)) return;
		}
		clearTimeout(this.searchTimer);
		this.state = incoming;
		this.lastJoinedAt = Math.max(this.lastJoinedAt, ...incoming.players.map((p) => p.joinedAt));
		if (incoming.players.some((p) => p.id === this.selfId)) {
			this.status = 'joined';
		} else {
			this.status = 'waiting';
			if (this.helloSentTo !== incoming.hostId) {
				this.helloSentTo = incoming.hostId;
				this.act.hello.send({ name: this.name } satisfies Hello, { target: incoming.hostId }).catch(() => {});
			}
		}
		this.emit();
	}

	private onReject(peerId: string, _d: Reject) {
		if (this.state && peerId !== this.state.hostId) return;
		this.status = 'full';
		this.leave();
	}

	private onReady(peerId: string, d: Ready) {
		if (!this.isHost || !this.state || this.state.phase !== 'lobby') return;
		this.applyReady(peerId, !!d?.ready);
	}

	private applyReady(id: string, ready: boolean) {
		if (!this.state) return;
		this.state = { ...this.state, players: this.state.players.map((p) => (p.id === id ? { ...p, ready } : p)) };
		if (this.isHost) {
			this.broadcastState();
			this.maybeAutoStart();
		}
		this.emit();
	}

	private onPeerLeave(peerId: string) {
		delete this.remote[peerId];
		const r = this.race;
		if (r && !r.ended && r.racers.some((x) => x.id === peerId)) {
			r.left[peerId] = true;
			this.checkEnd();
		}
		const s = this.state;
		if (!s) return;
		if (peerId === s.hostId) {
			const nh = nextHost(s.players, peerId) ?? this.selfId;
			const leftName = s.players.find((p) => p.id === peerId)?.name ?? 'Host';
			this.state = { ...s, hostId: nh, players: s.players.filter((p) => p.id !== peerId) };
			if (nh === this.selfId) {
				if (!this.me) this.state.players.push({ id: this.selfId, name: this.name, ready: false, joinedAt: Date.now() });
				this.status = 'joined';
				this.notice = `${leftName} (host) đã rời phòng, bạn là host mới.`;
				if (this.state.phase === 'racing' && (!this.race || this.race.ended)) this.state.phase = 'lobby';
				this.broadcastState();
				this.maybeAutoStart();
			} else {
				const nn = this.state.players.find((p) => p.id === nh)?.name ?? '';
				this.notice = `${leftName} (host) đã rời phòng, ${nn} là host mới.`;
			}
			this.emit();
			return;
		}
		if (s.players.some((p) => p.id === peerId)) {
			this.state = { ...s, players: s.players.filter((p) => p.id !== peerId) };
			if (this.isHost) {
				this.broadcastState();
				this.maybeAutoStart();
			}
		}
		this.emit();
	}

	// ---------- thao tác của người chơi ----------
	setReady(ready: boolean) {
		if (!this.state || this.state.phase !== 'lobby' || !this.me) return;
		if (this.isHost) this.applyReady(this.selfId, ready);
		else {
			this.act.ready.send({ ready } satisfies Ready, { target: this.state.hostId }).catch(() => {});
			this.applyReady(this.selfId, ready); // cập nhật tạm, host sẽ phát lại
		}
	}

	updateConfig(patch: Partial<RoomConfig>) {
		if (!this.isHost || !this.state || this.state.phase !== 'lobby') return;
		const config = sanitizeConfig({ ...this.state.config, ...patch });
		config.maxPlayers = Math.max(config.maxPlayers, this.state.players.length);
		// Đổi luật thì mọi người xác nhận sẵn sàng lại.
		this.state = { ...this.state, config, players: this.state.players.map((p) => ({ ...p, ready: false })) };
		this.broadcastState();
		this.emit();
	}

	/** Đóng kết quả ván trước để về phòng chờ. */
	dismissRace() {
		if (this.race?.ended) {
			this.race = null;
			this.emit();
		}
	}

	// ---------- vòng đua ----------
	canStart(s: RoomState) {
		const n = s.players.length;
		return s.phase === 'lobby' && (n >= 2 || (n >= 1 && s.config.bots > 0)) && s.players.every((p) => p.ready);
	}

	private maybeAutoStart() {
		clearTimeout(this.startTimer);
		if (!this.isHost || !this.state || !this.canStart(this.state)) return;
		this.startTimer = setTimeout(() => {
			if (this.isHost && this.state && this.canStart(this.state)) this.startRace();
		}, 800);
	}

	private startRace() {
		const s = this.state!;
		const round = Math.max(s.round, this.lastRound) + 1;
		const seed = crypto.getRandomValues(new Uint32Array(1))[0];
		const racers: Racer[] = s.players.map((p, i) => ({ id: p.id, name: p.name, color: COLORS[i % COLORS.length], bot: false }));
		for (let i = 0; i < s.config.bots; i++) {
			racers.push({ id: `bot-${i}`, name: `Vịt máy ${i + 1}`, color: COLORS[(s.players.length + i) % COLORS.length], bot: true });
		}
		const msg: StartMsg = { round, seed, config: s.config, racers };
		this.state = { ...s, phase: 'racing', round, players: s.players.map((p) => ({ ...p, ready: false })) };
		this.broadcastState();
		this.act.start.send(msg).catch(() => {});
		this.beginRace(msg);
	}

	private onStart(peerId: string, d: StartMsg) {
		if (!this.state || peerId !== this.state.hostId || !d || !Array.isArray(d.racers)) return;
		this.beginRace({ ...d, config: sanitizeConfig(d.config) });
	}

	private beginRace(msg: StartMsg) {
		if (msg.round <= this.lastRound) return;
		this.lastRound = msg.round;
		const bots: Record<string, BotTrack> = {};
		msg.racers.forEach((r, i) => {
			if (r.bot) bots[r.id] = simulateBot(msg.seed, i, msg.config);
		});
		const t0 = performance.now() + COUNTDOWN_MS;
		this.remote = {};
		this.notice = '';
		this.race = {
			...msg,
			t0,
			participant: msg.racers.some((r) => r.id === this.selfId),
			finish: {},
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
				this.act.finish.send({ round: r.round, timeMs } satisfies Finish).catch(() => {});
				this.act.pos.send({ round: r.round, d: L } satisfies Pos).catch(() => {});
				this.emit();
			} else if (now - this.lastPosSent >= POS_EVERY_MS) {
				this.lastPosSent = now;
				this.act.pos.send({ round: r.round, d: r.myD } satisfies Pos).catch(() => {});
			}
		}
		r.lastTick = now;
		this.checkEnd();
	}

	private onPos(peerId: string, d: Pos) {
		const r = this.race;
		if (!r || d?.round !== r.round || !r.racers.some((x) => x.id === peerId && !x.bot)) return;
		this.remote[peerId] = Math.min(r.config.trackLength, Math.max(0, Number(d.d) || 0));
	}

	private onFinish(peerId: string, d: Finish) {
		const r = this.race;
		if (!r || d?.round !== r.round || !r.racers.some((x) => x.id === peerId && !x.bot)) return;
		if (r.finish[peerId] != null || !Number.isFinite(d.timeMs)) return;
		r.finish[peerId] = Math.max(0, d.timeMs);
		this.remote[peerId] = r.config.trackLength;
		if (r.ended) r.results = this.rank(r); // tin về muộn → cập nhật lại bảng
		else this.checkEnd();
		this.emit();
	}

	private rank(r: RaceRun) {
		const all = { ...r.finish };
		for (const [id, b] of Object.entries(r.bots)) all[id] = b.finishMs;
		return rankRacers(r.racers, all);
	}

	private checkEnd() {
		const r = this.race;
		if (!r || r.ended) return;
		const el = performance.now() - r.t0;
		const humansDone = r.racers.every((x) => x.bot || r.finish[x.id] != null || r.left[x.id]);
		const botsDone = Object.values(r.bots).every((b) => el >= b.finishMs);
		const timeout = el > r.config.estTime * 1000 + END_GRACE_MS;
		if (!((humansDone && botsDone) || timeout)) return;
		r.ended = true;
		r.results = this.rank(r);
		clearInterval(this.simTimer);
		if (this.isHost && this.state) {
			this.state = { ...this.state, phase: 'lobby' };
			this.broadcastState();
		}
		this.emit();
	}
}
