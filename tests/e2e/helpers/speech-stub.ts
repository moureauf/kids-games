import type { Page } from "@playwright/test";

/** One utterance the page asked the browser to say. */
export interface Spoken {
	text: string;
	/** The utterance's language tag, e.g. "en-GB" or "fr-FR". */
	lang: string;
}

declare global {
	interface Window {
		__spoken: Spoken[];
	}
}

export interface SpeechStubOptions {
	/** Voices the fake browser has. Default: one en-GB and one fr-FR voice. */
	voices?: string[];
}

/**
 * Replace speechSynthesis with a silent fake before the page loads. Every
 * utterance is recorded (text and lang) on `window.__spoken` and "ends" at
 * once, so games never wait on real speech. Empty utterances (the iPad
 * unlock) are not recorded.
 *
 * Call before `page.goto`. Use `voices: []` to test a device with no voices.
 */
export async function installSpeechStub(
	page: Page,
	options: SpeechStubOptions = {},
): Promise<void> {
	const voices = options.voices ?? ["en-GB", "fr-FR"];
	await page.addInitScript((langs: string[]) => {
		type Utterance = {
			text: string;
			lang: string;
			onend: ((e: Event) => void) | null;
			onerror: ((e: Event) => void) | null;
		};
		window.__spoken = [];
		const voiceList = langs.map((lang) => ({
			lang,
			name: `Test voice ${lang}`,
			localService: true,
			default: false,
			voiceURI: `test:${lang}`,
		}));
		class FakeUtterance extends EventTarget {
			text: string;
			lang = "";
			voice: unknown = null;
			rate = 1;
			pitch = 1;
			volume = 1;
			onend = null;
			onerror = null;
			onstart = null;
			constructor(text = "") {
				super();
				this.text = text;
			}
		}
		let queue: Utterance[] = [];
		const synth = Object.assign(new EventTarget(), {
			speaking: false,
			pending: false,
			paused: false,
			onvoiceschanged: null,
			getVoices: () => voiceList,
			speak(u: Utterance) {
				if (u.text.trim() !== "") {
					window.__spoken.push({ text: u.text, lang: u.lang });
				}
				queue.push(u);
				setTimeout(() => {
					if (!queue.includes(u)) return;
					queue = queue.filter((q) => q !== u);
					u.onend?.(new Event("end"));
				}, 0);
			},
			cancel() {
				const cancelled = queue;
				queue = [];
				for (const u of cancelled) u.onerror?.(new Event("error"));
			},
			pause() {},
			resume() {},
		});
		Object.defineProperty(window, "speechSynthesis", {
			value: synth,
			configurable: true,
		});
		Object.defineProperty(window, "SpeechSynthesisUtterance", {
			value: FakeUtterance,
			configurable: true,
			writable: true,
		});
	}, voices);
}

/** Everything said so far, in order. */
export function spoken(page: Page): Promise<Spoken[]> {
	return page.evaluate(() => window.__spoken);
}
