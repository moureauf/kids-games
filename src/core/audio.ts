// Sounds with Web Audio: precached files and small sounds made by code.
// Everything goes through one master gain that is kept low for young ears.
// Nothing here ever throws: with no audio the game carries on in silence.

import { unlockSpeech } from "./speech";

/** Loudest any sound can be (0..1). Gentle for children's ears. */
export const MAX_VOLUME = 0.5;

let ctx: AudioContext | undefined;
let master: GainNode | undefined;
const buffers = new Map<string, Promise<AudioBuffer | undefined>>();

function context(): AudioContext | undefined {
	if (ctx) return ctx;
	const Ctor =
		globalThis.AudioContext ??
		(globalThis as { webkitAudioContext?: typeof AudioContext })
			.webkitAudioContext;
	if (!Ctor) return undefined;
	try {
		ctx = new Ctor();
		master = ctx.createGain();
		master.gain.value = MAX_VOLUME;
		master.connect(ctx.destination);
	} catch {
		ctx = undefined;
		master = undefined;
	}
	return ctx;
}

/** Wake the context if the iPad suspended it (first tap, app switch). */
function wake(c: AudioContext): void {
	if (c.state !== "running") c.resume().catch(() => {});
}

/**
 * Call on the first tap. iPad Safari keeps audio and speech silent until
 * they are started inside a user gesture.
 */
export function unlockAudio(): void {
	const c = context();
	if (c) {
		wake(c);
		try {
			// One silent sample, played inside the tap.
			const src = c.createBufferSource();
			src.buffer = c.createBuffer(1, 1, c.sampleRate);
			src.connect(c.destination);
			src.start(0);
		} catch {
			// Audio stays locked; sounds will just be silent.
		}
	}
	unlockSpeech();
}

function load(c: AudioContext, url: string): Promise<AudioBuffer | undefined> {
	let buffer = buffers.get(url);
	if (!buffer) {
		// The service worker serves this from the precache, so it works offline.
		buffer = fetch(url)
			.then((r) => {
				if (!r.ok) throw new Error(`${r.status} ${url}`);
				return r.arrayBuffer();
			})
			.then((data) => c.decodeAudioData(data))
			.catch((error: unknown) => {
				console.warn("Sound not played:", error);
				buffers.delete(url);
				return undefined;
			});
		buffers.set(url, buffer);
	}
	return buffer;
}

function ended(node: AudioScheduledSourceNode, seconds: number): Promise<void> {
	return new Promise((resolve) => {
		const done = () => {
			clearTimeout(watchdog);
			resolve();
		};
		// If ended never fires (suspended context), do not keep a game waiting.
		const watchdog = setTimeout(done, seconds * 1000 + 500);
		node.onended = done;
	});
}

/** Play a sound file (a precached asset URL). Resolves when it has finished. */
export async function playFile(url: string): Promise<void> {
	const c = context();
	if (!c || !master) return;
	wake(c);
	const buffer = await load(c, url);
	if (!buffer) return;
	try {
		const src = c.createBufferSource();
		src.buffer = buffer;
		src.connect(master);
		src.start();
		await ended(src, buffer.duration);
	} catch {
		// Silent instead of broken.
	}
}

export interface ToneSpec {
	/** Frequency in Hz. */
	freq: number;
	/** Length in milliseconds. */
	duration: number;
	type?: OscillatorType;
	/** Glide to this frequency (Hz) over the tone, e.g. a rising "boing". */
	slideTo?: number;
	/** 0..1, relative to MAX_VOLUME. Default 0.6. */
	volume?: number;
}

/** Play a short sound made by code. Resolves when it has finished. */
export async function playTone(spec: ToneSpec): Promise<void> {
	const c = context();
	if (!c || !master) return;
	wake(c);
	const seconds = Math.max(0.02, spec.duration / 1000);
	const volume = Math.min(1, Math.max(0, spec.volume ?? 0.6));
	try {
		const t = c.currentTime;
		const osc = c.createOscillator();
		osc.type = spec.type ?? "sine";
		osc.frequency.setValueAtTime(spec.freq, t);
		if (spec.slideTo !== undefined) {
			osc.frequency.exponentialRampToValueAtTime(
				Math.max(1, spec.slideTo),
				t + seconds,
			);
		}
		// Soft start and end, so there is no click.
		const env = c.createGain();
		const fade = Math.min(0.02, seconds / 4);
		env.gain.setValueAtTime(0, t);
		env.gain.linearRampToValueAtTime(volume, t + fade);
		env.gain.setValueAtTime(volume, t + seconds - fade);
		env.gain.linearRampToValueAtTime(0, t + seconds);
		osc.connect(env);
		env.connect(master);
		osc.start(t);
		osc.stop(t + seconds);
		await ended(osc, seconds);
	} catch {
		// Silent instead of broken.
	}
}
