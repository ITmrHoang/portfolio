import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import Duck from './Duck';
import { BoostInput } from './boostInput';
import { DuckRoomClient } from './roomClient';
import type { RaceRun } from './roomClient';
import {
	DEFAULT_CONFIG,
	LIMITS,
	MAX_BOOST,
	botDistance,
	cleanName,
	fmtTime,
	normalizeRoomId,
	randomRoomId,
	type InputMode,
	type Ranked,
	type RoomConfig,
} from './protocol';

const NAME_KEY = 'duck-race:name';
const noopSub = () => () => {};
const zero = () => 0;

const readLS = (k: string) => {
	try {
		return localStorage.getItem(k) || '';
	} catch {
		return '';
	}
};
const writeLS = (k: string, v: string) => {
	try {
		localStorage.setItem(k, v);
	} catch {
		/* bỏ qua */
	}
};

const MODE_LABEL: Record<InputMode, string> = { any: 'Ấn hoặc hét', tap: 'Chỉ ấn', voice: 'Chỉ hét' };

export default function DuckRace() {
	const [client, setClient] = useState<DuckRoomClient | null>(null);
	const [name, setName] = useState('');
	const [roomInput, setRoomInput] = useState('');
	const [error, setError] = useState('');
	const boost = useMemo(() => new BoostInput(), []);
	useSyncExternalStore(client?.subscribe ?? noopSub, client?.getVersion ?? zero, zero);

	useEffect(() => {
		setName(readLS(NAME_KEY));
		const r = new URLSearchParams(location.search).get('room');
		if (r) setRoomInput(normalizeRoomId(r));
	}, []);

	// Rời phòng khi đóng tab / rời trang.
	useEffect(() => {
		if (!client) return;
		const bye = () => client.leave();
		window.addEventListener('pagehide', bye);
		return () => {
			window.removeEventListener('pagehide', bye);
			client.leave();
		};
	}, [client]);

	useEffect(() => () => boost.stopMic(), [boost]);

	// Bị từ chối (phòng đầy) → quay về màn vào phòng kèm thông báo.
	useEffect(() => {
		if (client?.status === 'full') {
			setError('Phòng đã đầy. Thử mã phòng khác hoặc chờ người khác rời phòng.');
			setClient(null);
		}
	}, [client, client?.status]);

	const join = () => {
		const n = cleanName(name);
		const id = normalizeRoomId(roomInput);
		if (!n) return setError('Nhập tên của bạn trước đã.');
		if (!id) return setError('Nhập mã phòng (chữ, số, dấu gạch ngang).');
		setError('');
		writeLS(NAME_KEY, n);
		setName(n);
		setRoomInput(id);
		const url = new URL(location.href);
		url.searchParams.set('room', id);
		history.replaceState(null, '', url);
		const c = new DuckRoomClient(id, n, DEFAULT_CONFIG);
		setClient(c);
		c.connect().catch((e) => {
			console.error(e);
			setError('Không tải được thư viện kết nối. Kiểm tra mạng rồi thử lại.');
			setClient(null);
		});
	};

	const leave = () => {
		client?.leave();
		boost.stopMic();
		setClient(null);
	};

	if (!client || client.status === 'left') {
		return (
			<JoinScreen
				name={name}
				setName={setName}
				roomInput={roomInput}
				setRoomInput={setRoomInput}
				error={error}
				onJoin={join}
			/>
		);
	}

	return <RoomScreen client={client} boost={boost} onLeave={leave} />;
}

// ---------------------------------------------------------------------------

function JoinScreen(props: {
	name: string;
	setName: (v: string) => void;
	roomInput: string;
	setRoomInput: (v: string) => void;
	error: string;
	onJoin: () => void;
}) {
	const { name, setName, roomInput, setRoomInput, error, onJoin } = props;
	return (
		<form
			className="space-y-5"
			onSubmit={(e) => {
				e.preventDefault();
				onJoin();
			}}
		>
			<div className="flex items-end justify-center gap-1 h-16">
				{['#f59e0b', '#3b82f6', '#ef4444'].map((c, i) => (
					<div key={c} className="duck-bob" style={{ animationDelay: `${i * 0.25}s` }}>
						<Duck color={c} size={52} />
					</div>
				))}
			</div>
			<p className="text-center text-sm text-gray-600">
				Nhập cùng một mã phòng với bạn bè. Phòng chưa có thì bạn sẽ tạo phòng và làm <strong>host</strong>.
			</p>
			<label className="block">
				<span className="text-sm font-semibold text-gray-700">Tên của bạn</span>
				<input
					value={name}
					onChange={(e) => setName(e.target.value)}
					maxLength={20}
					placeholder="VD: Vịt Bầu"
					className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-400"
				/>
			</label>
			<label className="block">
				<span className="text-sm font-semibold text-gray-700">Mã phòng</span>
				<div className="mt-1 flex gap-2">
					<input
						value={roomInput}
						onChange={(e) => setRoomInput(e.target.value)}
						maxLength={40}
						placeholder="vd: vit-ao-1234"
						className="min-w-0 flex-1 rounded-xl border border-gray-200 px-4 py-3 font-mono focus:outline-none focus:ring-2 focus:ring-amber-400"
					/>
					<button
						type="button"
						onClick={() => setRoomInput(randomRoomId())}
						className="shrink-0 rounded-xl border border-gray-200 px-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
					>
						🎲 Ngẫu nhiên
					</button>
				</div>
			</label>
			{error && <p className="rounded-xl bg-rose-50 border border-rose-100 px-4 py-3 text-sm text-rose-700">{error}</p>}
			<button
				type="submit"
				className="w-full rounded-xl bg-amber-500 py-3 font-bold text-white shadow-sm hover:bg-amber-600 active:scale-[.99] transition"
			>
				Vào phòng
			</button>
			<DuckStyles />
		</form>
	);
}

// ---------------------------------------------------------------------------

function RoomScreen({ client, boost, onLeave }: { client: DuckRoomClient; boost: BoostInput; onLeave: () => void }) {
	const s = client.state;
	const race = client.race;
	const [copied, setCopied] = useState(false);
	const [micError, setMicError] = useState('');
	const [, force] = useState(0);
	const mode = s?.config.inputMode ?? 'any';
	const useTap = mode !== 'voice' || !!micError;
	const useVoice = mode !== 'tap';

	// Cung cấp boost cho vòng mô phỏng của client.
	client.getBoost = () => boost.boost(useTap, useVoice);

	// Phòng không cho dùng micro → tắt micro.
	useEffect(() => {
		if (!useVoice && boost.micOn) {
			boost.stopMic();
			force((x) => x + 1);
		}
	}, [useVoice, boost]);

	const toggleMic = async () => {
		if (boost.micOn) {
			boost.stopMic();
		} else {
			try {
				await boost.startMic();
				setMicError('');
			} catch (e: any) {
				setMicError(e?.message?.includes('HTTPS') ? e.message : 'Không mở được micro, dùng cách ấn màn hình thay thế.');
			}
		}
		force((x) => x + 1);
	};

	const copyLink = async () => {
		try {
			await navigator.clipboard.writeText(location.href);
			setCopied(true);
			setTimeout(() => setCopied(false), 1500);
		} catch {
			/* bỏ qua */
		}
	};

	return (
		<div className="space-y-4">
			{/* Thanh phòng */}
			<div className="flex flex-wrap items-center gap-2">
				<div className="min-w-0 flex-1">
					<div className="text-xs text-gray-500">Mã phòng</div>
					<div className="truncate font-mono font-bold text-gray-900">{client.roomId}</div>
				</div>
				{client.isHost && <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">👑 Host</span>}
				<button onClick={copyLink} className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm hover:bg-gray-50">
					{copied ? 'Đã chép ✓' : '🔗 Chép link'}
				</button>
				<button onClick={onLeave} className="rounded-lg border border-rose-200 px-3 py-1.5 text-sm text-rose-600 hover:bg-rose-50">
					Rời phòng
				</button>
			</div>

			{client.notice && (
				<p className="rounded-xl border border-sky-100 bg-sky-50 px-4 py-2 text-sm text-sky-800">{client.notice}</p>
			)}

			{(client.status === 'connecting' || client.status === 'searching') && (
				<Waiting text="Đang tìm phòng… nếu chưa ai mở phòng này, bạn sẽ tự trở thành host." />
			)}
			{client.status === 'waiting' && <Waiting text="Đã thấy phòng, đang chờ host cho vào…" />}

			{client.status === 'joined' && s && (
				<>
					{race ? (
						<RaceView
							client={client}
							race={race}
							boost={boost}
							useTap={useTap}
							useVoice={useVoice}
							micOn={boost.micOn}
							onToggleMic={toggleMic}
						/>
					) : (
						<Lobby client={client} micOn={boost.micOn} micError={micError} onToggleMic={toggleMic} boost={boost} />
					)}
				</>
			)}
			<DuckStyles />
		</div>
	);
}

function Waiting({ text }: { text: string }) {
	return (
		<div className="flex flex-col items-center gap-3 py-10 text-center text-gray-600">
			<div className="duck-bob">
				<Duck color="#f59e0b" size={56} />
			</div>
			<p className="text-sm">{text}</p>
		</div>
	);
}

// ---------------------------------------------------------------------------

function Lobby({
	client,
	micOn,
	micError,
	onToggleMic,
	boost,
}: {
	client: DuckRoomClient;
	micOn: boolean;
	micError: string;
	onToggleMic: () => void;
	boost: BoostInput;
}) {
	const s = client.state!;
	const me = client.me;
	const c = s.config;
	const host = client.isHost;
	const ready = s.players.filter((p) => p.ready).length;
	const need = c.bots > 0 ? 1 : 2;
	const racingNow = s.phase === 'racing';

	return (
		<div className="space-y-4">
			{/* Người chơi */}
			<section className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
				<div className="mb-3 flex items-center justify-between">
					<h3 className="font-bold text-gray-900">Người chơi</h3>
					<span className="text-sm text-gray-500">
						{s.players.length}/{c.maxPlayers} · sẵn sàng {ready}/{s.players.length}
					</span>
				</div>
				<ul className="space-y-2">
					{s.players.map((p) => (
						<li key={p.id} className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 border border-gray-100">
							<span className="min-w-0 flex-1 truncate font-medium">
								{p.name}
								{p.id === client.selfId && <span className="text-gray-400"> (bạn)</span>}
							</span>
							{p.id === s.hostId && <span title="Host">👑</span>}
							<span
								className={`rounded-full px-2 py-0.5 text-xs font-semibold ${p.ready ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}
							>
								{p.ready ? 'Sẵn sàng' : 'Chưa'}
							</span>
						</li>
					))}
				</ul>
			</section>

			{/* Luật phòng */}
			<section className="rounded-2xl border border-gray-100 p-4">
				<h3 className="mb-3 font-bold text-gray-900">
					Luật phòng {!host && <span className="text-xs font-normal text-gray-400">(host cài đặt)</span>}
				</h3>
				<ConfigForm client={client} config={c} editable={host && !racingNow} />
				<p className="mt-3 text-xs text-gray-500">
					Không làm gì vịt vẫn bơi và về đích sau khoảng <strong>{c.estTime} s</strong>. Ấn nhanh hoặc hét to thì vịt
					nhanh hơn, tối đa ×{(1 + MAX_BOOST).toFixed(1)}.
				</p>
			</section>

			{/* Điều khiển */}
			{c.inputMode !== 'tap' && (
				<section className="rounded-2xl border border-gray-100 p-4">
					<div className="flex items-center gap-3">
						<button
							onClick={onToggleMic}
							className={`shrink-0 whitespace-nowrap rounded-xl px-4 py-2 text-sm font-semibold ${micOn ? 'bg-rose-500 text-white' : 'bg-gray-900 text-white'}`}
						>
							{micOn ? '🎙️ Tắt micro' : '🎙️ Bật micro'}
						</button>
						{micOn ? <MicMeter boost={boost} /> : <span className="text-sm text-gray-500">Bật micro để hét "go go!" cho vịt chạy.</span>}
					</div>
					{micError && <p className="mt-2 text-sm text-rose-600">{micError}</p>}
				</section>
			)}

			{racingNow ? (
				<p className="rounded-xl bg-amber-50 border border-amber-100 px-4 py-3 text-sm text-amber-800">
					Một ván đang diễn ra, bạn sẽ được đua từ ván sau.
				</p>
			) : (
				me && (
					<div className="space-y-2">
						<button
							onClick={() => client.setReady(!me.ready)}
							className={`w-full rounded-xl py-3 font-bold shadow-sm transition active:scale-[.99] ${
								me.ready ? 'bg-emerald-500 text-white hover:bg-emerald-600' : 'bg-amber-500 text-white hover:bg-amber-600'
							}`}
						>
							{me.ready ? '✓ Đã sẵn sàng (bấm để huỷ)' : 'Sẵn sàng!'}
						</button>
						<p className="text-center text-xs text-gray-500">
							{s.players.length < need
								? 'Cần ít nhất 2 người (hoặc bật vịt máy) để đua.'
								: 'Ván tự bắt đầu khi tất cả đều sẵn sàng.'}
						</p>
					</div>
				)
			)}
		</div>
	);
}

function ConfigForm({ client, config, editable }: { client: DuckRoomClient; config: RoomConfig; editable: boolean }) {
	const minPlayers = Math.max(LIMITS.maxPlayers[0], client.state?.players.length ?? 1);
	const field = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm disabled:bg-gray-50 disabled:text-gray-600';
	const num = (key: 'maxPlayers' | 'trackLength' | 'estTime' | 'bots', label: string, min: number, max: number, step = 1, unit = '') => (
		<label className="block">
			<span className="text-xs font-medium text-gray-600">{label}</span>
			<div className="mt-1 flex items-center gap-1">
				<input
					type="number"
					inputMode="numeric"
					min={min}
					max={max}
					step={step}
					disabled={!editable}
					defaultValue={config[key]}
					key={`${key}-${config[key]}`}
					onBlur={(e) => client.updateConfig({ [key]: Number(e.target.value) })}
					onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
					className={field}
				/>
				{unit && <span className="text-xs text-gray-500">{unit}</span>}
			</div>
		</label>
	);
	return (
		<div className="grid grid-cols-2 gap-3">
			{num('maxPlayers', 'Số người tối đa', minPlayers, LIMITS.maxPlayers[1])}
			{num('trackLength', 'Độ dài đường đua', LIMITS.trackLength[0], LIMITS.trackLength[1], 10, 'm')}
			{num('estTime', 'Thời gian ước lượng', LIMITS.estTime[0], LIMITS.estTime[1], 5, 's')}
			{num('bots', 'Vịt máy', LIMITS.bots[0], LIMITS.bots[1])}
			<label className="col-span-2 block">
				<span className="text-xs font-medium text-gray-600">Cách điều khiển</span>
				<select
					disabled={!editable}
					value={config.inputMode}
					onChange={(e) => client.updateConfig({ inputMode: e.target.value as InputMode })}
					className={`mt-1 ${field}`}
				>
					{(Object.keys(MODE_LABEL) as InputMode[]).map((m) => (
						<option key={m} value={m}>
							{MODE_LABEL[m]}
						</option>
					))}
				</select>
			</label>
		</div>
	);
}

function MicMeter({ boost }: { boost: BoostInput }) {
	const bar = useRef<HTMLDivElement>(null);
	useEffect(() => {
		let raf = 0;
		const loop = () => {
			if (bar.current) bar.current.style.width = `${Math.round(boost.level * 100)}%`;
			raf = requestAnimationFrame(loop);
		};
		raf = requestAnimationFrame(loop);
		return () => cancelAnimationFrame(raf);
	}, [boost]);
	return (
		<div className="h-3 flex-1 overflow-hidden rounded-full bg-gray-100" title="Độ to micro">
			<div ref={bar} className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-amber-400 to-rose-500 transition-[width] duration-75" />
		</div>
	);
}

// ---------------------------------------------------------------------------

function RaceView({
	client,
	race,
	boost,
	useTap,
	useVoice,
	micOn,
	onToggleMic,
}: {
	client: DuckRoomClient;
	race: RaceRun;
	boost: BoostInput;
	useTap: boolean;
	useVoice: boolean;
	micOn: boolean;
	onToggleMic: () => void;
}) {
	const duckRefs = useRef<Record<string, HTMLDivElement | null>>({});
	const countRef = useRef<HTMLDivElement>(null);
	const statRef = useRef<HTMLSpanElement>(null);
	const meterRef = useRef<HTMLDivElement>(null);
	const padRef = useRef<HTMLButtonElement>(null);
	const L = race.config.trackLength;
	const myFinish = race.finish[client.selfId];
	const playing = race.participant && myFinish == null && !race.ended;

	// Vẽ vị trí vịt mỗi khung hình (không re-render React).
	useEffect(() => {
		let raf = 0;
		const shown: Record<string, number> = {};
		const loop = () => {
			const now = performance.now();
			const el = now - race.t0;
			for (const r of race.racers) {
				let d: number;
				if (r.id === client.selfId) d = race.myD;
				else if (r.bot) d = botDistance(race.bots[r.id], el);
				else {
					const target = client.remote[r.id] ?? 0;
					d = shown[r.id] = (shown[r.id] ?? 0) + (target - (shown[r.id] ?? 0)) * 0.2;
				}
				const f = Math.min(1, Math.max(0, d / L));
				const node = duckRefs.current[r.id];
				if (node) node.style.left = `calc(${(f * 100).toFixed(2)}% - ${(f * 48).toFixed(1)}px)`;
			}
			if (countRef.current) {
				const txt = el < 0 ? String(Math.ceil(-el / 1000)) : el < 700 ? 'GO!' : '';
				if (countRef.current.textContent !== txt) countRef.current.textContent = txt;
				countRef.current.style.display = txt ? 'flex' : 'none';
			}
			if (statRef.current && race.participant) {
				const mult = 1 + client.getBoost();
				statRef.current.textContent = `${Math.round(race.myD)}/${L} m · ×${mult.toFixed(1)}`;
			}
			if (meterRef.current) meterRef.current.style.width = `${Math.round((client.getBoost() / MAX_BOOST) * 100)}%`;
			raf = requestAnimationFrame(loop);
		};
		raf = requestAnimationFrame(loop);
		return () => cancelAnimationFrame(raf);
	}, [race, client, L]);

	// Phím Space / Enter cũng tính là một lần ấn.
	useEffect(() => {
		if (!playing || !useTap) return;
		const onKey = (e: KeyboardEvent) => {
			if ((e.code === 'Space' || e.key === 'Enter') && !e.repeat) {
				e.preventDefault();
				if (performance.now() >= race.t0) boost.tap();
			}
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	}, [playing, useTap, boost, race.t0]);

	const tap = () => {
		if (performance.now() < race.t0) return;
		boost.tap();
		const p = padRef.current;
		if (p) {
			p.classList.remove('pad-hit');
			void p.offsetWidth;
			p.classList.add('pad-hit');
		}
	};

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between text-sm">
				<span className="font-bold text-gray-900">Ván {race.round}</span>
				{race.participant ? (
					<span ref={statRef} className="font-mono text-gray-600" />
				) : (
					<span className="text-gray-500">Bạn đang xem</span>
				)}
			</div>

			{/* Đường đua */}
			<div className="relative overflow-hidden rounded-2xl border border-sky-200 bg-sky-100">
				<div className="finish-line absolute inset-y-0 right-0 w-3" />
				{race.racers.map((r, i) => (
					<div key={r.id} className={`relative h-14 ${i % 2 ? 'bg-sky-200/60' : 'bg-sky-100'} border-b border-sky-200/70 last:border-0`}>
						<span className="pointer-events-none absolute left-2 top-1 z-10 max-w-[45%] truncate text-[11px] font-semibold text-sky-900/80">
							{r.bot ? '🤖 ' : ''}
							{r.name}
							{r.id === client.selfId ? ' (bạn)' : ''}
						</span>
						<div
							ref={(n) => {
								duckRefs.current[r.id] = n;
							}}
							className="duck-swim absolute bottom-1"
							style={{ left: 0 }}
						>
							<Duck color={r.color} size={48} mine={r.id === client.selfId} />
						</div>
					</div>
				))}
				<div
					ref={countRef}
					className="pointer-events-none absolute inset-0 hidden items-center justify-center bg-white/40 text-6xl font-black text-amber-500 drop-shadow"
				/>
			</div>

			{race.ended && race.results ? (
				<Results results={race.results} selfId={client.selfId} onBack={() => client.dismissRace()} />
			) : playing ? (
				<div className="space-y-3">
					{useVoice && (
						<div className="flex items-center gap-3">
							<button
								onClick={onToggleMic}
								className={`shrink-0 rounded-xl px-3 py-2 text-sm font-semibold ${micOn ? 'bg-rose-500 text-white' : 'bg-gray-900 text-white'}`}
							>
								{micOn ? '🎙️ Đang nghe' : '🎙️ Bật micro'}
							</button>
							<span className="text-sm text-gray-500">{micOn ? 'Hét thật to: "GO GO GO!"' : 'Bật micro để hét cho vịt chạy.'}</span>
						</div>
					)}
					<div className="h-2 overflow-hidden rounded-full bg-gray-100">
						<div ref={meterRef} className="h-full bg-gradient-to-r from-emerald-400 via-amber-400 to-rose-500" />
					</div>
					{useTap && (
						<button
							ref={padRef}
							onPointerDown={(e) => {
								e.preventDefault();
								tap();
							}}
							className="tap-pad select-none w-full rounded-3xl bg-gradient-to-b from-amber-400 to-amber-500 py-12 text-3xl font-black text-white shadow-lg active:from-amber-500 active:to-amber-600"
						>
							ẤN! 🦆
							<span className="mt-1 block text-sm font-medium opacity-90">Ấn liên tục, hoặc phím Space</span>
						</button>
					)}
				</div>
			) : (
				<p className="rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-3 text-center text-sm text-emerald-800">
					{myFinish != null ? (
						<>
							🎉 Về đích sau <strong>{fmtTime(myFinish)}</strong>! Đang chờ những người khác…
						</>
					) : (
						'Đang theo dõi ván đua…'
					)}
				</p>
			)}
		</div>
	);
}

function Results({ results, selfId, onBack }: { results: Ranked[]; selfId: string; onBack: () => void }) {
	const winner = results.find((r) => r.place === 1);
	const podium = [results.find((r) => r.place === 2), winner, results.find((r) => r.place === 3)];
	const heights = ['h-16', 'h-24', 'h-12'];
	const medals = ['🥈', '🥇', '🥉'];
	return (
		<section className="space-y-4 rounded-2xl border border-amber-100 bg-amber-50 p-4">
			<h3 className="text-center text-xl font-black text-gray-900" data-testid="winner">
				{winner ? `🏆 ${winner.name}${winner.id === selfId ? ' (bạn)' : ''} thắng!` : 'Không ai về đích'}
			</h3>
			<div className="flex items-end justify-center gap-2">
				{podium.map((r, i) =>
					r ? (
						<div key={r.id} className="flex w-24 flex-col items-center">
							<Duck color={r.color} size={40} mine={r.id === selfId} />
							<div className="w-full truncate text-center text-xs font-semibold">{r.name}</div>
							<div className={`mt-1 flex w-full items-start justify-center rounded-t-lg bg-white pt-1 text-xl ${heights[i]}`}>{medals[i]}</div>
						</div>
					) : (
						<div key={i} className="w-24" />
					),
				)}
			</div>
			<ol className="space-y-1 text-sm">
				{results.map((r) => (
					<li key={r.id} className={`flex justify-between rounded-lg px-3 py-1.5 ${r.id === selfId ? 'bg-white font-semibold' : ''}`}>
						<span className="truncate">
							{r.place ? `${r.place}.` : '–'} {r.bot ? '🤖 ' : ''}
							{r.name}
						</span>
						<span className="font-mono text-gray-600">{r.timeMs != null ? fmtTime(r.timeMs) : 'bỏ cuộc'}</span>
					</li>
				))}
			</ol>
			<button onClick={onBack} className="w-full rounded-xl bg-gray-900 py-2.5 font-semibold text-white hover:bg-gray-800">
				Về phòng chờ, đua ván mới
			</button>
		</section>
	);
}

function DuckStyles() {
	return (
		<style>{`
			@keyframes duckBob { 0%,100% { transform: translateY(0) rotate(-2deg) } 50% { transform: translateY(-4px) rotate(2deg) } }
			.duck-bob, .duck-swim > svg { animation: duckBob 1.1s ease-in-out infinite; }
			.finish-line { background: repeating-conic-gradient(#111827 0 25%, #fff 0 50%) 0 0 / 12px 12px; opacity: .8; }
			.tap-pad { touch-action: manipulation; -webkit-tap-highlight-color: transparent; }
			@keyframes padHit { 0% { transform: scale(.96) } 100% { transform: scale(1) } }
			.pad-hit { animation: padHit .12s ease-out; }
		`}</style>
	);
}
