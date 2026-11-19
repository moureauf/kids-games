// Polyline helpers for letter strokes. Coordinates follow letters.ts
// (SVG-style, y down), so angles are in radians measured clockwise on
// screen from the positive x axis: ready for an SVG `rotate()` once
// converted to degrees.

export interface Point {
	x: number;
	y: number;
}

/** Points along an ellipse arc, angles in degrees, n segments (n + 1 points). */
export function arc(
	cx: number,
	cy: number,
	rx: number,
	ry: number,
	a0: number,
	a1: number,
	n = 72,
): Point[] {
	const points: Point[] = [];
	for (let i = 0; i <= n; i++) {
		const a = ((a0 + ((a1 - a0) * i) / n) * Math.PI) / 180;
		points.push({ x: cx + rx * Math.cos(a), y: cy + ry * Math.sin(a) });
	}
	return points;
}

/** Total length of a polyline. */
export function pathLength(stroke: Point[]): number {
	let length = 0;
	for (let i = 1; i < stroke.length; i++) {
		const a = stroke[i - 1] as Point;
		const b = stroke[i] as Point;
		length += Math.hypot(b.x - a.x, b.y - a.y);
	}
	return length;
}

/**
 * The point at a fraction (0 = start, 1 = end, clamped) of the way along a
 * stroke, and the direction of travel there in radians.
 */
export function pointAt(
	stroke: Point[],
	fraction: number,
): { point: Point; angle: number } {
	const first = stroke[0];
	if (!first) throw new Error("pointAt: empty stroke");
	const target = Math.min(1, Math.max(0, fraction)) * pathLength(stroke);
	let walked = 0;
	let angle = 0;
	for (let i = 1; i < stroke.length; i++) {
		const a = stroke[i - 1] as Point;
		const b = stroke[i] as Point;
		const segment = Math.hypot(b.x - a.x, b.y - a.y);
		if (segment === 0) continue;
		angle = Math.atan2(b.y - a.y, b.x - a.x);
		if (walked + segment >= target) {
			const t = (target - walked) / segment;
			return {
				point: { x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) },
				angle,
			};
		}
		walked += segment;
	}
	// Zero-length stroke, or rounding past the end.
	const last = stroke[stroke.length - 1] as Point;
	return { point: { x: last.x, y: last.y }, angle };
}
