// The game registry. Add each new game here; its tile then shows on the hub
// and its route `#/<id>` works. Also add it to tests/e2e/offline.spec.ts.
import type { Game } from "../core/game";
import { soundSafari } from "./sound-safari";
import { testGame } from "./test-game";

export const games: Game[] = [soundSafari];

/** The games to show: the real ones, plus the test game when `?e2e` is set. */
export function availableGames(search: string): Game[] {
	const withTest = new URLSearchParams(search).has("e2e");
	return withTest ? [...games, testGame] : games;
}
