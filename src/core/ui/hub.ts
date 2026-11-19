// The hub: one big picture tile per game. The child taps a picture; no
// reading is needed. The heading is for grown-ups.
import type { Game } from "../game";
import { gameHash } from "../router";
import { createParentGate, parentGateHoldMs } from "./parent-gate";
import { openSettingsPanel } from "./settings-panel";

export function createHub(games: readonly Game[]): HTMLElement {
	const hub = document.createElement("section");
	hub.className = "hub";

	const heading = document.createElement("h1");
	heading.textContent = "Kids games";
	hub.append(heading);

	const tiles = document.createElement("nav");
	tiles.className = "tiles";
	tiles.setAttribute("aria-label", "Games");
	for (const game of games) {
		const tile = document.createElement("a");
		tile.className = "tile";
		tile.href = gameHash(game.id);
		tile.setAttribute("aria-label", game.title);
		tile.dataset.game = game.id;
		tile.innerHTML = game.tile;
		tiles.append(tile);
	}
	hub.append(tiles);
	const gate = createParentGate(
		() => openSettingsPanel(gate),
		parentGateHoldMs(location.search),
	);
	hub.append(gate);
	return hub;
}
