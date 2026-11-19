// The parent gate: a quiet corner button on the hub. Settings open only
// after a 3-second hold while a ring fills. A tap, or lifting early, does
// nothing, so a child exploring the screen does not get in.
import { holdRingSvg, makeHoldButton } from "./hold";

export const PARENT_GATE_HOLD_MS = 3000;

// Original art: a simple cog.
const cogSvg = `
<svg class="gate-icon" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
	<g fill="#2b2140">
		${[0, 45, 90, 135, 180, 225, 270, 315]
			.map(
				(a) =>
					`<rect x="43" y="16" width="14" height="16" rx="3" transform="rotate(${a} 50 50)"/>`,
			)
			.join("")}
		<circle cx="50" cy="50" r="24"/>
	</g>
	<circle cx="50" cy="50" r="10" fill="#fff7e8"/>
</svg>`;

/**
 * The hold time to use. End-to-end tests may shorten it with
 * `?e2e&gateMs=<ms>`; without `e2e` the real 3 seconds always apply.
 */
export function parentGateHoldMs(search: string): number {
	const params = new URLSearchParams(search);
	if (!params.has("e2e")) return PARENT_GATE_HOLD_MS;
	const ms = Number(params.get("gateMs"));
	return Number.isInteger(ms) && ms > 0 ? ms : PARENT_GATE_HOLD_MS;
}

export function createParentGate(
	onOpen: () => void,
	holdMs = PARENT_GATE_HOLD_MS,
): HTMLButtonElement {
	const button = document.createElement("button");
	button.type = "button";
	button.className = "parent-gate";
	button.setAttribute("aria-label", "Settings for grown-ups (hold)");
	button.innerHTML = `${holdRingSvg}${cogSvg}`;
	makeHoldButton(button, holdMs, onOpen);
	return button;
}
