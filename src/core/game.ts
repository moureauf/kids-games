// The contract every game implements. The hub lists games by their tile,
// and the router mounts one game at a time into the game view.
export interface Game {
	/** Route id, e.g. "sound-safari" (the route is `#/<id>`). */
	id: string;
	/** For aria-label only; the child does not read. */
	title: string;
	/** Inline SVG markup for the hub tile (original art). */
	tile: string;
	mount(el: HTMLElement, ctx: GameContext): void;
	unmount(): void;
}

export interface GameContext {
	goHome(): void;
	/** Shows the shared end-of-round screen (and unmounts the game). */
	showEnd(): void;
}
