// The shared home button shown in the corner of every game. It only works
// after a short hold, so a stray tap from a toddler does not end the game.
// A ring fills while the finger stays down; lifting early does nothing.
import { holdRingSvg, makeHoldButton } from "./hold";

export const HOME_HOLD_MS = 1000;

export const houseSvg = `
<svg viewBox="0 0 100 100" aria-hidden="true" focusable="false">
	<path d="M18 50 L50 20 L82 50" fill="none" stroke="#2b2140" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
	<path d="M28 46 V80 H72 V46" fill="#ffd36e" stroke="#2b2140" stroke-width="6" stroke-linejoin="round"/>
	<rect x="43" y="58" width="14" height="22" rx="3" fill="#ff7a59" stroke="#2b2140" stroke-width="4"/>
</svg>`;

export function createHomeButton(
	onHome: () => void,
	holdMs = HOME_HOLD_MS,
): HTMLButtonElement {
	const button = document.createElement("button");
	button.type = "button";
	button.className = "home-button";
	button.setAttribute("aria-label", "Home (hold)");
	button.innerHTML = `${holdRingSvg}${houseSvg}`;
	makeHoldButton(button, holdMs, onHome);
	return button;
}
