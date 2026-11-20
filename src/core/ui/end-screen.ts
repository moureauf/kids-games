// The calm end-of-round screen every game shows when its round is over.
// It praises the effort, never shows a score, and never starts a new round
// on its own: the only way on is the home button. It says its line once
// when it opens; a tap on the moon says it again (the child cannot read).
import { say } from "../speech";
import { houseSvg } from "./home-button";

export const END_MESSAGE = "Well done for trying!";

// Original art: a sleepy moon on a cloud under a few stars.
const sleepyMoonSvg = `
<svg class="end-art" viewBox="0 0 400 300" aria-hidden="true" focusable="false">
	<rect width="400" height="300" rx="36" fill="#3b3366"/>
	<g fill="#fff3b0">
		<path d="M70 60 l6 14 l15 2 l-11 10 l3 15 l-13 -8 l-13 8 l3 -15 l-11 -10 l15 -2 z"/>
		<path d="M320 50 l4 9 l10 1 l-7 7 l2 10 l-9 -5 l-9 5 l2 -10 l-7 -7 l10 -1 z"/>
		<path d="M345 150 l3 7 l8 1 l-6 5 l2 8 l-7 -4 l-7 4 l2 -8 l-6 -5 l8 -1 z"/>
		<circle cx="120" cy="140" r="4"/>
		<circle cx="280" cy="110" r="3"/>
		<circle cx="50" cy="200" r="3"/>
	</g>
	<mask id="end-moon-mask">
		<rect width="400" height="300" fill="#fff"/>
		<circle cx="262" cy="125" r="72" fill="#000"/>
	</mask>
	<circle cx="220" cy="145" r="80" fill="#ffe08a" mask="url(#end-moon-mask)"/>
	<path d="M156 126 q9 7 18 0" fill="none" stroke="#7a5a2b" stroke-width="4" stroke-linecap="round"/>
	<circle cx="158" cy="150" r="7" fill="#ffb3a1"/>
	<path d="M166 166 q8 6 15 -1" fill="none" stroke="#7a5a2b" stroke-width="4" stroke-linecap="round"/>
	<text x="232" y="110" font-family="system-ui, sans-serif" font-size="22" font-weight="700" fill="#cfc6ff">z</text>
	<text x="252" y="88" font-family="system-ui, sans-serif" font-size="28" font-weight="700" fill="#cfc6ff">z</text>
	<path d="M60 262 q10 -34 46 -26 q14 -30 52 -18 q24 -22 56 0 q40 -10 46 26 q30 0 30 18 H60 z" fill="#f4f0ff"/>
</svg>`;

export function createEndScreen(onHome: () => void): HTMLElement {
	const screen = document.createElement("section");
	screen.className = "end-screen";
	screen.setAttribute("aria-label", "End of round");
	screen.innerHTML = `
		<button type="button" class="end-moon" aria-label="Say it again">${sleepyMoonSvg}</button>
		<p class="end-message">${END_MESSAGE}</p>
		<button type="button" class="end-home" aria-label="Home">${houseSvg}</button>`;
	screen
		.querySelector<HTMLButtonElement>(".end-home")
		?.addEventListener("click", onHome);

	// One line at a time: a tap while the line is still being said does not
	// queue it again.
	let speaking = false;
	const sayLine = () => {
		if (speaking) return;
		speaking = true;
		void say(END_MESSAGE, "en").then(() => {
			speaking = false;
		});
	};
	screen
		.querySelector<HTMLButtonElement>(".end-moon")
		?.addEventListener("click", sayLine);
	sayLine();
	return screen;
}
