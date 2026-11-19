import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type Voice = Pick<SpeechSynthesisVoice, "lang" | "name" | "localService">;

function voice(lang: string, name = lang, localService = true): Voice {
	return { lang, name, localService };
}

class FakeUtterance {
	text: string;
	lang = "";
	voice: Voice | null = null;
	rate = 1;
	volume = 1;
	onend: (() => void) | null = null;
	onerror: (() => void) | null = null;
	constructor(text: string) {
		this.text = text;
	}
}

/** A fake speechSynthesis that "speaks" each utterance on the next tick. */
class FakeSynth extends EventTarget {
	voices: Voice[];
	spoken: { text: string; lang: string; voice?: string }[] = [];
	queue: FakeUtterance[] = [];
	autoEnd = true;
	constructor(voices: Voice[]) {
		super();
		this.voices = voices;
	}
	getVoices() {
		return this.voices;
	}
	speak(u: FakeUtterance) {
		this.spoken.push({ text: u.text, lang: u.lang, voice: u.voice?.name });
		this.queue.push(u);
		if (this.autoEnd) setTimeout(() => this.finishNext(), 0);
	}
	finishNext() {
		this.queue.shift()?.onend?.();
	}
	cancel() {
		this.queue = [];
	}
	loadVoices(voices: Voice[]) {
		this.voices = voices;
		this.dispatchEvent(new Event("voiceschanged"));
	}
}

async function setup(voices: Voice[]) {
	const synth = new FakeSynth(voices);
	vi.stubGlobal("speechSynthesis", synth);
	vi.stubGlobal("SpeechSynthesisUtterance", FakeUtterance);
	vi.resetModules();
	const speech = await import("../../src/core/speech");
	return { synth, ...speech };
}

afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllGlobals();
});

describe("pickVoice", () => {
	let pickVoice: typeof import("../../src/core/speech").pickVoice;
	beforeEach(async () => {
		({ pickVoice } = await import("../../src/core/speech"));
	});
	const pick = (voices: Voice[], lang: "en" | "fr") =>
		pickVoice(voices as SpeechSynthesisVoice[], lang)?.name;

	it("prefers en-GB for English", () => {
		const voices = [voice("en-US"), voice("fr-FR"), voice("en-GB")];
		expect(pick(voices, "en")).toBe("en-GB");
	});

	it("prefers fr-FR for French", () => {
		const voices = [voice("fr-CA"), voice("en-GB"), voice("fr-FR")];
		expect(pick(voices, "fr")).toBe("fr-FR");
	});

	it("falls back to any voice of the language", () => {
		expect(pick([voice("en-US"), voice("fr-CA")], "en")).toBe("en-US");
		expect(pick([voice("en-US"), voice("fr-CA")], "fr")).toBe("fr-CA");
	});

	it("reads Android-style and lower-case tags", () => {
		expect(pick([voice("en_US"), voice("en_GB")], "en")).toBe("en_GB");
		expect(pick([voice("fr-fr")], "fr")).toBe("fr-fr");
	});

	it("prefers a local voice over a network one", () => {
		const voices = [
			voice("en-GB", "online", false),
			voice("en-GB", "local", true),
		];
		expect(pick(voices, "en")).toBe("local");
	});

	it("does not mistake other languages for English", () => {
		expect(pick([voice("es-ES"), voice("eu-ES")], "en")).toBeUndefined();
		expect(pick([], "fr")).toBeUndefined();
	});
});

describe("say", () => {
	it("speaks English with the en-GB voice", async () => {
		const { synth, say } = await setup([voice("en-US"), voice("en-GB")]);
		await say("cow");
		expect(synth.spoken).toEqual([
			{ text: "cow", lang: "en-GB", voice: "en-GB" },
		]);
	});

	it("speaks French with the fr-FR voice", async () => {
		const { synth, say } = await setup([voice("en-GB"), voice("fr-FR")]);
		await say("la vache", "fr");
		expect(synth.spoken).toEqual([
			{ text: "la vache", lang: "fr-FR", voice: "fr-FR" },
		]);
	});

	it("waits for voices that load late (iPad)", async () => {
		const { synth, say } = await setup([]);
		const done = say("la vache", "fr");
		synth.loadVoices([voice("en-GB"), voice("fr-FR")]);
		await done;
		expect(synth.spoken).toEqual([
			{ text: "la vache", lang: "fr-FR", voice: "fr-FR" },
		]);
	});

	it("stays silent rather than read French with an English voice", async () => {
		const { synth, say } = await setup([voice("en-GB")]);
		await say("la vache", "fr");
		expect(synth.spoken).toEqual([]);
	});

	it("does not throw or hang when no voice is installed", async () => {
		vi.useFakeTimers();
		const { synth, say } = await setup([]);
		synth.autoEnd = false;
		const done = say("cow");
		await vi.runAllTimersAsync();
		await expect(done).resolves.toBeUndefined();
	});

	it("resolves at once without speech support", async () => {
		vi.stubGlobal("speechSynthesis", undefined);
		vi.resetModules();
		const { say, sayAll, cancelSpeech } = await import("../../src/core/speech");
		await expect(say("cow")).resolves.toBeUndefined();
		await expect(
			sayAll([{ text: "cow", lang: "en" }]),
		).resolves.toBeUndefined();
		expect(() => cancelSpeech()).not.toThrow();
	});

	it("resolves when the browser reports an error", async () => {
		const { synth, say } = await setup([voice("en-GB")]);
		synth.autoEnd = false;
		const done = say("cow");
		await vi.waitFor(() => expect(synth.queue).toHaveLength(1));
		synth.queue[0]?.onerror?.();
		await expect(done).resolves.toBeUndefined();
	});
});

describe("sayAll", () => {
	it("says English, then French, in order", async () => {
		const { synth, sayAll } = await setup([voice("fr-FR"), voice("en-GB")]);
		await sayAll([
			{ text: "the cow", lang: "en" },
			{ text: "la vache", lang: "fr" },
		]);
		expect(synth.spoken).toEqual([
			{ text: "the cow", lang: "en-GB", voice: "en-GB" },
			{ text: "la vache", lang: "fr-FR", voice: "fr-FR" },
		]);
	});

	it("waits for each item to finish before the next", async () => {
		const { synth, sayAll } = await setup([voice("fr-FR"), voice("en-GB")]);
		synth.autoEnd = false;
		const done = sayAll([
			{ text: "the cow", lang: "en" },
			{ text: "la vache", lang: "fr" },
		]);
		await vi.waitFor(() => expect(synth.spoken).toHaveLength(1));
		await new Promise((r) => setTimeout(r, 10));
		expect(synth.spoken).toHaveLength(1);
		synth.finishNext();
		await vi.waitFor(() => expect(synth.spoken).toHaveLength(2));
		synth.finishNext();
		await done;
		expect(synth.spoken.map((s) => s.text)).toEqual(["the cow", "la vache"]);
	});

	it("stops when speech is cancelled", async () => {
		const { synth, sayAll, cancelSpeech } = await setup([
			voice("fr-FR"),
			voice("en-GB"),
		]);
		synth.autoEnd = false;
		const done = sayAll([
			{ text: "the cow", lang: "en" },
			{ text: "la vache", lang: "fr" },
		]);
		await vi.waitFor(() => expect(synth.spoken).toHaveLength(1));
		cancelSpeech();
		await done;
		expect(synth.spoken.map((s) => s.text)).toEqual(["the cow"]);
	});
});
