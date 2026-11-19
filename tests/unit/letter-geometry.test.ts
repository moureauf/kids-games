import { describe, expect, it } from "vitest";
import {
	arc,
	type Point,
	pathLength,
	pointAt,
} from "../../src/games/letter-trail/geometry";

const square: Point[] = [
	{ x: 0, y: 0 },
	{ x: 1, y: 0 },
	{ x: 1, y: 1 },
	{ x: 0, y: 1 },
	{ x: 0, y: 0 },
];

describe("pathLength", () => {
	it("is 0 for a single point", () => {
		expect(pathLength([{ x: 2, y: 3 }])).toBe(0);
	});

	it("measures a straight line", () => {
		expect(
			pathLength([
				{ x: 0, y: 0 },
				{ x: 3, y: 4 },
			]),
		).toBe(5);
	});

	it("adds up the sides of a square", () => {
		expect(pathLength(square)).toBe(4);
	});

	it("is close to the circumference of a full circle arc", () => {
		expect(pathLength(arc(0, 0, 1, 1, 0, 360, 360))).toBeCloseTo(
			2 * Math.PI,
			3,
		);
	});
});

describe("pointAt", () => {
	const line: Point[] = [
		{ x: 0, y: 0 },
		{ x: 4, y: 0 },
	];

	it("finds the start, middle and end of a line", () => {
		expect(pointAt(line, 0).point).toEqual({ x: 0, y: 0 });
		expect(pointAt(line, 0.5).point).toEqual({ x: 2, y: 0 });
		expect(pointAt(line, 1).point).toEqual({ x: 4, y: 0 });
	});

	it("clamps fractions outside 0..1", () => {
		expect(pointAt(line, -1).point).toEqual({ x: 0, y: 0 });
		expect(pointAt(line, 2).point).toEqual({ x: 4, y: 0 });
	});

	it("walks round a square with the right direction on each side", () => {
		// y goes down, so "down the screen" is +pi/2.
		const right = pointAt(square, 0.125);
		expect(right.point).toEqual({ x: 0.5, y: 0 });
		expect(right.angle).toBeCloseTo(0);

		const down = pointAt(square, 0.375);
		expect(down.point).toEqual({ x: 1, y: 0.5 });
		expect(down.angle).toBeCloseTo(Math.PI / 2);

		const left = pointAt(square, 0.625);
		expect(left.point).toEqual({ x: 0.5, y: 1 });
		expect(Math.abs(left.angle)).toBeCloseTo(Math.PI);

		const upward = pointAt(square, 0.875);
		expect(upward.point).toEqual({ x: 0, y: 0.5 });
		expect(upward.angle).toBeCloseTo(-Math.PI / 2);
	});

	it("gives the direction of the stroke at its start and end", () => {
		expect(pointAt(square, 0).angle).toBeCloseTo(0);
		expect(pointAt(square, 1).angle).toBeCloseTo(-Math.PI / 2);
	});

	it("skips repeated points", () => {
		const stroke: Point[] = [
			{ x: 0, y: 0 },
			{ x: 0, y: 0 },
			{ x: 0, y: 2 },
		];
		const { point, angle } = pointAt(stroke, 0);
		expect(point).toEqual({ x: 0, y: 0 });
		expect(angle).toBeCloseTo(Math.PI / 2);
	});

	it("handles a single point and rejects an empty stroke", () => {
		expect(pointAt([{ x: 1, y: 1 }], 0.5).point).toEqual({ x: 1, y: 1 });
		expect(() => pointAt([], 0.5)).toThrow();
	});
});

describe("arc", () => {
	it("makes n + 1 points from a0 to a1", () => {
		const points = arc(1, 2, 3, 4, 0, 90, 10);
		expect(points).toHaveLength(11);
		expect(points[0]?.x).toBeCloseTo(4);
		expect(points[0]?.y).toBeCloseTo(2);
		expect(points[10]?.x).toBeCloseTo(1);
		expect(points[10]?.y).toBeCloseTo(6);
	});
});
