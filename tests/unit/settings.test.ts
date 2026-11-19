import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type SettingsModule = typeof import("../../src/core/settings");

const KEY = "kids-games:settings:v1";

class FakeStorage {
	data = new Map<string, string>();
	getItem(key: string) {
		return this.data.get(key) ?? null;
	}
	setItem(key: string, value: string) {
		this.data.set(key, String(value));
	}
	removeItem(key: string) {
		this.data.delete(key);
	}
}

class ThrowingStorage {
	getItem(): string | null {
		throw new Error("SecurityError");
	}
	setItem() {
		throw new Error("QuotaExceededError");
	}
}

let win: EventTarget;

async function load(storage: unknown): Promise<SettingsModule> {
	vi.stubGlobal("localStorage", storage);
	return import("../../src/core/settings");
}

function storageEvent(key: string | null): Event {
	return Object.assign(new Event("storage"), { key });
}

beforeEach(() => {
	vi.resetModules();
	win = new EventTarget();
	vi.stubGlobal("window", win);
});

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("settings", () => {
	it("defaults to English only", async () => {
		const s = await load(new FakeStorage());
		expect(s.getSettings()).toEqual({ french: false });
	});

	it("saves a change under one versioned key", async () => {
		const storage = new FakeStorage();
		const s = await load(storage);
		s.setSetting("french", true);
		expect(s.getSettings()).toEqual({ french: true });
		expect(JSON.parse(storage.getItem(KEY) ?? "")).toEqual({ french: true });
		expect([...storage.data.keys()]).toEqual([KEY]);
	});

	it("reads a saved choice after a reload", async () => {
		const storage = new FakeStorage();
		(await load(storage)).setSetting("french", true);
		vi.resetModules();
		const reloaded = await load(storage);
		expect(reloaded.getSettings().french).toBe(true);
	});

	it("uses the defaults for corrupt or wrong-typed data", async () => {
		const storage = new FakeStorage();
		const s = await load(storage);
		for (const raw of [
			"{not json",
			"null",
			"42",
			'"yes"',
			'{"french":"yes"}',
		]) {
			storage.setItem(KEY, raw);
			expect(s.getSettings()).toEqual({ french: false });
		}
		storage.setItem(KEY, '{"french":true,"extra":1}');
		expect(s.getSettings()).toEqual({ french: true });
	});

	it("works for the visit when storage throws", async () => {
		const s = await load(new ThrowingStorage());
		expect(s.getSettings()).toEqual({ french: false });
		expect(() => s.setSetting("french", true)).not.toThrow();
		expect(s.getSettings().french).toBe(true);
	});

	it("works when localStorage is missing", async () => {
		const s = await load(undefined);
		expect(s.getSettings()).toEqual({ french: false });
		s.setSetting("french", true);
		expect(s.getSettings().french).toBe(true);
	});

	it("returns a copy that cannot change the settings", async () => {
		const s = await load(new FakeStorage());
		const copy = s.getSettings();
		copy.french = true;
		expect(s.getSettings().french).toBe(false);
	});

	it("tells listeners about a change until they unsubscribe", async () => {
		const s = await load(new FakeStorage());
		const seen: boolean[] = [];
		const off = s.onSettingsChange((v) => seen.push(v.french));
		s.setSetting("french", true);
		s.setSetting("french", false);
		off();
		s.setSetting("french", true);
		expect(seen).toEqual([true, false]);
	});

	it("tells listeners about a change from another tab", async () => {
		const storage = new FakeStorage();
		const s = await load(storage);
		const cb = vi.fn();
		s.onSettingsChange(cb);

		win.dispatchEvent(storageEvent("some-other-key"));
		expect(cb).not.toHaveBeenCalled();

		storage.setItem(KEY, '{"french":true}');
		win.dispatchEvent(storageEvent(KEY));
		expect(cb).toHaveBeenLastCalledWith({ french: true });

		storage.data.clear();
		win.dispatchEvent(storageEvent(null));
		expect(cb).toHaveBeenLastCalledWith({ french: false });
	});
});
