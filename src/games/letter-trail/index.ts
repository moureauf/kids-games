// Unicorn letter trail: the letter screen. A big grey letter sits on guide
// lines (x-height and baseline). A spark shows the stroke once, then the
// start dot pulses. The child traces with a finger: the unicorn follows
// along the path and leaves a rainbow on the part traced so far. Each
// stroke is checked when the finger lifts. A good letter gets a happy
// unicorn and praise for the effort. A trace that does not match gets no
// penalty and no sound: the rainbow fades and the start dot keeps pulsing.
// (Fuller hints: issue #14. The round of 5 letters: issue #15.)
import { playTone, unlockAudio } from "../../core/audio";
import type { Game } from "../../core/game";
import { cancelSpeech, say } from "../../core/speech";
import { RAINBOW, tileSvg, unicornArt } from "./art";
import { type Point, pathLength, pointAt } from "./geometry";
import { BASELINE, BOX_HEIGHT, type Glyph, letters, X_HEIGHT } from "./letters";
import { checkStroke, progressAlong } from "./tracer";

/** Said when the whole letter is traced: praise for the care, not a score. */
export const PRAISE = "What careful tracing. Well done!";

/** The letter of this visit (one letter for now; rounds come in #15). */
const LETTER = "a";

/** Target x-height in CSS px. The tracer tolerances assume about this. */
export const X_HEIGHT_PX = 250;

/** Demo speed: milliseconds per x-height unit of stroke. */
const DEMO_MS_PER_UNIT = 1100;
const DEMO_DELAY_MS = 600;

/** Unicorn height in x-height units: while tracing, and at rest. */
const UNICORN_TRACE = 0.6;
const UNICORN_REST = 1.1;
/** Width of the rainbow ribbon and of the grey letter, in x-height units. */
const RIBBON = 0.3;
const GREY = 0.26;

const pathD = (stroke: Point[]) =>
	stroke
		.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(4)} ${p.y.toFixed(4)}`)
		.join("");

function arrowsMarkup(glyph: Glyph): string {
	const out: string[] = [];
	glyph.strokes.forEach((stroke, i) => {
		for (const f of glyph.arrows[i] ?? []) {
			const { point, angle } = pointAt(stroke, f);
			out.push(
				`<path d="M0.09 0L-0.07 0.08L-0.07 -0.08Z" transform="translate(${point.x} ${point.y}) rotate(${(angle * 180) / Math.PI})"/>`,
			);
		}
	});
	return out.join("");
}

function boardMarkup(glyph: Glyph): string {
	const grey = glyph.strokes
		.map(
			(s) =>
				`<path d="${pathD(s)}" stroke-width="${GREY}" stroke-linecap="round" stroke-linejoin="round"/>`,
		)
		.join("");
	const rainbows = glyph.strokes
		.map((s, i) => {
			const bands = RAINBOW.map(
				(colour, b) =>
					`<path d="${pathD(s)}" stroke="${colour}" stroke-width="${(RIBBON * (RAINBOW.length - b)) / RAINBOW.length}"/>`,
			).join("");
			return `<g class="trail-rainbow" data-stroke="${i}" fill="none" stroke-linecap="round" stroke-linejoin="round">${bands}</g>`;
		})
		.join("");
	return `
		<svg class="trail-board" role="img" aria-label="Trace the letter" focusable="false">
			<g class="trail-guides">
				<line class="trail-xline" y1="${BASELINE - X_HEIGHT}" y2="${BASELINE - X_HEIGHT}"/>
				<line class="trail-baseline" y1="${BASELINE}" y2="${BASELINE}"/>
			</g>
			<g class="trail-letter" fill="none">${grey}</g>
			<g class="trail-arrows">${arrowsMarkup(glyph)}</g>
			<path class="trail-demo" fill="none" stroke-width="${GREY * 0.45}" stroke-linecap="round" stroke-linejoin="round"/>
			${rainbows}
			<g class="trail-dot">
				<circle class="trail-dot-halo" r="0.2"/>
				<circle class="trail-dot-core" r="0.1"/>
			</g>
			<circle class="trail-spark" r="0.09"/>
			<g class="trail-unicorn"><g class="trail-unicorn-body">${unicornArt}</g></g>
		</svg>`;
}

let cleanup: (() => void) | undefined;
let root: HTMLElement | undefined;

export const letterTrail: Game = {
	id: "letter-trail",
	title: "Unicorn letter trail",
	tile: tileSvg,
	mount(el: HTMLElement) {
		root = el;
		const glyph = letters[LETTER];
		if (!glyph) throw new Error(`letter-trail: no glyph ${LETTER}`);
		const lengths = glyph.strokes.map((s) => pathLength(s));

		const screen = document.createElement("div");
		screen.className = "trail";
		screen.innerHTML = boardMarkup(glyph);
		el.append(screen);

		const q = <T extends Element>(sel: string) => {
			const found = screen.querySelector<T>(sel);
			if (!found) throw new Error(`letter-trail: ${sel} missing`);
			return found;
		};
		const svg = q<SVGSVGElement>(".trail-board");
		const dot = q<SVGGElement>(".trail-dot");
		const spark = q<SVGCircleElement>(".trail-spark");
		const demoPath = q<SVGPathElement>(".trail-demo");
		const unicorn = q<SVGGElement>(".trail-unicorn");
		const rainbows = [
			...screen.querySelectorAll<SVGGElement>(".trail-rainbow"),
		];
		const lines = [
			...screen.querySelectorAll<SVGLineElement>(".trail-guides line"),
		];

		const reducedMotion = window.matchMedia?.(
			"(prefers-reduced-motion: reduce)",
		).matches;
		screen.classList.toggle("reduced-motion", reducedMotion === true);

		let strokeIndex = 0;
		let done = false;
		let unlocked = false;
		let active: number | undefined;
		let trace: Point[] = [];
		let toGlyph: DOMMatrix | undefined;
		let frame: number | undefined;
		let demoFrame: number | undefined;
		let demoTimer: ReturnType<typeof setTimeout> | undefined;
		let facingLeft = false;
		let restX = glyph.width + 0.75;

		const setState = (state: "demo" | "ready" | "tracing" | "done") => {
			screen.dataset.state = state;
			screen.dataset.stroke = String(strokeIndex);
		};

		// Fit the board: the letter in the middle at an x-height of about
		// X_HEIGHT_PX, with room on the right for the unicorn to rest.
		const layout = () => {
			const box = svg.getBoundingClientRect();
			const w = box.width || 1;
			const h = box.height || 1;
			const unit = Math.min(
				X_HEIGHT_PX,
				(h * 0.92) / BOX_HEIGHT,
				w / (glyph.width + 2.9),
			);
			const vw = w / unit;
			const vh = h / unit;
			const left = (vw - glyph.width) / 2;
			const top = (vh - BOX_HEIGHT) / 2;
			svg.setAttribute("viewBox", `${-left} ${-top} ${vw} ${vh}`);
			for (const line of lines) {
				line.setAttribute("x1", String(-left));
				line.setAttribute("x2", String(vw - left));
			}
			restX = Math.min(glyph.width + 0.8, vw - left - 0.65);
			screen.style.setProperty("--unit", `${unit}px`);
			if (active === undefined && !done) placeUnicornAtRest();
			if (done) placeUnicornAtRest(1.15);
		};

		const placeUnicorn = (x: number, y: number, size: number) => {
			const s = size / 200;
			const sx = facingLeft ? -s : s;
			unicorn.style.transform = `translate(${x}px, ${y}px) scale(${sx}, ${s}) translate(-100px, -180px)`;
		};

		const placeUnicornAtRest = (grow = 1) => {
			facingLeft = false;
			placeUnicorn(restX, BASELINE, UNICORN_REST * grow);
		};

		const setRainbow = (i: number, fraction: number) => {
			const g = rainbows[i];
			const length = lengths[i] ?? 0;
			if (!g) return;
			g.style.visibility = fraction > 0 ? "visible" : "hidden";
			g.style.strokeDasharray = `${fraction * length} ${length + 1}`;
		};

		const showDot = () => {
			const start = glyph.strokes[strokeIndex]?.[0];
			if (!start) return;
			dot.setAttribute("transform", `translate(${start.x} ${start.y})`);
			// Restart the pulse so it catches the eye again.
			dot.classList.remove("pulse");
			void dot.getBoundingClientRect();
			dot.classList.add("pulse");
		};

		// ------------------------------------------------------------- demo

		const stopDemo = () => {
			if (demoTimer !== undefined) clearTimeout(demoTimer);
			if (demoFrame !== undefined) cancelAnimationFrame(demoFrame);
			demoTimer = undefined;
			demoFrame = undefined;
			spark.style.visibility = "hidden";
			demoPath.style.visibility = "hidden";
		};

		const runDemo = () => {
			setState("demo");
			const durations = lengths.map((l) => Math.max(500, l * DEMO_MS_PER_UNIT));
			let begin: number | undefined;
			const step = (now: number) => {
				begin ??= now;
				let t = now - begin;
				let i = 0;
				while (i < durations.length && t > (durations[i] ?? 0)) {
					t -= durations[i] ?? 0;
					i++;
				}
				const stroke = glyph.strokes[i];
				if (!stroke) {
					stopDemo();
					setState("ready");
					return;
				}
				const f = t / (durations[i] ?? 1);
				const { point } = pointAt(stroke, f);
				spark.setAttribute("cx", String(point.x));
				spark.setAttribute("cy", String(point.y));
				spark.style.visibility = "visible";
				demoPath.setAttribute("d", pathD(stroke));
				demoPath.style.strokeDasharray = `${f * (lengths[i] ?? 0)} 99`;
				demoPath.style.visibility = "visible";
				demoFrame = requestAnimationFrame(step);
			};
			demoFrame = requestAnimationFrame(step);
		};

		// ---------------------------------------------------------- tracing

		const pointFrom = (e: PointerEvent): Point | undefined => {
			if (!toGlyph) return undefined;
			const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(toGlyph);
			return { x: p.x, y: p.y };
		};

		const update = () => {
			frame = undefined;
			const stroke = glyph.strokes[strokeIndex];
			if (!stroke || active === undefined) return;
			const progress = progressAlong(stroke, trace);
			setRainbow(strokeIndex, progress);
			const { point, angle } = pointAt(stroke, progress);
			const dx = Math.cos(angle);
			if (dx < -0.3) facingLeft = true;
			else if (dx > 0.3) facingLeft = false;
			placeUnicorn(point.x, point.y, UNICORN_TRACE);
		};

		const schedule = () => {
			frame ??= requestAnimationFrame(update);
		};

		const endTrace = () => {
			active = undefined;
			if (frame !== undefined) cancelAnimationFrame(frame);
			frame = undefined;
			screen.classList.remove("tracing");
		};

		const success = () => {
			done = true;
			setState("done");
			screen.classList.add("happy");
			placeUnicornAtRest(1.15);
			void playTone({ freq: 523, slideTo: 784, duration: 260, volume: 0.4 });
			void say(PRAISE, "en");
		};

		const finish = () => {
			const index = strokeIndex;
			const result = checkStroke(glyph, index, trace);
			endTrace();
			trace = [];
			if (!result.ok) {
				// No penalty and no sound: the rainbow fades, the unicorn goes
				// back to wait, and the start dot pulses again.
				setRainbow(index, 0);
				placeUnicornAtRest();
				showDot();
				setState("ready");
				return;
			}
			setRainbow(index, 1);
			strokeIndex++;
			if (strokeIndex >= glyph.strokes.length) {
				success();
				return;
			}
			void playTone({ freq: 660, slideTo: 880, duration: 160, volume: 0.3 });
			placeUnicornAtRest();
			showDot();
			setState("ready");
		};

		const onDown = (e: PointerEvent) => {
			if (!e.isPrimary || done || active !== undefined) return;
			e.preventDefault();
			if (!unlocked) {
				// iPad keeps sound and speech locked until a touch starts them.
				unlockAudio();
				unlocked = true;
			}
			stopDemo();
			if (screen.dataset.state === "demo") setState("ready");
			toGlyph = svg.getScreenCTM()?.inverse();
			const p = pointFrom(e);
			if (!p) return;
			try {
				svg.setPointerCapture(e.pointerId);
			} catch {
				// Not all browsers capture every pointer type; moves still arrive.
			}
			active = e.pointerId;
			trace = [p];
			screen.classList.add("tracing");
			setState("tracing");
			schedule();
		};

		const onMove = (e: PointerEvent) => {
			if (e.pointerId !== active) return;
			e.preventDefault();
			const events = e.getCoalescedEvents?.() ?? [];
			for (const ev of events.length > 0 ? events : [e]) {
				const p = pointFrom(ev);
				if (p) trace.push(p);
			}
			schedule();
		};

		const onUp = (e: PointerEvent) => {
			if (e.pointerId !== active) return;
			const p = pointFrom(e);
			if (p) trace.push(p);
			finish();
		};

		const onCancel = (e: PointerEvent) => {
			if (e.pointerId !== active) return;
			// The system took the touch (e.g. a gesture): forget this trace.
			endTrace();
			trace = [];
			setRainbow(strokeIndex, 0);
			placeUnicornAtRest();
			setState("ready");
		};

		const noMenu = (e: Event) => e.preventDefault();

		svg.addEventListener("pointerdown", onDown);
		svg.addEventListener("pointermove", onMove);
		svg.addEventListener("pointerup", onUp);
		svg.addEventListener("pointercancel", onCancel);
		svg.addEventListener("contextmenu", noMenu);
		// Lay out again whenever the board changes size (rotation, first
		// paint, Safari bars).
		const resizer =
			typeof ResizeObserver === "undefined"
				? undefined
				: new ResizeObserver(() => layout());
		resizer?.observe(svg);
		window.addEventListener("resize", layout);

		for (let i = 0; i < rainbows.length; i++) setRainbow(i, 0);
		stopDemo();
		layout();
		showDot();
		if (reducedMotion) {
			// No moving demo: the arrows show the way instead.
			setState("ready");
		} else {
			setState("demo");
			demoTimer = setTimeout(() => {
				demoTimer = undefined;
				runDemo();
			}, DEMO_DELAY_MS);
		}

		cleanup = () => {
			stopDemo();
			endTrace();
			svg.removeEventListener("pointerdown", onDown);
			svg.removeEventListener("pointermove", onMove);
			svg.removeEventListener("pointerup", onUp);
			svg.removeEventListener("pointercancel", onCancel);
			svg.removeEventListener("contextmenu", noMenu);
			resizer?.disconnect();
			window.removeEventListener("resize", layout);
		};
	},
	unmount() {
		cancelSpeech();
		cleanup?.();
		cleanup = undefined;
		root?.replaceChildren();
		root = undefined;
	},
};
