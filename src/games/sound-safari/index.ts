// Sound safari: a sunny meadow with six creatures. Tap one and it moves
// and its name is said in English. Every tap is a good tap: there is no
// wrong answer and nothing to fail. (The round end comes in a later issue.)
import { playTone, unlockAudio } from "../../core/audio";
import type { Game } from "../../core/game";
import { cancelSpeech, say } from "../../core/speech";
import {
	cloudSvg,
	creatureArt,
	flowerSvg,
	landSvg,
	sunSvg,
	tileSvg,
} from "./art";
import { type AnimationKind, type Creature, creatures } from "./creatures";

const ANIM_CLASSES = ["anim-bounce", "anim-wiggle", "anim-drive", "anim-stomp"];

/** A soft little sound that matches each movement. */
const TONES: Record<
	AnimationKind,
	{ freq: number; slideTo: number; duration: number }
> = {
	bounce: { freq: 440, slideTo: 700, duration: 160 },
	wiggle: { freq: 620, slideTo: 520, duration: 140 },
	drive: { freq: 180, slideTo: 240, duration: 220 },
	stomp: { freq: 200, slideTo: 130, duration: 180 },
};

/** Flowers dotted over the meadow, clear of the creatures (x, y in %). */
const FLOWERS: [number, number][] = [
	[6, 66],
	[34, 70],
	[63, 64],
	[93, 70],
	[33, 98],
	[62, 99],
];

function creatureButton(c: Creature): HTMLButtonElement {
	const button = document.createElement("button");
	button.type = "button";
	button.className = "creature";
	button.dataset.creature = c.id;
	button.dataset.kind = c.kind;
	button.setAttribute("aria-label", c.en[0]?.toUpperCase() + c.en.slice(1));
	button.style.setProperty("--x", `${c.x}%`);
	button.style.setProperty("--y", `${c.y}%`);
	const art = creatureArt[c.id] ?? "";
	const figure = c.flip
		? `<g transform="translate(200 0) scale(-1 1)">${art}</g>`
		: art;
	button.innerHTML = `
		<svg viewBox="0 0 200 200" aria-hidden="true" focusable="false">
			<ellipse class="shadow" cx="100" cy="181" rx="72" ry="9"/>
			<g class="figure">${figure}</g>
		</svg>`;
	return button;
}

let root: HTMLElement | undefined;
let cleanup: (() => void) | undefined;

export const soundSafari: Game = {
	id: "sound-safari",
	title: "Sound safari",
	tile: tileSvg,
	mount(el: HTMLElement) {
		root = el;
		const scene = document.createElement("div");
		scene.className = "safari";
		scene.innerHTML = `
			<div class="safari-sky"></div>
			${sunSvg}
			<div class="safari-clouds">${cloudSvg}${cloudSvg}</div>
			${landSvg}
			${FLOWERS.map(
				([x, y]) =>
					`<span class="safari-flower-spot" style="--x:${x}%;--y:${y}%">${flowerSvg}</span>`,
			).join("")}`;

		let unlocked = false;
		let speaking: string | undefined;

		const speak = (c: Creature) => {
			// Tapping the same creature again restarts its movement but does
			// not queue its name again while it is still being said.
			if (speaking === c.id) return;
			if (speaking !== undefined) cancelSpeech();
			speaking = c.id;
			void say(c.en, "en").then(() => {
				if (speaking === c.id) speaking = undefined;
			});
		};

		const play = (button: HTMLButtonElement, c: Creature) => {
			if (!unlocked) {
				// iPad keeps sound and speech locked until a tap starts them.
				unlockAudio();
				unlocked = true;
			}
			// Restart the movement from the beginning.
			button.classList.remove(...ANIM_CLASSES);
			void button.getBoundingClientRect();
			button.classList.add(`anim-${c.animation}`);
			void playTone({ ...TONES[c.animation], type: "sine", volume: 0.35 });
			speak(c);
		};

		const removers: (() => void)[] = [];
		for (const c of creatures) {
			const button = creatureButton(c);
			const figure = button.querySelector(".figure");
			const onDown = (e: PointerEvent) => {
				// One finger at a time: a second finger or a palm is ignored.
				if (!e.isPrimary) return;
				e.preventDefault();
				play(button, c);
			};
			// Keyboard (switch access, grown-ups): click with no pointer.
			const onClick = (e: MouseEvent) => {
				if (e.detail === 0) play(button, c);
			};
			const onEnd = (e: AnimationEvent) => {
				if (e.target === figure) button.classList.remove(...ANIM_CLASSES);
			};
			button.addEventListener("pointerdown", onDown);
			button.addEventListener("click", onClick);
			button.addEventListener("animationend", onEnd);
			removers.push(() => {
				button.removeEventListener("pointerdown", onDown);
				button.removeEventListener("click", onClick);
				button.removeEventListener("animationend", onEnd);
			});
			scene.append(button);
		}
		const noMenu = (e: Event) => e.preventDefault();
		scene.addEventListener("contextmenu", noMenu);
		removers.push(() => scene.removeEventListener("contextmenu", noMenu));

		cleanup = () => {
			for (const remove of removers) remove();
			speaking = undefined;
		};
		el.append(scene);
	},
	unmount() {
		cancelSpeech();
		cleanup?.();
		cleanup = undefined;
		root?.replaceChildren();
		root = undefined;
	},
};
