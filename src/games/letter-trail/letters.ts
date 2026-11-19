// Print letter shapes for tracing: strokes in writing order, each starting
// at its start dot.
//
// Coordinates (SVG-style), in x-height units:
//   - origin at the top-left of the glyph box; x goes right, y goes DOWN;
//   - y = 0 is the cap line, y = BASELINE (1.9) is the baseline, the
//     x-height line is at BASELINE - X_HEIGHT (0.9);
//   - the box is `width` wide and BOX_HEIGHT tall, which leaves DESCENT
//     below the baseline for letters such as g, p and y;
//   - scale by the x-height in px and translate to place a glyph in an SVG.
//
// Glyphs are written in "y up from the baseline" units (the way a
// handwriting sheet is measured) with `arc`, then flipped by `glyph()`.
// Add a letter the same way: describe it y-up and let `glyph()` convert it.

import { arc, type Point } from "./geometry";

export type { Point } from "./geometry";

export const X_HEIGHT = 1;
export const CAP_HEIGHT = 1.9;
export const BASELINE = CAP_HEIGHT;
export const DESCENT = 0.9;
export const BOX_HEIGHT = BASELINE + DESCENT;
/** Space between letters in a word. */
export const LETTER_GAP = 0.38;

export interface Glyph {
	char: string;
	/** Box width in x-height units. */
	width: number;
	/** Polylines in writing order; each starts at its start dot. */
	strokes: Point[][];
	/** Per stroke: fractions along it where a direction arrow goes. */
	arrows: number[][];
	/** Per stroke, for letters with several strokes: where to put the stroke
	 * number, as an offset from that stroke's start dot. */
	labels?: Point[];
}

type UpPoint = [x: number, y: number];

const up = (points: UpPoint[]): Point[] => points.map(([x, y]) => ({ x, y }));

function glyph(
	char: string,
	width: number,
	strokesUp: Point[][],
	arrows: number[][],
	labelsUp?: UpPoint[],
): Glyph {
	const strokes = strokesUp.map((stroke) =>
		stroke.map((p) => ({ x: p.x, y: BASELINE - p.y })),
	);
	const labels = labelsUp?.map(([x, y]) => ({ x, y: -y }));
	return labels
		? { char, width, strokes, arrows, labels }
		: { char, width, strokes, arrows };
}

// The bowl of e: across the middle, then round and up into the scoop.
const eStroke = [...up([[0.03, 0.5]]), ...arc(0.46, 0.5, 0.43, 0.5, 0, 320)];

const all: Glyph[] = [
	glyph(
		"L",
		0.9,
		[
			up([
				[0.05, CAP_HEIGHT],
				[0.05, 0],
				[0.85, 0],
			]),
		],
		[[0.35, 0.85]],
	),
	glyph("c", 0.88, [arc(0.45, 0.5, 0.43, 0.5, 50, 310)], [[0.3, 0.75]]),
	glyph("o", 0.92, [arc(0.46, 0.5, 0.44, 0.5, 80, 440)], [[0.25, 0.6]]),
	glyph(
		"a",
		0.92,
		[
			arc(0.45, 0.5, 0.43, 0.5, 60, 420),
			up([
				[0.88, 1],
				[0.88, 0],
			]),
		],
		[[0.25, 0.6], [0.55]],
		[
			[-0.12, 0.2],
			[0.12, 0.08],
		],
	),
	glyph("e", 0.92, [eStroke], [[0.25, 0.7]]),
	glyph(
		"é",
		0.92,
		[
			eStroke,
			up([
				[0.64, 1.62],
				[0.4, 1.2],
			]),
		],
		[[0.25, 0.7], []],
		[
			[-0.25, -0.05],
			[0.12, 0],
		],
	),
];

export const letters: Record<string, Glyph> = Object.fromEntries(
	all.map((g) => [g.char, g]),
);
