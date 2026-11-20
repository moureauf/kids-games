// Sound safari: a sunny meadow with six creatures. Tap one and it moves
// and its name is said in English. Every tap is a good tap: there is no
// wrong answer and nothing to fail. After ROUND_TAPS taps the safari bus
// drives in, everyone waves, the bus drives home and the end screen shows.
import { playTone, unlockAudio } from "../../core/audio";
import type { Game, GameContext } from "../../core/game";
import { cancelSpeech, say } from "../../core/speech";
import {
	busSvg,
	cloudSvg,
	creatureArt,
	flowerSvg,
	landSvg,
	sunSvg,
	tileSvg,
} from "./art";
import { type AnimationKind, type Creature, creatures } from "./creatures";
import { roundTaps } from "./round";

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
	// Nearer creatures (lower on the screen) stand in front.
	button.style.zIndex = String(Math.round(c.y));
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

/**
 * The end of the round, in three steps. Each step is one CSS animation on
 * the bus; its `animationend` starts the next step. With reduced motion the
 * CSS keeps the bus still, so the steps only hold the picture.
 */
const BUS_STEPS = ["arrive", "wave", "leave"] as const;
type BusStep = (typeof BUS_STEPS)[number];

/** What everyone says when the bus is here. */
const GOODBYE = "Bye bye!";

/**
 * Bring the bus, wave, drive home, then show the end screen. Returns a
 * function that stops it all (for unmount).
 */
function busGoesHome(scene: HTMLElement, ctx: GameContext): () => void {
	const bus = document.createElement("div");
	bus.className = "safari-bus";
	bus.setAttribute("role", "img");
	bus.setAttribute("aria-label", "The safari bus");
	bus.innerHTML = busSvg;
	let stopped = false;
	let tootTimer: number | undefined;

	const go = (step: BusStep) => {
		bus.dataset.step = step;
		scene.dataset.step = step;
		if (step === "arrive") {
			// Two soft toots: the bus is coming.
			void playTone({ freq: 392, duration: 220, volume: 0.25 });
			tootTimer = window.setTimeout(() => {
				void playTone({ freq: 330, duration: 260, volume: 0.25 });
			}, 320);
		}
		if (step === "wave") void say(GOODBYE, "en");
	};
	const onEnd = (e: AnimationEvent) => {
		if (e.target !== bus || stopped) return;
		const next = BUS_STEPS[BUS_STEPS.indexOf(bus.dataset.step as BusStep) + 1];
		if (next) go(next);
		else {
			stopped = true;
			ctx.showEnd();
		}
	};
	bus.addEventListener("animationend", onEnd);
	scene.append(bus);
	go("arrive");
	return () => {
		stopped = true;
		window.clearTimeout(tootTimer);
		bus.removeEventListener("animationend", onEnd);
	};
}

let root: HTMLElement | undefined;
let cleanup: (() => void) | undefined;

export const soundSafari: Game = {
	id: "sound-safari",
	title: "Sound safari",
	tile: tileSvg,
	mount(el: HTMLElement, ctx: GameContext) {
		root = el;
		const tapsInRound = roundTaps(location.search);
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
		let taps = 0;
		let stopBus: (() => void) | undefined;

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
			// The round is over: the bus is here, taps do nothing more.
			if (taps >= tapsInRound) return;
			taps++;
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
			if (taps === tapsInRound) stopBus = busGoesHome(scene, ctx);
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
			stopBus?.();
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
