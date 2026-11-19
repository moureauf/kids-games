// Speech with the Web Speech API. English uses an en-GB voice, French a
// fr-FR voice. Nothing here ever throws: with no speech support or no voice
// the game carries on in silence.

export type Lang = "en" | "fr";

const PREFERRED: Record<Lang, string> = { en: "en-gb", fr: "fr-fr" };

/** How long to wait for voices to load (iPad loads them asynchronously). */
const VOICE_WAIT_MS = 1500;

/** Speech rate a little slower than normal, for young listeners. */
const RATE = 0.9;

/** Speech volume, kept below full for small ears. */
const VOLUME = 0.8;

function normalise(tag: string): string {
	return tag.replace("_", "-").toLowerCase();
}

/**
 * The best voice for a language: the preferred region (en-GB, fr-FR) first,
 * then any voice of that language. Local (offline) voices win ties.
 */
export function pickVoice(
	voices: readonly SpeechSynthesisVoice[],
	lang: Lang,
): SpeechSynthesisVoice | undefined {
	const ofLang = voices.filter((v) => {
		const tag = normalise(v.lang);
		return tag === lang || tag.startsWith(`${lang}-`);
	});
	const byLocal = (a: SpeechSynthesisVoice, b: SpeechSynthesisVoice) =>
		Number(b.localService) - Number(a.localService);
	const preferred = ofLang
		.filter((v) => normalise(v.lang) === PREFERRED[lang])
		.sort(byLocal);
	return preferred[0] ?? [...ofLang].sort(byLocal)[0];
}

function synth(): SpeechSynthesis | undefined {
	return typeof speechSynthesis === "undefined" ? undefined : speechSynthesis;
}

/** Voices, waiting a little for them to load if the list is still empty. */
function loadVoices(s: SpeechSynthesis): Promise<SpeechSynthesisVoice[]> {
	const now = s.getVoices();
	if (now.length > 0) return Promise.resolve(now);
	return new Promise((resolve) => {
		const done = () => {
			clearTimeout(timer);
			s.removeEventListener("voiceschanged", done);
			resolve(s.getVoices());
		};
		const timer = setTimeout(done, VOICE_WAIT_MS);
		s.addEventListener("voiceschanged", done);
	});
}

// Bumped by cancelSpeech so a running sayAll stops and pending says resolve.
let generation = 0;
const pending = new Set<() => void>();

/**
 * Say a word or sentence. Resolves when it has been spoken, or at once when
 * there is no speech support or no voice for the language.
 */
export async function say(text: string, lang: Lang = "en"): Promise<void> {
	const s = synth();
	if (!s || typeof SpeechSynthesisUtterance === "undefined") return;
	const started = generation;
	const voices = await loadVoices(s);
	if (started !== generation) return;
	const voice = pickVoice(voices, lang);
	// Some voices are installed, but none speaks this language: stay silent
	// rather than read French with an English voice.
	if (voices.length > 0 && !voice) return;

	return new Promise<void>((resolve) => {
		const finish = () => {
			clearTimeout(watchdog);
			pending.delete(finish);
			resolve();
		};
		// Some browsers drop the end event; never leave a game waiting.
		const watchdog = setTimeout(finish, 3000 + text.length * 200);
		pending.add(finish);
		try {
			const u = new SpeechSynthesisUtterance(text);
			u.lang = voice?.lang ?? PREFERRED[lang];
			if (voice) u.voice = voice;
			u.rate = RATE;
			u.volume = VOLUME;
			u.onend = finish;
			u.onerror = finish;
			s.speak(u);
		} catch {
			finish();
		}
	});
}

/** Say several items in order, e.g. the English word, then the French one. */
export async function sayAll(
	items: readonly { text: string; lang: Lang }[],
): Promise<void> {
	const started = generation;
	for (const item of items) {
		if (started !== generation) return;
		await say(item.text, item.lang);
	}
}

/** Stop all speech now. Pending say and sayAll promises resolve. */
export function cancelSpeech(): void {
	generation++;
	try {
		synth()?.cancel();
	} catch {
		// Nothing to stop.
	}
	for (const finish of [...pending]) finish();
}

/**
 * iPad Safari only speaks after speech was started inside a tap. Speaking an
 * empty, silent utterance during the first tap unlocks it.
 */
export function unlockSpeech(): void {
	const s = synth();
	if (!s || typeof SpeechSynthesisUtterance === "undefined") return;
	try {
		const u = new SpeechSynthesisUtterance("");
		u.volume = 0;
		s.speak(u);
	} catch {
		// No speech: nothing to unlock.
	}
}
