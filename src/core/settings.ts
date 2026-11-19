// Device settings, chosen by a grown-up behind the parent gate.
// Stored in localStorage only: never uploaded. If storage is missing,
// corrupt or throws (Safari private mode), the defaults are used and a
// change still works for the rest of the visit.

export type Settings = {
	/** Add French words (with the article: "la vache") to the games. */
	french: boolean;
};

export type SettingKey = keyof Settings;

export const SETTINGS_KEY = "kids-games:settings:v1";

export const DEFAULT_SETTINGS: Readonly<Settings> = Object.freeze({
	french: false,
});

type Listener = (settings: Settings) => void;

const listeners = new Set<Listener>();
// The last value set in this tab, used when storage cannot be written.
// Cleared when another tab changes the settings.
let memory: Settings | undefined;
let listeningToStorage = false;

function storage(): Storage | undefined {
	try {
		return globalThis.localStorage ?? undefined;
	} catch {
		return undefined;
	}
}

function parse(raw: string | null): Settings {
	const settings: Settings = { ...DEFAULT_SETTINGS };
	if (!raw) return settings;
	let data: unknown;
	try {
		data = JSON.parse(raw);
	} catch {
		return settings;
	}
	if (typeof data !== "object" || data === null) return settings;
	const record = data as Record<string, unknown>;
	if (typeof record.french === "boolean") settings.french = record.french;
	return settings;
}

function read(): Settings {
	try {
		return parse(storage()?.getItem(SETTINGS_KEY) ?? null);
	} catch {
		return { ...DEFAULT_SETTINGS };
	}
}

/** The current settings (a fresh copy; changing it changes nothing). */
export function getSettings(): Settings {
	return memory ? { ...memory } : read();
}

/** Change one setting, save it, and tell every listener in this tab. */
export function setSetting<K extends SettingKey>(
	key: K,
	value: Settings[K],
): void {
	const next: Settings = { ...getSettings(), [key]: value };
	memory = next;
	try {
		const store = storage();
		if (store) {
			store.setItem(SETTINGS_KEY, JSON.stringify(next));
			// Saved: read from storage again, so other tabs' changes show up.
			memory = undefined;
		}
	} catch {
		// Keep the in-memory value for this visit.
	}
	notify();
}

/** Call `cb` with the new settings after every change. Returns unsubscribe. */
export function onSettingsChange(cb: Listener): () => void {
	listeners.add(cb);
	listenToOtherTabs();
	return () => {
		listeners.delete(cb);
	};
}

function notify(): void {
	const settings = getSettings();
	for (const cb of [...listeners]) cb({ ...settings });
}

function listenToOtherTabs(): void {
	if (listeningToStorage || typeof window === "undefined") return;
	listeningToStorage = true;
	window.addEventListener("storage", (event) => {
		// `key` is null when another tab clears all storage.
		if (event.key !== SETTINGS_KEY && event.key !== null) return;
		memory = undefined;
		notify();
	});
}
