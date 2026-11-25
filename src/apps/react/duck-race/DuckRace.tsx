import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import Duck from './Duck';
import RaceStage from './RaceStage';
import { BoostInput } from './boostInput';
import { DuckRoomClient } from './roomClient';
import type { RaceRun } from './roomClient';
import {
	COLORS,
	DEFAULT_CONFIG,
	GLASSES,
	GLASSES_LABEL,
	HATS,
	HAT_LABEL,
	LIMITS,
	MAX_BOOST,
	OUTFITS,
	OUTFIT_LABEL,
	baseSpeed,
	botDistance,
	cleanName,
	fmtTime,
	lineup,
	seatOf,
	normalizeRoomId,
	randomNames,
	randomRoomId,
	randomStyle,
	sanitizeStyle,
	type DuckStyle,
	type InputMode,
	type Racer,
	type Ranked,
	type RoomConfig,
} from './protocol';

const NAME_KEY = 'duck-race:name';
const STYLE_KEY = 'duck-race:style';
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
function loadStyle(): DuckStyle {
	try {
		const raw = readLS(STYLE_KEY);
		if (raw) return sanitizeStyle(JSON.parse(raw));
	} catch {
		/* bỏ qua */
	}
	const s = randomStyle();
	writeLS(STYLE_KEY, JSON.stringify(s));
	return s;
}

const MODE_LABEL: Record<InputMode, string> = { any: 'Ấn hoặc hét', tap: 'Chỉ ấn', voice: 'Chỉ hét' };

export default function DuckRace() {
	const [client, setClient] = useState<DuckRoomClient | null>(null);
	const [name, setName] = useState('');
	const [style, setStyle] = useState<DuckStyle | null>(null);
	const [roomInput, setRoomInput] = useState('');
	const [error, setError] = useState('');
	const boost = useMemo(() => new BoostInput(), []);
	useSyncExternalStore(client?.subscribe ?? noopSub, client?.getVersion ?? zero, zero);

	useEffect(() => {
		setName(readLS(NAME_KEY));
		setStyle(loadStyle());
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

	const changeStyle = (s: DuckStyle) => {
		setStyle(s);
		writeLS(STYLE_KEY, JSON.stringify(s));
		client?.setStyle(s);
	};

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
		const c = new DuckRoomClient(id, n, style ?? loadStyle(), DEFAULT_CONFIG);
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
				style={style}
				setStyle={changeStyle}
				roomInput={roomInput}
				setRoomInput={setRoomInput}
				error={error}
				onJoin={join}
			/>
		);
	}

	return <RoomScreen client={client} boost={boost} style={style ?? client.style} setStyle={changeStyle} onLeave={leave} />;
}

// ---------------------------------------------------------------------------

function JoinScreen(props: {
	name: string;
	setName: (v: string) => void;
	style: DuckStyle | null;
	setStyle: (s: DuckStyle) => void;
	roomInput: string;
	setRoomInput: (v: string) => void;
	error: string;
	onJoin: () => void;
}) {
	const { name, setName, style, setStyle, roomInput, setRoomInput, error, onJoin } = props;
	return (
		<form
			className="space-y-5"
			onSubmit={(e) => {
				e.preventDefault();
				onJoin();
			}}
		>
			<p className="text-center text-sm text-gray-600">
				Nhập cùng một mã phòng với bạn bè. Phòng chưa có thì bạn sẽ tạo phòng và làm <strong>host</strong>. Trong phòng, mỗi
				người chọn <strong>vào một ô để đua</strong> hoặc <strong>chỉ xem</strong>; host có thể thêm vịt máy cho đủ ô.
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
			{style && <StylePicker style={style} onChange={setStyle} number={1} title="Vịt của bạn" />}
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
			{error && <p className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
			<button type="submit" className="w-full rounded-xl bg-amber-500 py-3 font-bold text-white shadow-sm transition hover:bg-amber-600 active:scale-[.99]">
				Vào phòng
			</button>
		</form>
	);
}

/** Chọn màu, mũ, trang phục, kính cho một con vịt. */
function StylePicker({ style, onChange, number, title }: { style: DuckStyle; onChange: (s: DuckStyle) => void; number: number; title: string }) {
	const sel = 'w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm';
	return (
		<section className="rounded-2xl border border-gray-100 bg-gradient-to-b from-sky-50 to-white p-3">
			<div className="mb-2 flex items-center justify-between">
				<h3 className="text-sm font-bold text-gray-800">{title}</h3>
				<button type="button" onClick={() => onChange(randomStyle())} className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs font-semibold hover:bg-gray-50">
					🎲 Ngẫu nhiên
				</button>
			</div>
			<div className="flex items-center gap-3">
				<div className="shrink-0 rounded-xl bg-sky-400/30 p-1">
					<Duck duck={style} number={number} size={84} />
				</div>
				<div className="grid min-w-0 flex-1 grid-cols-1 gap-1.5 sm:grid-cols-3">
					<select aria-label="Mũ" className={sel} value={style.hat} onChange={(e) => onChange({ ...style, hat: e.target.value as DuckStyle['hat'] })}>
						{HATS.map((h) => (
							<option key={h} value={h}>
								🎩 {HAT_LABEL[h]}
							</option>
						))}
					</select>
					<select aria-label="Trang phục" className={sel} value={style.outfit} onChange={(e) => onChange({ ...style, outfit: e.target.value as DuckStyle['outfit'] })}>
						{OUTFITS.map((o) => (
							<option key={o} value={o}>
								👕 {OUTFIT_LABEL[o]}
							</option>
						))}
					</select>
					<select aria-label="Kính" className={sel} value={style.glasses} onChange={(e) => onChange({ ...style, glasses: e.target.value as DuckStyle['glasses'] })}>
						{GLASSES.map((g) => (
							<option key={g} value={g}>
								🕶️ {GLASSES_LABEL[g]}
							</option>
						))}
					</select>
				</div>
			</div>
			<div className="mt-2 flex flex-wrap gap-1.5">
				{COLORS.map((c, i) => (
					<button
						key={c}
						type="button"
						aria-label={`Màu ${i + 1}`}
						onClick={() => onChange({ ...style, color: i })}
						className={`h-6 w-6 rounded-full border-2 ${style.color === i ? 'border-gray-900 scale-110' : 'border-white shadow'}`}
						style={{ background: c }}
					/>
				))}
			</div>
		</section>
	);
}

// ---------------------------------------------------------------------------

function RoomScreen({
	client,
	boost,
	style,
	setStyle,
	onLeave,
}: {
	client: DuckRoomClient;
	boost: BoostInput;
	style: DuckStyle;
	setStyle: (s: DuckStyle) => void;
	onLeave: () => void;
}) {
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

	useEffect(() => {
		if ((!useVoice || (s && seatOf(s.seats, client.selfId) < 0)) && boost.micOn) {
			boost.stopMic();
			force((x) => x + 1);
		}
	}, [useVoice, boost, s, client]);

	const toggleMic = async () => {
		if (boost.micOn) boost.stopMic();
		else {
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

			{client.hostLost && <HostLostBanner lost={client.hostLost} />}
			{client.notice && !client.hostLost && <p className="rounded-xl border border-sky-100 bg-sky-50 px-4 py-2 text-sm text-sky-800">{client.notice}</p>}

			{(client.status === 'connecting' || client.status === 'searching') && (
				<Waiting text="Đang tìm phòng… nếu chưa ai mở phòng này, bạn sẽ tự trở thành host." style={style} />
			)}
			{client.status === 'waiting' && <Waiting text="Đã thấy phòng, đang chờ host cho vào…" style={style} />}

			{client.status === 'joined' && s && (
				<>
					{race ? (
						<RaceView client={client} race={race} boost={boost} useTap={useTap} useVoice={useVoice} micOn={boost.micOn} onToggleMic={toggleMic} />
					) : (
						<Lobby client={client} micOn={boost.micOn} micError={micError} onToggleMic={toggleMic} boost={boost} style={style} setStyle={setStyle} />
					)}
				</>
			)}
		</div>
	);
}

/** Host bấm để trao quyền host cho người khác (hỏi lại trước khi trao). */
function HandoverButton({ client, toId, name }: { client: DuckRoomClient; toId: string; name: string }) {
	return (
		<button
			type="button"
			title={`Trao quyền host cho ${name}`}
			onClick={() => {
				if (confirm(`Trao quyền host cho ${name}? Bạn vẫn ở lại phòng.`)) client.handover(toId);
			}}
			className="rounded-full px-1.5 text-[11px] font-semibold text-amber-700 hover:bg-amber-100"
		>
			👑 Trao host
		</button>
	);
}

/** Đang mất kết nối với host: đếm ngược tới lúc tự đổi host. */
function HostLostBanner({ lost }: { lost: NonNullable<DuckRoomClient['hostLost']> }) {
	const [now, setNow] = useState(Date.now());
	useEffect(() => {
		const t = setInterval(() => setNow(Date.now()), 500);
		return () => clearInterval(t);
	}, []);
	const left = lost.takeoverAt != null ? Math.max(0, Math.ceil((lost.takeoverAt - now) / 1000)) : null;
	return (
		<p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900">
			⚠️ Mất kết nối với host <strong>{lost.oldHostName}</strong>. Ván đua (nếu có) vẫn chạy tiếp trên máy bạn.{' '}
			{left == null
				? 'Đang chờ host mới…'
				: left > 0
					? lost.rank === 0
						? `Nếu host không quay lại, sau ${left} s bạn (người vào phòng sớm nhất còn lại) sẽ làm host.`
						: `Nếu host không quay lại sau ít giây, người vào phòng sớm nhất còn lại sẽ làm host (bạn là dự phòng thứ ${(lost.rank ?? 0) + 1}, còn ${left} s).`
					: 'Đang nhận làm host…'}
		</p>
	);
}

function Waiting({ text, style }: { text: string; style: DuckStyle }) {
	return (
		<div className="flex flex-col items-center gap-3 py-10 text-center text-gray-600">
			<div className="wait-bob">
				<Duck duck={style} size={80} />
			</div>
			<p className="text-sm">{text}</p>
			<style>{`@keyframes wb{0%,100%{transform:translateY(0) rotate(-3deg)}50%{transform:translateY(-6px) rotate(3deg)}}.wait-bob{animation:wb 1s ease-in-out infinite}`}</style>
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
	style,
	setStyle,
}: {
	client: DuckRoomClient;
	micOn: boolean;
	micError: string;
	onToggleMic: () => void;
	boost: BoostInput;
	style: DuckStyle;
	setStyle: (s: DuckStyle) => void;
}) {
	const s = client.state!;
	const c = s.config;
	const host = client.isHost;
	const me = client.me;
	const mySeat = client.mySeat;
	const seated = mySeat >= 0;
	const racingNow = s.phase === 'racing';
	const racers = useMemo(() => lineup(s.seats, s.players), [s.seats, s.players]);
	const seatedHumans = client.seated(s);
	const viewers = s.players.filter((p) => seatOf(s.seats, p.id) < 0);
	const emptyCount = s.seats.filter((x) => x.kind === 'empty').length;
	const canJoin = !racingNow && (emptyCount > 0 || s.seats.length < LIMITS.seats[1]);
	const notReady = seatedHumans.filter((p) => !p.ready && p.id !== s.hostId);
	const hostCanStart = client.canStart(s, true);

	const startHint =
		racers.length < 2
			? 'Cần ít nhất 2 vịt (người hoặc máy) để đua.'
			: notReady.length
				? `Chờ ${notReady.map((p) => p.name).join(', ')} sẵn sàng…`
				: seatedHumans.length
					? 'Mọi người đã sẵn sàng!'
					: 'Toàn vịt máy, bấm để bắt đầu.';

	const stageBottom = racingNow ? null : host ? (
		<div className="flex flex-col items-center gap-1">
			<button
				onClick={() => client.hostStart()}
				disabled={!hostCanStart}
				className="rounded-2xl bg-gradient-to-b from-emerald-400 to-emerald-600 px-6 py-3 text-lg font-black text-white shadow-lg ring-4 ring-white/60 transition hover:brightness-110 active:scale-95 disabled:opacity-60 disabled:hover:brightness-100"
			>
				▶ Bắt đầu đua
			</button>
			<span className="rounded-full bg-black/45 px-3 py-0.5 text-xs font-semibold text-white">{startHint}</span>
		</div>
	) : (
		<div className="mx-auto w-fit rounded-full bg-black/45 px-3 py-1 text-sm font-semibold text-white">
			{!seated ? '👀 Bạn đang xem' : me?.ready ? '✓ Đã sẵn sàng, chờ host bắt đầu' : 'Bấm "Sẵn sàng" ở bên dưới'}
		</div>
	);

	return (
		<div className="space-y-4">
			<RaceStage
				racers={racers}
				trackLength={c.trackLength}
				selfId={client.selfId}
				hud={
					<span className="inline-block rounded-full bg-black/45 px-2 py-0.5 text-xs font-bold text-white">
						{racers.length} vịt · {c.trackLength} m
					</span>
				}
				bottom={stageBottom}
			/>

			{racingNow && (
				<p className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-800">Một ván đang diễn ra, chờ ván sau để vào ô.</p>
			)}

			{/* Thanh của tôi: tham gia / chỉ xem / sẵn sàng */}
			{!racingNow && me && (
				<div className="flex flex-wrap items-center gap-2 rounded-2xl border border-gray-100 bg-gray-50 p-3">
					{seated ? (
						<>
							<span className="text-sm text-gray-700">
								Bạn đang ở <strong>ô {mySeat + 1}</strong>
							</span>
							<span className="flex-1" />
							<button onClick={() => client.leaveMySeat()} className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100">
								👀 Rời ô, chỉ xem
							</button>
							<button
								onClick={() => client.setReady(!me.ready)}
								className={`rounded-xl px-4 py-2 text-sm font-bold text-white shadow-sm transition active:scale-[.98] ${
									me.ready ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-amber-500 hover:bg-amber-600'
								}`}
							>
								{me.ready ? '✓ Đã sẵn sàng' : 'Sẵn sàng!'}
							</button>
						</>
					) : (
						<>
							<span className="text-sm text-gray-700">👀 Bạn đang xem. Muốn đua thì vào một ô trống.</span>
							<span className="flex-1" />
							<button
								onClick={() => client.joinSeat()}
								disabled={!canJoin}
								className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-amber-600 disabled:opacity-50"
							>
								{canJoin ? '🦆 Tham gia đua' : 'Hết ô trống'}
							</button>
						</>
					)}
				</div>
			)}

			{seated && <StylePicker style={style} onChange={setStyle} number={mySeat + 1} title="Vịt của bạn" />}

			<SeatGrid client={client} />

			{host && !racingNow && <BotNamesEditor client={client} />}

			{/* Người xem */}
			<section className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
				<div className="mb-2 flex items-center justify-between">
					<h3 className="font-bold text-gray-900">Người xem ({viewers.length})</h3>
					<span className="text-xs text-gray-500">
						Trong phòng {s.players.length}/{c.maxPeople} người
					</span>
				</div>
				{viewers.length ? (
					<ul className="flex flex-wrap gap-2">
						{viewers.map((p) => (
							<li key={p.id} className="flex items-center gap-1.5 rounded-full border border-gray-100 bg-white py-0.5 pl-1 pr-3 text-sm">
								<Duck duck={p.style} size={26} />
								{p.name}
								{p.id === client.selfId && <span className="text-gray-400">(bạn)</span>}
								{p.id === s.hostId && <span title="Host">👑</span>}
								{host && p.id !== client.selfId && <HandoverButton client={client} toId={p.id} name={p.name} />}
							</li>
						))}
					</ul>
				) : (
					<p className="text-sm text-gray-500">Chưa có ai chỉ xem. Ai vào phòng mà chưa nhận ô sẽ ở đây.</p>
				)}
			</section>

			{/* Luật phòng */}
			<section className="rounded-2xl border border-gray-100 p-4">
				<h3 className="mb-3 font-bold text-gray-900">
					Luật phòng {!host && <span className="text-xs font-normal text-gray-400">(host cài đặt)</span>}
				</h3>
				<ConfigForm client={client} config={c} editable={host && !racingNow} />
				<p className="mt-3 text-xs text-gray-500">
					Không làm gì vịt vẫn bơi và về đích sau khoảng <strong>{c.estTime} s</strong>. Người đua ấn nhanh hoặc hét to thì vịt nhanh hơn, tối đa ×
					{(1 + MAX_BOOST).toFixed(1)}. Vịt máy đua cùng người thì chạy vừa phải; phòng toàn vịt máy thì tốc độ đổi liên tục, khó đoán.
				</p>
			</section>

			{seated && c.inputMode !== 'tap' && (
				<section className="rounded-2xl border border-gray-100 p-4">
					<div className="flex items-center gap-3">
						<button onClick={onToggleMic} className={`shrink-0 whitespace-nowrap rounded-xl px-4 py-2 text-sm font-semibold ${micOn ? 'bg-rose-500 text-white' : 'bg-gray-900 text-white'}`}>
							{micOn ? '🎙️ Tắt micro' : '🎙️ Bật micro'}
						</button>
						{micOn ? <MicMeter boost={boost} /> : <span className="text-sm text-gray-500">Bật micro để hét "go go!" cho vịt chạy.</span>}
					</div>
					{micError && <p className="mt-2 text-sm text-rose-600">{micError}</p>}
				</section>
			)}
		</div>
	);
}

/** Lưới các ô đua: trống (chờ người vào), người thật, hoặc vịt máy. */
function SeatGrid({ client }: { client: DuckRoomClient }) {
	const s = client.state!;
	const host = client.isHost;
	const editable = !(s.phase === 'racing');
	const mySeat = client.mySeat;
	const filled = s.seats.filter((x) => x.kind !== 'empty').length;
	const randomBot = () => ({ name: randomNames(1)[0], style: randomStyle() });

	return (
		<section className="rounded-2xl border border-gray-100 p-4">
			<div className="mb-3 flex flex-wrap items-center gap-2">
				<h3 className="font-bold text-gray-900">
					Ô đua ({filled}/{s.seats.length})
				</h3>
				<span className="flex-1" />
				{host && editable && (
					<>
						<div className="flex items-center gap-1">
							<button onClick={() => client.setSeatCount(s.seats.length - 1)} className="h-8 w-8 rounded-lg border border-gray-200 font-bold hover:bg-gray-50" aria-label="Bớt một ô">
								−
							</button>
							<span className="w-14 text-center text-sm text-gray-600">{s.seats.length} ô</span>
							<button onClick={() => client.setSeatCount(s.seats.length + 1)} className="h-8 w-8 rounded-lg border border-gray-200 font-bold hover:bg-gray-50" aria-label="Thêm một ô">
								+
							</button>
						</div>
						<button
							onClick={() => client.fillWithBots()}
							disabled={!s.seats.some((x) => x.kind === 'empty')}
							className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-semibold hover:bg-gray-50 disabled:opacity-50"
						>
							🤖 Thêm máy cho đủ
						</button>
					</>
				)}
			</div>
			<ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
				{s.seats.map((seat, i) => {
					const p = seat.kind === 'human' ? s.players.find((x) => x.id === seat.id) : undefined;
					const mine = i === mySeat;
					return (
						<li
							key={i}
							className={`relative flex min-h-[132px] flex-col items-center gap-1 rounded-2xl border-2 p-2 pt-3 text-center ${
								seat.kind === 'empty'
									? 'border-dashed border-gray-200 bg-gray-50/60'
									: mine
										? 'border-amber-400 bg-amber-50'
										: seat.kind === 'bot'
											? 'border-sky-100 bg-sky-50/60'
											: 'border-gray-100 bg-white'
							}`}
						>
							<span className="absolute left-2 top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-gray-900 px-1 text-[11px] font-black text-white">{i + 1}</span>

							{seat.kind === 'empty' && (
								<>
									<div className="opacity-25 grayscale">
										<Duck duck={{ color: 7, hat: 'none', outfit: 'none', glasses: 'none' }} size={52} />
									</div>
									<span className="text-xs font-medium text-gray-400">Ô trống</span>
									<div className="mt-auto flex flex-wrap justify-center gap-1">
										{editable && client.me && !mine && (
											<button onClick={() => client.joinSeat(i)} className="rounded-lg bg-amber-500 px-2 py-1 text-xs font-bold text-white hover:bg-amber-600">
												{mySeat >= 0 ? 'Chuyển vào' : 'Tham gia'}
											</button>
										)}
										{host && editable && (
											<button onClick={() => client.setBot(i, randomBot())} className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs font-semibold hover:bg-gray-100">
												🤖 Máy
											</button>
										)}
									</div>
								</>
							)}

							{seat.kind === 'human' && (
								<>
									<Duck duck={p?.style ?? { color: 0, hat: 'none', outfit: 'none', glasses: 'none' }} number={i + 1} size={52} mine={mine} />
									<span className="w-full truncate text-sm font-semibold">
										{p?.name ?? '…'}
										{mine && <span className="font-normal text-gray-400"> (bạn)</span>}
										{seat.id === s.hostId && ' 👑'}
									</span>
									<span className={`mt-auto rounded-full px-2 py-0.5 text-[11px] font-semibold ${p?.ready ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
										{p?.ready ? 'Sẵn sàng' : 'Chưa sẵn sàng'}
									</span>
									{host && seat.id !== client.selfId && (
										<HandoverButton client={client} toId={seat.id} name={p?.name ?? ''} />
									)}
								</>
							)}

							{seat.kind === 'bot' && (
								<>
									<button
										type="button"
										disabled={!host || !editable}
										title={host ? 'Bấm để đổi trang phục' : undefined}
										onClick={() => client.setBot(i, { name: seat.name, style: randomStyle() })}
										className="rounded-lg disabled:cursor-default"
									>
										<Duck duck={seat.style} number={i + 1} size={52} />
									</button>
									{host && editable ? (
										<input
											key={seat.name}
											defaultValue={seat.name}
											maxLength={20}
											aria-label={`Tên vịt máy ô ${i + 1}`}
											onBlur={(e) => {
												const v = cleanName(e.target.value);
												if (v && v !== seat.name) client.setBot(i, { name: v, style: seat.style });
												else e.target.value = seat.name;
											}}
											onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
											className="w-full rounded-md border border-transparent bg-transparent px-1 text-center text-sm font-semibold hover:border-sky-200 focus:border-amber-400 focus:bg-white focus:outline-none"
										/>
									) : (
										<span className="w-full truncate text-sm font-semibold">{seat.name}</span>
									)}
									<div className="mt-auto flex items-center gap-1">
										<span className="rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-semibold text-sky-700">🤖 Máy</span>
										{host && editable && (
											<button onClick={() => client.clearSeat(i)} className="rounded-full px-1.5 text-xs text-gray-400 hover:bg-rose-50 hover:text-rose-500" aria-label={`Bỏ vịt máy ô ${i + 1}`}>
												✕
											</button>
										)}
									</div>
								</>
							)}
						</li>
					);
				})}
			</ul>
		</section>
	);
}

/** Tách danh sách tên: mỗi dòng (không rỗng) là một vịt. */
const parseNames = (text: string) => text.split(/\r?\n/).map(cleanName).filter(Boolean);

/** Host nhập tên vịt máy, mỗi dòng một vịt: thêm dòng thì thêm vịt (điền ô trống rồi thêm ô), xoá dòng thì bớt vịt. */
function BotNamesEditor({ client }: { client: DuckRoomClient }) {
	const s = client.state!;
	const joined = s.seats.flatMap((x) => (x.kind === 'bot' ? [x.name] : [])).join('\n');
	const [text, setText] = useState(joined);
	const focused = useRef(false);
	const timer = useRef<ReturnType<typeof setTimeout>>();
	const humans = s.seats.filter((x) => x.kind === 'human').length;
	const maxBots = LIMITS.seats[1] - humans;

	useEffect(() => {
		if (!focused.current) setText(joined);
	}, [joined]);
	useEffect(() => () => clearTimeout(timer.current), []);

	const apply = (t: string) => {
		const names = parseNames(t).slice(0, maxBots);
		if (names.join('\n') !== joined) client.setBotNames(names);
	};
	const lines = parseNames(text).length;
	const rawLines = text.split(/\r?\n/);

	return (
		<section className="rounded-2xl border border-gray-100 p-4">
			<label className="font-bold text-gray-900" htmlFor="bot-names">
				Tên vịt máy <span className="text-sm font-normal text-gray-500">(mỗi dòng một vịt)</span>
			</label>
			<p className="mt-0.5 text-xs text-gray-500">Thêm dòng thì thêm vịt máy (điền vào ô trống trước, hết ô thì thêm ô); xoá dòng thì bớt vịt.</p>
			<div className="mt-2 flex overflow-hidden rounded-xl border border-gray-200 focus-within:ring-2 focus-within:ring-amber-400">
				<div aria-hidden className="select-none bg-gray-50 px-2 py-2 text-right font-mono text-sm leading-6 text-gray-400">
					{(() => {
						let n = 0;
						return rawLines.map((line, i) => <div key={i}>{cleanName(line) ? ++n : ' '}</div>);
					})()}
				</div>
				<textarea
					id="bot-names"
					value={text}
					onChange={(e) => {
						const t = e.target.value;
						setText(t);
						clearTimeout(timer.current);
						timer.current = setTimeout(() => apply(t), 400);
					}}
					onFocus={() => (focused.current = true)}
					onBlur={() => {
						focused.current = false;
						clearTimeout(timer.current);
						apply(text);
						setText(parseNames(text).slice(0, maxBots).join('\n'));
					}}
					rows={Math.min(22, Math.max(3, rawLines.length))}
					wrap="off"
					spellCheck={false}
					placeholder={'Vịt Vàng\nVịt Xanh\nVịt Đỏ'}
					className="min-w-0 flex-1 resize-y px-3 py-2 text-sm leading-6 focus:outline-none"
				/>
			</div>
			<p className={`mt-1 text-xs ${lines > maxBots ? 'font-semibold text-rose-600' : 'text-gray-500'}`}>
				{lines > maxBots ? `Tối đa ${maxBots} vịt máy (đã có ${humans} người đua), các dòng cuối bị bỏ qua.` : `${lines} dòng = ${lines} vịt máy`}
			</p>
		</section>
	);
}

function ConfigForm({ client, config, editable }: { client: DuckRoomClient; config: RoomConfig; editable: boolean }) {
	const minPeople = Math.max(LIMITS.maxPeople[0], client.state?.players.length ?? 1);
	const field = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm disabled:bg-gray-50 disabled:text-gray-600';
	const num = (key: 'maxPeople' | 'trackLength' | 'estTime', label: string, min: number, max: number, step = 1, unit = '') => (
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
			{num('maxPeople', 'Người tối đa trong phòng', minPeople, LIMITS.maxPeople[1])}
			{num('trackLength', 'Độ dài đường đua', LIMITS.trackLength[0], LIMITS.trackLength[1], 10, 'm')}
			{num('estTime', 'Thời gian ước lượng', LIMITS.estTime[0], LIMITS.estTime[1], 5, 's')}
			<label className="block">
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
	const L = race.config.trackLength;
		const myFinish = race.finish[client.selfId];
	const playing = race.participant && myFinish == null && !race.ended;
	const meterRef = useRef<HTMLDivElement>(null);
	const statRef = useRef<HTMLSpanElement>(null);

	// Quãng đường hiển thị của từng vịt (sau vạch đích vẫn trôi thêm một chút cho tự nhiên).
	const getDistance = useMemo(
		() => {
			const shown: Record<string, number> = {};
			const v = baseSpeed(race.config);
			const over = (finishMs: number | undefined, el: number) =>
				finishMs != null && el > finishMs ? L + Math.min(L * 0.06, ((el - finishMs) / 1000) * v * 0.6) : null;
			return (r: Racer, el: number) => {
				if (r.bot) {
					const t = race.bots[r.id];
					return over(t.finishMs, el) ?? botDistance(t, el);
				}
				const fin = over(race.finish[r.id], el);
				if (fin != null) return fin;
				if (r.id === client.selfId) return race.myD;
				const target = client.remote[r.id] ?? 0;
				const cur = shown[r.id] ?? 0;
				return (shown[r.id] = cur + (target - cur) * 0.2);
			};
		},
		[race, client, L],
	);

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

	// Thanh tốc độ của mình.
	useEffect(() => {
		if (!playing) return;
		let raf = 0;
		const loop = () => {
			const b = client.getBoost();
			if (meterRef.current) meterRef.current.style.width = `${Math.round((b / MAX_BOOST) * 100)}%`;
			if (statRef.current) statRef.current.textContent = `${Math.round(race.myD)}/${L} m · ×${(1 + b).toFixed(1)}`;
			raf = requestAnimationFrame(loop);
		};
		raf = requestAnimationFrame(loop);
		return () => cancelAnimationFrame(raf);
	}, [playing, client, race, L]);

	const onTap = playing && useTap ? () => performance.now() >= race.t0 && boost.tap() : undefined;

	const bottom = playing ? (
		<div className="mx-auto max-w-md space-y-1.5 rounded-2xl bg-black/40 p-2 text-white backdrop-blur-sm">
			<div className="flex items-center gap-2 text-xs font-semibold">
				<span ref={statRef} className="font-mono" />
				<span className="flex-1 text-right opacity-90">{useTap ? '👆 Ấn màn hình liên tục!' : '🎙️ Hét thật to!'}</span>
				{useVoice && (
					<button onClick={onToggleMic} className={`rounded-lg px-2 py-1 ${micOn ? 'bg-rose-500' : 'bg-white/20'}`}>
						{micOn ? '🎙️ Đang nghe' : '🎙️ Bật mic'}
					</button>
				)}
			</div>
			<div className="h-2 overflow-hidden rounded-full bg-white/25">
				<div ref={meterRef} className="h-full bg-gradient-to-r from-emerald-400 via-amber-300 to-rose-500" />
			</div>
		</div>
	) : race.participant && myFinish != null && !race.ended ? (
		<div className="mx-auto w-fit rounded-full bg-emerald-500/90 px-4 py-1.5 text-sm font-bold text-white">
			🎉 Về đích sau {fmtTime(myFinish)}! Chờ những vịt khác…
		</div>
	) : null;

	return (
		<RaceStage
			racers={race.racers}
			trackLength={L}
			selfId={client.selfId}
			t0={race.t0}
			getDistance={getDistance}
			followId={race.participant ? client.selfId : undefined}
			onTap={onTap}
			hud={
				<span className="inline-block rounded-full bg-black/45 px-2 py-0.5 text-xs font-bold text-white">
					Ván {race.round} · {L} m{!race.participant ? ' · bạn đang xem' : ''}
				</span>
			}
			bottom={bottom}
			overlay={race.ended && race.results ? <Results results={race.results} selfId={client.selfId} onBack={() => client.dismissRace()} /> : undefined}
		/>
	);
}

function Results({ results, selfId, onBack }: { results: Ranked[]; selfId: string; onBack: () => void }) {
	const winner = results.find((r) => r.place === 1);
	const podium = [results.find((r) => r.place === 2), winner, results.find((r) => r.place === 3)];
	const heights = ['h-14', 'h-20', 'h-10'];
	const medals = ['🥈', '🥇', '🥉'];
	return (
		<section className="w-full max-w-sm space-y-3 rounded-2xl bg-white/95 p-4 shadow-2xl">
			<h3 className="text-center text-xl font-black text-gray-900" data-testid="winner">
				{winner ? `🏆 ${winner.number}. ${winner.name}${winner.id === selfId ? ' (bạn)' : ''} thắng!` : 'Không ai về đích'}
			</h3>
			<div className="flex items-end justify-center gap-2">
				{podium.map((r, i) =>
					r ? (
						<div key={r.id} className="flex w-24 flex-col items-center">
							<Duck duck={r.style} number={r.number} size={56} mine={r.id === selfId} />
							<div className="w-full truncate text-center text-xs font-semibold">{r.name}</div>
							<div className={`mt-1 flex w-full items-start justify-center rounded-t-lg bg-amber-100 pt-1 text-xl ${heights[i]}`}>{medals[i]}</div>
						</div>
					) : (
						<div key={i} className="w-24" />
					),
				)}
			</div>
			<ol className="max-h-40 space-y-0.5 overflow-y-auto text-sm">
				{results.map((r) => (
					<li key={r.id} className={`flex justify-between gap-2 rounded-lg px-3 py-1 ${r.id === selfId ? 'bg-amber-50 font-semibold' : ''}`}>
						<span className="truncate">
							{r.place ? `${r.place}.` : '–'} <span className="text-gray-400">#{r.number}</span> {r.name}
						</span>
						<span className="shrink-0 font-mono text-gray-600">{r.timeMs != null ? fmtTime(r.timeMs) : 'bỏ cuộc'}</span>
					</li>
				))}
			</ol>
			<button onClick={onBack} className="w-full rounded-xl bg-gray-900 py-2.5 font-semibold text-white hover:bg-gray-800">
				Về phòng chờ, đua ván mới
			</button>
		</section>
	);
}
