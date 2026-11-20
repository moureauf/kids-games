// Show a new version of the site at a calm moment.
//
// After a deploy, the new service worker installs in the background and
// takes control of the open page (skipWaiting + clientsClaim). The page
// still runs the old code, so it must reload to show the new version. A
// reload in the middle of a game would lose the child's round, so we
// reload only when the hub is on screen. If a game is open, we wait until
// the child goes home. There is no prompt: the child reads nothing.

/** The parts of `navigator.serviceWorker` that we use. */
export interface WorkerContainer {
	readonly controller: unknown;
	addEventListener(type: "controllerchange", listener: () => void): void;
	getRegistration(): Promise<{ update(): Promise<unknown> } | undefined>;
}

export interface UpdateWatcher {
	/** Call each time the router shows a screen. */
	screenShown(): void;
}

/**
 * Watch for a new service worker. `onHub` tells if the hub is on screen
 * now; `reload` loads the new version.
 */
export function watchForUpdates(
	container: WorkerContainer | undefined,
	onHub: () => boolean,
	reload: () => void,
): UpdateWatcher {
	if (!container) return { screenShown() {} };

	// On the first visit the page has no controller. The first
	// controllerchange is then the first install, not a new version.
	let hadController = container.controller != null;
	let pending = false;
	let reloading = false;

	const reloadIfCalm = () => {
		if (!pending || reloading || !onHub()) return;
		reloading = true;
		reload();
	};

	container.addEventListener("controllerchange", () => {
		if (!hadController) {
			hadController = container.controller != null;
			return;
		}
		pending = true;
		reloadIfCalm();
	});

	return {
		screenShown() {
			reloadIfCalm();
			// The home screen app can stay open for days with no navigation,
			// so the browser does not look for a new version. Look each time
			// the hub shows. This fetches only sw.js from this site.
			if (!pending && onHub()) {
				container
					.getRegistration()
					.then((reg) => reg?.update())
					.catch(() => {
						// Offline or no service worker: try again next time.
					});
			}
		},
	};
}
