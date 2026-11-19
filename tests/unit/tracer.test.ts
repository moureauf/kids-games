import { describe, expect, it } from "vitest";
import {
	type Point,
	pathLength,
	pointAt,
} from "../../src/games/letter-trail/geometry";
import { BOX_HEIGHT, letters } from "../../src/games/letter-trail/letters";
import {
	checkLetter,
	checkStroke,
	progressAlong,
	TRACE_TOLERANCE,
} from "../../src/games/letter-trail/tracer";

// Synthetic finger traces built from the real stroke data, with a seeded
// RNG so every run is the same.

const SEEDS = Array.from({ length: 12 }, (_, i) => i + 1);

function rng(seed: number): () => number {
	let a = seed >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = a;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

interface Shake {
	/** Slow side-to-side wobble, x-height units. */
	wobble?: number;
	/** Fast per-point noise, x-height units. */
	noise?: number;
	/** Stray points far off the path. */
	outliers?: number;
}

/** A slightly shaky finger along a stroke, from one fraction to another. */
function shakyTrace(
	stroke: Point[],
	from: number,
	to: number,
	random: () => number,
	{ wobble = 0.12, noise = 0.04, outliers = 0 }: Shake = {},
): Point[] {
	const span = Math.abs(to - from) * pathLength(stroke);
	const n = Math.max(12, Math.round(span / 0.03));
	const phase = random() * Math.PI * 2;
	const waves = 1 + random() * 2;
	const points: Point[] = [];
	for (let i = 0; i <= n; i++) {
		const { point, angle } = pointAt(stroke, from + ((to - from) * i) / n);
		const side =
			(i === 0 ? 0 : wobble * Math.sin(phase + (waves * Math.PI * 2 * i) / n)) +
			noise * (random() * 2 - 1);
		points.push({
			x: point.x - Math.sin(angle) * side + noise * (random() - 0.5),
			y: point.y + Math.cos(angle) * side + noise * (random() - 0.5),
		});
	}
	for (let k = 0; k < outliers; k++) {
		const i = 2 + Math.floor(random() * (points.length - 4));
		const p = points[i] as Point;
		const a = random() * Math.PI * 2;
		points[i] = { x: p.x + 0.6 * Math.cos(a), y: p.y + 0.6 * Math.sin(a) };
	}
	return points;
}

/** Random lines all over the glyph box. */
function scribble(width: number, random: () => number): Point[] {
	const points: Point[] = [];
	let from = { x: random() * width, y: random() * BOX_HEIGHT };
	for (let w = 0; w < 8; w++) {
		const to = { x: random() * width, y: random() * BOX_HEIGHT };
		for (let i = 0; i < 20; i++) {
			points.push({
				x: from.x + ((to.x - from.x) * i) / 20,
				y: from.y + ((to.y - from.y) * i) / 20,
			});
		}
		from = to;
	}
	return points;
}

const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

describe("TRACE_TOLERANCE", () => {
	it("is forgiving but still asks for most of the stroke", () => {
		expect(TRACE_TOLERANCE.startRadius).toBeGreaterThan(
			TRACE_TOLERANCE.pathDistance,
		);
		expect(TRACE_TOLERANCE.requiredCoverage).toBeGreaterThan(0.5);
		expect(TRACE_TOLERANCE.requiredCoverage).toBeLessThan(1);
		expect(Object.isFrozen(TRACE_TOLERANCE)).toBe(true);
	});
});

for (const glyph of Object.values(letters)) {
	describe(`tracing "${glyph.char}"`, () => {
		glyph.strokes.forEach((stroke, index) => {
			describe(`stroke ${index + 1}`, () => {
				it("passes good, shaky traces", () => {
					for (const seed of SEEDS) {
						const r = checkStroke(
							glyph,
							index,
							shakyTrace(stroke, 0, 1, rng(seed)),
						);
						expect(r, `seed ${seed}`).toMatchObject({ ok: true });
						expect(r.hint).toBeUndefined();
						expect(r.coverage).toBeGreaterThan(0.9);
						expect(r.progress).toBeGreaterThan(0.9);
					}
				});

				it("ignores a few stray points and tiny jitter", () => {
					for (const seed of SEEDS) {
						const trace = shakyTrace(stroke, 0, 1, rng(seed), {
							noise: 0.08,
							outliers: 2,
						});
						expect(checkStroke(glyph, index, trace).ok, `seed ${seed}`).toBe(
							true,
						);
					}
				});

				it("says start-here when the finger lands away from the start dot", () => {
					for (const seed of SEEDS) {
						const random = rng(seed);
						const trace = shakyTrace(stroke, 0, 1, random);
						const start = trace[0] as Point;
						const a = random() * Math.PI * 2;
						trace.unshift({
							x: start.x + 0.7 * Math.cos(a),
							y: start.y + 0.7 * Math.sin(a),
						});
						expect(checkStroke(glyph, index, trace).hint, `seed ${seed}`).toBe(
							"start-here",
						);
					}
				});

				// Starting halfway only counts as a wrong start if halfway is
				// outside the start radius (not so for the short accent).
				const middle = pointAt(stroke, 0.5).point;
				if (
					dist(middle, stroke[0] as Point) >
					TRACE_TOLERANCE.startRadius + 0.1
				) {
					it("says start-here when the trace starts in the middle", () => {
						for (const seed of SEEDS) {
							const trace = shakyTrace(stroke, 0.5, 1, rng(seed));
							expect(
								checkStroke(glyph, index, trace).hint,
								`seed ${seed}`,
							).toBe("start-here");
						}
					});
				}

				it("says this-way when the trace goes backwards", () => {
					for (const seed of SEEDS) {
						const trace = shakyTrace(stroke, 1, 0, rng(seed));
						expect(checkStroke(glyph, index, trace).hint, `seed ${seed}`).toBe(
							"this-way",
						);
					}
				});

				it("says keep-going when the trace stops halfway", () => {
					for (const seed of SEEDS) {
						const r = checkStroke(
							glyph,
							index,
							shakyTrace(stroke, 0, 0.5, rng(seed)),
						);
						expect(r.hint, `seed ${seed}`).toBe("keep-going");
						expect(r.coverage).toBeGreaterThan(0.35);
						expect(r.coverage).toBeLessThan(0.7);
					}
				});

				it("says stay-on-path for a scribble over the box", () => {
					for (const seed of SEEDS) {
						const r = checkStroke(
							glyph,
							index,
							scribble(glyph.width, rng(seed)),
						);
						expect(r.hint, `seed ${seed}`).toBe("stay-on-path");
					}
				});
			});
		});

		if (glyph.strokes.length > 1) {
			it("says this-one-first when a later stroke is traced first", () => {
				for (const seed of SEEDS) {
					const later = shakyTrace(
						glyph.strokes[1] as Point[],
						0,
						1,
						rng(seed),
					);
					expect(checkStroke(glyph, 0, later).hint, `seed ${seed}`).toBe(
						"this-one-first",
					);
				}
			});
		}

		it("checks the whole letter in stroke order", () => {
			const random = rng(42);
			const traces = glyph.strokes.map((s) => shakyTrace(s, 0, 1, random));
			expect(checkLetter(glyph, traces)).toMatchObject({ ok: true });
			expect(checkLetter(glyph, traces).hint).toBeUndefined();
			if (traces.length > 1) {
				expect(checkLetter(glyph, [...traces].reverse())).toMatchObject({
					ok: false,
					stroke: 0,
					hint: "this-one-first",
				});
				expect(checkLetter(glyph, traces.slice(0, 1))).toMatchObject({
					ok: false,
					stroke: 1,
					hint: "keep-going",
				});
			}
		});
	});
}

describe("checkStroke edge cases", () => {
	const o = letters.o;
	if (!o) throw new Error("missing o");
	const start = o.strokes[0]?.[0] as Point;

	it("asks to start at the dot for an empty trace", () => {
		expect(checkStroke(o, 0, []).hint).toBe("start-here");
	});

	it("asks to keep going after a tap on the start dot", () => {
		expect(checkStroke(o, 0, [start]).hint).toBe("keep-going");
	});

	it("says stay-on-path for rubbing back and forth over part of the stroke", () => {
		const stroke = o.strokes[0] as Point[];
		const random = rng(11);
		const rub = [0, 1, 2, 3].flatMap((k) =>
			k % 2 === 0
				? shakyTrace(stroke, 0, 0.4, random)
				: shakyTrace(stroke, 0.4, 0, random),
		);
		expect(checkStroke(o, 0, rub).hint).toBe("stay-on-path");
	});

	it("accepts going round the o a little too far", () => {
		const stroke = o.strokes[0] as Point[];
		const random = rng(12);
		const trace = [
			...shakyTrace(stroke, 0, 1, random),
			...shakyTrace(stroke, 0, 0.3, random),
		];
		expect(checkStroke(o, 0, trace).ok).toBe(true);
	});

	it("takes tolerance overrides", () => {
		const half = shakyTrace(o.strokes[0] as Point[], 0, 0.5, rng(7));
		expect(checkStroke(o, 0, half, { requiredCoverage: 0.4 }).ok).toBe(true);
	});

	it("throws for a stroke the glyph does not have", () => {
		expect(() => checkStroke(o, 3, [start])).toThrow();
	});
});

describe("progressAlong", () => {
	for (const glyph of Object.values(letters)) {
		glyph.strokes.forEach((stroke, index) => {
			it(`follows the finger along "${glyph.char}" stroke ${index + 1}`, () => {
				const trace = shakyTrace(stroke, 0, 1, rng(3));
				let previous = 0;
				for (const f of [0.25, 0.5, 0.75, 1]) {
					const part = trace.slice(0, Math.round(f * (trace.length - 1)) + 1);
					const progress = progressAlong(stroke, part);
					expect(progress).toBeGreaterThanOrEqual(previous);
					expect(progress).toBeGreaterThan(f - 0.2);
					expect(progress).toBeLessThanOrEqual(Math.min(1, f + 0.2));
					previous = progress;
				}
			});

			it(`does not jump ahead on a backwards "${glyph.char}" stroke ${index + 1}`, () => {
				const trace = shakyTrace(stroke, 1, 0.5, rng(5));
				expect(progressAlong(stroke, trace)).toBeLessThan(0.25);
			});
		});
	}
});
