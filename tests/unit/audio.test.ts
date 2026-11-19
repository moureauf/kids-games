import { afterEach, describe, expect, it, vi } from "vitest";

/** Records every value set on an AudioParam. */
class FakeParam {
	value = 0;
	events: [string, number, number?][] = [];
	setValueAtTime(v: number, t: number) {
		this.events.push(["set", v, t]);
	}
	linearRampToValueAtTime(v: number, t: number) {
		this.events.push(["linear", v, t]);
	}
	exponentialRampToValueAtTime(v: number, t: number) {
		this.events.push(["exp", v, t]);
	}
}

class FakeNode {
	connected: unknown[] = [];
	connect(n: unknown) {
		this.connected.push(n);
	}
}

class FakeSource extends FakeNode {
	onended: (() => void) | null = null;
	started = false;
	start() {
		this.started = true;
		setTimeout(() => this.onended?.(), 0);
	}
	stop() {}
}

class FakeOscillator extends FakeSource {
	type = "sine";
	frequency = new FakeParam();
}

class FakeBufferSource extends FakeSource {
	buffer: unknown = null;
}

class FakeGain extends FakeNode {
	gain = new FakeParam();
}

class FakeAudioContext {
	static last: FakeAudioContext;
	state = "suspended";
	currentTime = 0;
	sampleRate = 44100;
	destination = new FakeNode();
	gains: FakeGain[] = [];
	oscillators: FakeOscillator[] = [];
	sources: FakeBufferSource[] = [];
	decoded = 0;
	constructor() {
		FakeAudioContext.last = this;
	}
	resume() {
		this.state = "running";
		return Promise.resolve();
	}
	createGain() {
		const g = new FakeGain();
		this.gains.push(g);
		return g;
	}
	createOscillator() {
		const o = new FakeOscillator();
		this.oscillators.push(o);
		return o;
	}
	createBufferSource() {
		const s = new FakeBufferSource();
		this.sources.push(s);
		return s;
	}
	createBuffer() {
		return { duration: 0 };
	}
	decodeAudioData() {
		this.decoded++;
		return Promise.resolve({ duration: 0.01 });
	}
}

async function setup() {
	vi.stubGlobal("AudioContext", FakeAudioContext);
	vi.stubGlobal("speechSynthesis", undefined);
	const fetch = vi.fn(async () => new Response(new ArrayBuffer(8)));
	vi.stubGlobal("fetch", fetch);
	vi.resetModules();
	const audio = await import("../../src/core/audio");
	return { fetch, ...audio };
}

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("audio", () => {
	it("unlockAudio resumes the context and plays a silent sample", async () => {
		const { unlockAudio } = await setup();
		unlockAudio();
		const c = FakeAudioContext.last;
		expect(c.state).toBe("running");
		expect(c.sources[0]?.started).toBe(true);
	});

	it("caps the master volume for young ears", async () => {
		const { playTone, MAX_VOLUME } = await setup();
		await playTone({ freq: 440, duration: 100, volume: 5 });
		const c = FakeAudioContext.last;
		const masterGain = c.gains[0];
		expect(MAX_VOLUME).toBeLessThanOrEqual(0.5);
		expect(masterGain?.gain.value).toBe(MAX_VOLUME);
		// The tone's own envelope never goes above 1 (= MAX_VOLUME overall).
		const peaks = c.gains[1]?.gain.events.map(([, v]) => v) ?? [];
		expect(Math.max(...peaks)).toBe(1);
	});

	it("playTone plays the frequency, slide and length asked for", async () => {
		const { playTone } = await setup();
		await playTone({
			freq: 300,
			slideTo: 600,
			duration: 200,
			type: "triangle",
		});
		const osc = FakeAudioContext.last.oscillators[0];
		expect(osc?.type).toBe("triangle");
		expect(osc?.frequency.events).toEqual([
			["set", 300, 0],
			["exp", 600, 0.2],
		]);
	});

	it("playFile fetches once, then plays from the cache", async () => {
		const { playFile, fetch } = await setup();
		await playFile("assets/sounds/pop.mp3");
		await playFile("assets/sounds/pop.mp3");
		expect(fetch).toHaveBeenCalledTimes(1);
		const c = FakeAudioContext.last;
		expect(c.decoded).toBe(1);
		expect(c.sources.filter((s) => s.started)).toHaveLength(2);
	});

	it("playFile resolves quietly when the file is missing", async () => {
		const { playFile, fetch } = await setup();
		fetch.mockResolvedValueOnce(new Response(null, { status: 404 }));
		const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
		await expect(playFile("missing.mp3")).resolves.toBeUndefined();
		expect(warn).toHaveBeenCalled();
		warn.mockRestore();
	});

	it("does nothing, and never throws, without Web Audio", async () => {
		vi.stubGlobal("AudioContext", undefined);
		vi.stubGlobal("speechSynthesis", undefined);
		vi.resetModules();
		const { unlockAudio, playFile, playTone } = await import(
			"../../src/core/audio"
		);
		expect(() => unlockAudio()).not.toThrow();
		await expect(playFile("a.mp3")).resolves.toBeUndefined();
		await expect(
			playTone({ freq: 440, duration: 100 }),
		).resolves.toBeUndefined();
	});
});
