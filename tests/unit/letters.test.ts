import { describe, expect, it } from "vitest";
import { pointAt } from "../../src/games/letter-trail/geometry";
import {
	BASELINE,
	BOX_HEIGHT,
	CAP_HEIGHT,
	letters,
	X_HEIGHT,
} from "../../src/games/letter-trail/letters";

const EPS = 1e-9;
const chars = ["L", "c", "o", "a", "e", "é"];

describe("letters", () => {
	it("has the six first glyphs", () => {
		expect(Object.keys(letters).sort()).toEqual([...chars].sort());
	});

	it("puts the baseline below the cap line inside the box", () => {
		expect(BASELINE - CAP_HEIGHT).toBe(0);
		expect(BASELINE - X_HEIGHT).toBeCloseTo(0.9);
		expect(BOX_HEIGHT).toBeGreaterThan(BASELINE);
	});

	for (const char of chars) {
		describe(char, () => {
			const glyph = letters[char];
			if (!glyph) throw new Error(`missing ${char}`);

			it("has its own char, at least one stroke and arrows for each", () => {
				expect(glyph.char).toBe(char);
				expect(glyph.strokes.length).toBeGreaterThanOrEqual(1);
				expect(glyph.arrows).toHaveLength(glyph.strokes.length);
				for (const stroke of glyph.strokes) {
					expect(stroke.length).toBeGreaterThanOrEqual(2);
				}
				for (const fractions of glyph.arrows) {
					for (const f of fractions) {
						expect(f).toBeGreaterThan(0);
						expect(f).toBeLessThan(1);
					}
				}
				if (glyph.labels) {
					expect(glyph.labels).toHaveLength(glyph.strokes.length);
				}
			});

			it("stays inside its box", () => {
				for (const stroke of glyph.strokes) {
					for (const p of stroke) {
						expect(p.x).toBeGreaterThanOrEqual(-EPS);
						expect(p.x).toBeLessThanOrEqual(glyph.width + EPS);
						expect(p.y).toBeGreaterThanOrEqual(-EPS);
						expect(p.y).toBeLessThanOrEqual(BOX_HEIGHT + EPS);
					}
				}
			});

			it("sits on the baseline", () => {
				const lowest = Math.max(...glyph.strokes.flat().map((p) => p.y));
				expect(lowest).toBeCloseTo(BASELINE, 2);
			});
		});
	}

	// Start dots (the first point of each stroke), in box coordinates.
	const starts: Record<string, [number, number][]> = {
		L: [[0.05, 0]],
		c: [[0.726, 1.017]],
		o: [[0.536, 0.908]],
		a: [
			[0.665, 0.967],
			[0.88, 0.9],
		],
		e: [[0.03, 1.4]],
		é: [
			[0.03, 1.4],
			[0.64, 0.28],
		],
	};

	for (const [char, dots] of Object.entries(starts)) {
		it(`${char} starts each stroke at its start dot`, () => {
			const strokes = letters[char]?.strokes ?? [];
			expect(strokes).toHaveLength(dots.length);
			strokes.forEach((stroke, i) => {
				const [x, y] = dots[i] as [number, number];
				expect(stroke[0]?.x).toBeCloseTo(x, 3);
				expect(stroke[0]?.y).toBeCloseTo(y, 3);
			});
		});
	}

	it("writes L down the leg first, then along the foot", () => {
		const [leg] = letters.L?.strokes ?? [];
		if (!leg) throw new Error("no L stroke");
		expect(pointAt(leg, 0.2).angle).toBeCloseTo(Math.PI / 2);
		expect(pointAt(leg, 0.9).angle).toBeCloseTo(0);
	});

	it("goes anticlockwise round c, o, a and e (leftwards over the top)", () => {
		for (const char of ["c", "o", "a"]) {
			const stroke = letters[char]?.strokes[0];
			if (!stroke) throw new Error(`no ${char} stroke`);
			// Just after the start, near the top, the pen moves left.
			expect(Math.cos(pointAt(stroke, 0.02).angle)).toBeLessThan(0);
		}
		const e = letters.e?.strokes[0];
		if (!e) throw new Error("no e stroke");
		// e goes right across the middle, then up and over to the left.
		expect(pointAt(e, 0.05).angle).toBeCloseTo(0);
		expect(Math.sin(pointAt(e, 0.3).angle)).toBeLessThan(0);
	});

	it("draws the acute accent down to the left after the e", () => {
		const accent = letters.é?.strokes[1];
		if (!accent) throw new Error("no accent");
		const { angle } = pointAt(accent, 0.5);
		expect(Math.cos(angle)).toBeLessThan(0);
		expect(Math.sin(angle)).toBeGreaterThan(0);
	});
});
