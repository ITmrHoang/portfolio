// Đổi "công sức" của người chơi thành boost (0..MAX_BOOST):
// - Ấn: mỗi lần chạm cộng một xung, xung giảm dần theo thời gian (ấn càng dày càng nhanh).
// - Hét: đo độ to micro (RMS) bằng Web Audio, trừ tiếng ồn nền, càng to càng nhanh.
import { MAX_BOOST } from './protocol';

const TAP_IMPULSE = 0.3;
const TAP_DECAY_S = 0.6;

export class BoostInput {
	private tapEnergy = 0;
	private tapAt = 0;
	private voiceBoost = 0;
	/** Độ to micro đã chuẩn hoá 0..1 (để vẽ thanh đo). */
	level = 0;
	micOn = false;
	private ctx: AudioContext | null = null;
	private stream: MediaStream | null = null;
	private timer: ReturnType<typeof setInterval> | undefined;
	private floor = 0.01;

	tap() {
		this.tapEnergy = Math.min(MAX_BOOST, this.decayedTap() + TAP_IMPULSE);
		this.tapAt = performance.now();
	}

	private decayedTap() {
		const dt = (performance.now() - this.tapAt) / 1000;
		return this.tapEnergy * Math.exp(-dt / TAP_DECAY_S);
	}

	/** Boost hiện tại theo các cách điều khiển đang bật. */
	boost(useTap: boolean, useVoice: boolean) {
		const t = useTap ? this.decayedTap() : 0;
		const v = useVoice && this.micOn ? this.voiceBoost : 0;
		return Math.min(MAX_BOOST, Math.max(t, v));
	}

	async startMic(): Promise<void> {
		if (this.micOn) return;
		if (!navigator.mediaDevices?.getUserMedia) throw new Error('Trình duyệt không hỗ trợ micro (cần HTTPS).');
		const stream = await navigator.mediaDevices.getUserMedia({
			audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
		});
		const Ctx = window.AudioContext || (window as any).webkitAudioContext;
		const ctx: AudioContext = new Ctx();
		await ctx.resume().catch(() => {});
		const analyser = ctx.createAnalyser();
		analyser.fftSize = 1024;
		ctx.createMediaStreamSource(stream).connect(analyser);
		const buf = new Float32Array(analyser.fftSize);
		this.ctx = ctx;
		this.stream = stream;
		this.micOn = true;
		this.floor = 0.01;
		this.timer = setInterval(() => {
			analyser.getFloatTimeDomainData(buf);
			let sum = 0;
			for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
			const rms = Math.sqrt(sum / buf.length);
			// Ồn nền: bám nhanh khi im lặng hơn, tăng rất chậm khi to (để tiếng hét không bị coi là nền).
			this.floor = rms < this.floor ? this.floor * 0.8 + rms * 0.2 : this.floor * 0.998 + rms * 0.002;
			const level = Math.min(1, Math.max(0, (rms - this.floor * 1.8) / 0.2));
			this.level = level;
			const target = level * MAX_BOOST;
			// Lên nhanh, xuống chậm cho vịt chạy mượt.
			this.voiceBoost += (target - this.voiceBoost) * (target > this.voiceBoost ? 0.4 : 0.08);
		}, 50);
	}

	stopMic() {
		clearInterval(this.timer);
		this.stream?.getTracks().forEach((t) => t.stop());
		this.ctx?.close().catch(() => {});
		this.ctx = null;
		this.stream = null;
		this.micOn = false;
		this.level = 0;
		this.voiceBoost = 0;
	}
}
