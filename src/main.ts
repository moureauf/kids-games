import "./style.css";
import type { Game, GameContext } from "./core/game";
import { hubHash, parseRoute } from "./core/router";
import { cancelSpeech } from "./core/speech";
import { createEndScreen } from "./core/ui/end-screen";
import { createHomeButton } from "./core/ui/home-button";
import { createHub } from "./core/ui/hub";
import { availableGames } from "./games";

const app = document.querySelector<HTMLElement>("#app");
if (!app) throw new Error("#app missing");
const root: HTMLElement = app;

const games = availableGames(location.search);
let current: Game | undefined;

function goHome(): void {
	location.hash = hubHash();
}

function unmountCurrent(): void {
	const game = current;
	current = undefined;
	game?.unmount();
}

// True while the end screen is on view. Games stop their own speech when
// they unmount; the end screen has no unmount, so the router stops it.
let onEndScreen = false;

function leaveEndScreen(): void {
	if (!onEndScreen) return;
	onEndScreen = false;
	cancelSpeech();
}

function showHub(): void {
	if (location.hash !== hubHash()) {
		history.replaceState(null, "", hubHash());
	}
	root.className = "";
	root.replaceChildren(createHub(games));
}

function showGame(game: Game): void {
	const view = document.createElement("div");
	view.className = "game-view";
	view.dataset.game = game.id;
	const stage = document.createElement("div");
	stage.className = "game-stage";
	view.append(stage, createHomeButton(goHome));

	const ctx: GameContext = {
		goHome,
		showEnd() {
			// Ignore a late call from a game that is no longer on screen.
			if (current !== game || !view.isConnected) return;
			unmountCurrent();
			onEndScreen = true;
			view.replaceChildren(createEndScreen(goHome));
		},
	};

	root.className = "in-game";
	root.replaceChildren(view);
	current = game;
	game.mount(stage, ctx);
}

function render(): void {
	unmountCurrent();
	leaveEndScreen();
	const route = parseRoute(
		location.hash,
		games.map((g) => g.id),
	);
	const game =
		route.name === "game" ? games.find((g) => g.id === route.id) : undefined;
	if (game) showGame(game);
	else showHub();
}

window.addEventListener("hashchange", render);
render();
