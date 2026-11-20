import { describe, expect, it, vi } from "vitest";
import { watchForUpdates } from "../../src/core/update";

// A fake navigator.serviceWorker: the test sets the controller and fires
// controllerchange, as the browser does when a new worker takes control.
function fakeContainer(controller: unknown) {
	const listeners: (() => void)[] = [];
	const update = vi.fn(async () => undefined);
	const container = {
		controller,
		addEventListener(_type: "controllerchange", listener: () => void) {
			listeners.push(listener);
		},
		getRegistration: vi.fn(async () => ({ update })),
		takeControl(next: unknown) {
			container.controller = next;
			for (const l of listeners) l();
		},
		update,
	};
	return container;
}

function setup(controller: unknown, startOnHub: boolean) {
	const sw = fakeContainer(controller);
	const screen = { hub: startOnHub };
	const reload = vi.fn();
	const watcher = watchForUpdates(sw, () => screen.hub, reload);
	return { sw, screen, reload, watcher };
}

describe("watchForUpdates", () => {
	it("reloads at once when a new version takes control on the hub", () => {
		const { sw, reload } = setup("old worker", true);
		sw.takeControl("new worker");
		expect(reload).toHaveBeenCalledTimes(1);
	});

	it("waits while a game is open, then reloads when the hub shows", () => {
		const { sw, screen, reload, watcher } = setup("old worker", false);
		sw.takeControl("new worker");
		expect(reload).not.toHaveBeenCalled();

		// Another game screen (for example the end screen) is still not calm.
		watcher.screenShown();
		expect(reload).not.toHaveBeenCalled();

		screen.hub = true;
		watcher.screenShown();
		expect(reload).toHaveBeenCalledTimes(1);
	});

	it("does not reload on the first visit, when the first worker takes control", () => {
		const { sw, reload } = setup(null, true);
		sw.takeControl("first worker");
		expect(reload).not.toHaveBeenCalled();
	});

	it("reloads for a later version after the first install", () => {
		const { sw, reload } = setup(null, true);
		sw.takeControl("first worker");
		sw.takeControl("second worker");
		expect(reload).toHaveBeenCalledTimes(1);
	});

	it("reloads only once, even if more screens show before the page goes", () => {
		const { sw, reload, watcher } = setup("old worker", true);
		sw.takeControl("new worker");
		watcher.screenShown();
		sw.takeControl("newer worker");
		expect(reload).toHaveBeenCalledTimes(1);
	});

	it("looks for a new version each time the hub shows, not in a game", async () => {
		const { sw, screen, watcher } = setup("old worker", false);
		watcher.screenShown();
		await Promise.resolve();
		expect(sw.getRegistration).not.toHaveBeenCalled();

		screen.hub = true;
		watcher.screenShown();
		await vi.waitFor(() => expect(sw.update).toHaveBeenCalledTimes(1));
	});

	it("ignores a failed check (for example offline)", async () => {
		const { sw, watcher } = setup("old worker", true);
		sw.update.mockRejectedValueOnce(new TypeError("offline"));
		watcher.screenShown();
		await vi.waitFor(() => expect(sw.update).toHaveBeenCalledTimes(1));
	});

	it("does nothing with no service worker support", () => {
		const reload = vi.fn();
		const watcher = watchForUpdates(undefined, () => true, reload);
		watcher.screenShown();
		expect(reload).not.toHaveBeenCalled();
	});
});
