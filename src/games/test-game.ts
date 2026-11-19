// A tiny game used only by the e2e tests (shown when the page URL has
// `?e2e`). It exercises the hub tile, the home button and the end screen
// until the real games exist. Children never see it.
import type { Game, GameContext } from "../core/game";

const balloonSvg = `
<svg viewBox="0 0 200 200" aria-hidden="true" focusable="false">
	<rect width="200" height="200" rx="32" fill="#cdeccf"/>
	<path d="M100 132 q-8 24 6 44" fill="none" stroke="#2b2140" stroke-width="4" stroke-linecap="round"/>
	<ellipse cx="100" cy="82" rx="44" ry="54" fill="#ff7a59"/>
	<path d="M92 134 h16 l-8 -10 z" fill="#ff7a59"/>
	<ellipse cx="84" cy="62" rx="10" ry="16" fill="#ffffff" opacity="0.5"/>
</svg>`;

const starSvg = `
<svg viewBox="0 0 100 100" aria-hidden="true" focusable="false">
	<path d="M50 6 l13 28 l30 4 l-22 21 l6 30 l-27 -15 l-27 15 l6 -30 l-22 -21 l30 -4 z" fill="#ffd36e" stroke="#2b2140" stroke-width="5" stroke-linejoin="round"/>
</svg>`;

let root: HTMLElement | undefined;

export const testGame: Game = {
	id: "test",
	title: "Test game",
	tile: balloonSvg,
	mount(el: HTMLElement, ctx: GameContext) {
		root = el;
		el.innerHTML = `<button type="button" class="test-finish" aria-label="Finish">${starSvg}</button>`;
		el.querySelector("button")?.addEventListener("click", () => ctx.showEnd());
	},
	unmount() {
		root?.replaceChildren();
		root = undefined;
	},
};
