// Tracing checker: did the child's finger trace a stroke the right way?
//
// Pure functions, no DOM. Every point is in glyph units (x-height units,
// origin top-left of the glyph box, y down), the same as letters.ts. The
// letter screen converts screen pixels to glyph units before calling in.
//
// How it works: each trace point is projected onto the stroke polyline to
// get its arc-length position along the stroke. Projection follows the
// finger (it looks near the previous position first), so closed loops (o,
// the bowl of a) and self-crossings (the bar of e) stay unambiguous. From
// the positions we read the direction of travel and which parts of the
// stroke were covered.

import { type Point, pathLength } from "./geometry";
import type { Glyph } from "./letters";

/**
 * What to tell the child, from the first thing that went wrong:
 * - `start-here`: the trace did not start near the start dot.
 * - `this-way`: the trace runs along the stroke backwards.
 * - `keep-going`: right start, right way, on the path, but stopped early.
 * - `stay-on-path`: too much of the trace is far from the stroke (scribble).
 * - `this-one-first`: the trace is a good trace of a later stroke of the
 *   letter (e.g. the stick of "a" or the accent of "é" first).
 */
export type TraceHint =
	| "start-here"
	| "this-way"
	| "keep-going"
	| "stay-on-path"
	| "this-one-first";

export interface StrokeResult {
	ok: boolean;
	/** Fraction (0–1) of the stroke the trace went over. */
	coverage: number;
	/** Fraction (0–1) traced without a gap from the start dot: where the
	 * unicorn can be. */
	progress: number;
	/** Set when `ok` is false. */
	hint?: TraceHint;
}

export interface LetterResult {
	ok: boolean;
	/** One result per stroke of the glyph (missing traces give keep-going). */
	strokes: StrokeResult[];
	/** The first stroke that needs another go, and its hint. */
	stroke?: number;
	hint?: TraceHint;
}

/**
 * All tolerances, in x-height units unless noted. Tuned for a pre-schooler's
 * finger on an iPad: at the planned letter size (x-height about 250 CSS px)
 * 0.35 units is about one 88 px touch target.
 */
export interface TraceTolerance {
	/** The first touch must land within this distance of the start dot. */
	startRadius: number;
	/** A point within this distance of the stroke is "on the path". */
	pathDistance: number;
	/** Up to this fraction of points may be off the path (wobbles, a stray
	 * touch) before the trace counts as a scribble. */
	maxOffPath: number;
	/** Fraction of the stroke that must be covered to pass. */
	requiredCoverage: number;
	/** Net backward travel along the stroke that makes a trace reversed
	 * (capped at 30% of the stroke length for short strokes such as the
	 * accent). */
	reverseDistance: number;
	/** A trace whose on-path points move the finger more than this many
	 * times the length of stroke covered (at least 1 x-height) is a
	 * scribble, even if it stays near the stroke. Allows going round an
	 * "o" one and a half times. */
	maxWander: number;
	/** Finger movement is measured in steps this long, so jitter does not
	 * add length. */
	wanderStep: number;
	/** Points closer than this to the previous kept point are dropped. */
	jitter: number;
	/** How far along the stroke the finger may move between two points
	 * and still count as continuous movement. */
	trackWindow: number;
	/** Size of the stroke pieces used to measure coverage. */
	coverageBin: number;
	/** Largest uncovered gap `progress` steps over. */
	progressGap: number;
}

export const TRACE_TOLERANCE: Readonly<TraceTolerance> = Object.freeze({
	startRadius: 0.35,
	pathDistance: 0.3,
	maxOffPath: 0.2,
	requiredCoverage: 0.8,
	reverseDistance: 0.2,
	maxWander: 1.6,
	wanderStep: 0.15,
	jitter: 0.02,
	trackWindow: 0.3,
	coverageBin: 0.05,
	progressGap: 0.15,
});

interface Segment {
	a: Point;
	b: Point;
	/** Arc-length position of `a`. */
	s0: number;
	length: number;
}

interface Path {
	segments: Segment[];
	length: number;
	closed: boolean;
	start: Point;
}

interface Projection {
	s: number;
	d: number;
}

function makePath(stroke: Point[]): Path {
	const start = stroke[0];
	if (!start) throw new Error("tracer: empty stroke");
	const segments: Segment[] = [];
	let s0 = 0;
	for (let i = 1; i < stroke.length; i++) {
		const a = stroke[i - 1] as Point;
		const b = stroke[i] as Point;
		const length = Math.hypot(b.x - a.x, b.y - a.y);
		if (length === 0) continue;
		segments.push({ a, b, s0, length });
		s0 += length;
	}
	const end = stroke[stroke.length - 1] as Point;
	const closed =
		segments.length > 1 && Math.hypot(end.x - start.x, end.y - start.y) < 0.01;
	return { segments, length: pathLength(stroke), closed, start };
}

function projectAll(path: Path, p: Point): Projection[] {
	if (path.segments.length === 0) {
		return [{ s: 0, d: Math.hypot(p.x - path.start.x, p.y - path.start.y) }];
	}
	return path.segments.map(({ a, b, s0, length }) => {
		const t = Math.min(
			1,
			Math.max(
				0,
				((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) /
					(length * length),
			),
		);
		const x = a.x + t * (b.x - a.x);
		const y = a.y + t * (b.y - a.y);
		return { s: s0 + t * length, d: Math.hypot(p.x - x, p.y - y) };
	});
}

function nearest(projections: Projection[]): Projection {
	let best = projections[0] as Projection;
	for (const p of projections) if (p.d < best.d) best = p;
	return best;
}

const mod = (x: number, m: number) => ((x % m) + m) % m;

/** Signed arc distance from `from` to `to`, the short way round a loop. */
function arcDelta(path: Path, from: number, to: number): number {
	const delta = to - from;
	if (!path.closed || path.length === 0) return delta;
	return mod(delta + path.length / 2, path.length) - path.length / 2;
}

/** Drops points that barely moved (tiny jitter, repeated events). */
function thin(trace: Point[], jitter: number): Point[] {
	const kept: Point[] = [];
	for (const p of trace) {
		const last = kept[kept.length - 1];
		if (!last || Math.hypot(p.x - last.x, p.y - last.y) >= jitter) kept.push(p);
	}
	return kept;
}

/** Moving average over a few neighbours: takes out the fast jitter. */
function smooth(points: Point[], reach = 3): Point[] {
	return points.map((_, i) => {
		const near = points.slice(Math.max(0, i - reach), i + reach + 1);
		return {
			x: near.reduce((sum, p) => sum + p.x, 0) / near.length,
			y: near.reduce((sum, p) => sum + p.y, 0) / near.length,
		};
	});
}

interface Track {
	/** Unwrapped arc positions of the on-path points, in order. */
	positions: number[];
	/** jumps[i]: positions[i] was reached by a jump, not continuous movement. */
	jumps: boolean[];
	cost: number;
}

function follow(
	path: Path,
	projections: Projection[][],
	start: Projection,
	tol: TraceTolerance,
): Track {
	let s = start.s;
	const positions = [s];
	const jumps = [false];
	let cost = start.d;
	for (const projs of projections.slice(1)) {
		const here = path.closed ? mod(s, path.length) : s;
		let best: Projection | undefined;
		for (const p of projs) {
			if (Math.abs(arcDelta(path, here, p.s)) > tol.trackWindow) continue;
			if (!best || p.d < best.d) best = p;
		}
		const jump = !best || best.d > tol.pathDistance;
		const next = jump ? nearest(projs) : (best as Projection);
		s += arcDelta(path, here, next.s);
		positions.push(s);
		jumps.push(jump);
		cost += next.d + (jump ? tol.trackWindow : 0);
	}
	return { positions, jumps, cost };
}

/** Follows the on-path points from each plausible first position and keeps
 * the run that fits best (resolves loops and crossings). */
function bestTrack(
	path: Path,
	projections: Projection[][],
	tol: TraceTolerance,
): Track {
	const first = projections[0] as Projection[];
	const closest = nearest(first).d;
	const candidates = first
		.filter((p) => p.d <= closest + 0.05)
		.sort((a, b) => a.s - b.s)
		.reduce<Projection[]>((groups, p) => {
			const last = groups[groups.length - 1];
			if (last && p.s - last.s <= tol.trackWindow) {
				if (p.d < last.d) groups[groups.length - 1] = p;
			} else groups.push(p);
			return groups;
		}, []);
	let best: Track | undefined;
	for (const start of candidates) {
		const track = follow(path, projections, start, tol);
		if (!best || track.cost < best.cost) best = track;
	}
	return best as Track;
}

interface Measures {
	coverage: number;
	progress: number;
	net: number;
}

function measure(path: Path, track: Track, tol: TraceTolerance): Measures {
	const length = path.length;
	const bins = Math.max(1, Math.ceil(length / tol.coverageBin));
	const binLength = length / bins;
	const visited = new Array<boolean>(bins).fill(false);
	const mark = (s: number) => {
		const at = path.closed ? mod(s, length) : Math.min(length, Math.max(0, s));
		const i = binLength > 0 ? Math.floor(at / binLength) : 0;
		visited[Math.min(bins - 1, Math.max(0, i))] = true;
	};
	// Net travel along the stroke over continuous movement: jitter and
	// wobbles cancel out, only the overall direction stays.
	let net = 0;
	track.positions.forEach((s, i) => {
		const prev = track.positions[i - 1];
		if (prev === undefined || track.jumps[i]) {
			mark(s);
			return;
		}
		const delta = s - prev;
		net += delta;
		const steps = Math.max(1, Math.ceil(Math.abs(delta) / (binLength / 2)));
		for (let k = 0; k <= steps; k++) mark(prev + (delta * k) / steps);
	});
	const coverage = visited.filter(Boolean).length / bins;

	// Progress: walk from the start dot over covered pieces, stepping over
	// small gaps (a wider one at the very start: the first touch may land
	// anywhere within the start radius).
	let reached = 0;
	let gap = 0;
	for (let i = 0; i < bins; i++) {
		if (visited[i]) {
			reached = i + 1;
			gap = 0;
			continue;
		}
		gap += binLength;
		if (gap > (reached === 0 ? tol.startRadius : tol.progressGap)) break;
	}
	return { coverage, progress: reached / bins, net };
}

interface Assessment extends StrokeResult {
	reversed: boolean;
}

function assess(
	stroke: Point[],
	trace: Point[],
	tol: TraceTolerance,
): Assessment {
	const points = thin(trace, tol.jitter);
	const first = points[0];
	const none = { coverage: 0, progress: 0, reversed: false };
	if (!first) return { ok: false, hint: "start-here", ...none };
	const path = makePath(stroke);
	const startOk =
		Math.hypot(first.x - path.start.x, first.y - path.start.y) <=
		tol.startRadius;
	const onPath: Point[] = [];
	const projections: Projection[][] = [];
	for (const p of points) {
		const projs = projectAll(path, p);
		if (nearest(projs).d > tol.pathDistance) continue;
		onPath.push(p);
		projections.push(projs);
	}
	if (projections.length === 0) {
		return {
			ok: false,
			hint: points.length > 1 ? "stay-on-path" : "start-here",
			...none,
		};
	}
	const offPath = 1 - projections.length / points.length;
	const { coverage, progress, net } = measure(
		path,
		bestTrack(path, projections, tol),
		tol,
	);
	const reversed = -net >= Math.min(tol.reverseDistance, 0.3 * path.length);
	// A scribble that stays near the stroke still moves the finger much
	// further than the part of the stroke it covers.
	const wandered =
		pathLength(thin(smooth(onPath), tol.wanderStep)) >
		tol.maxWander * Math.max(coverage * path.length, 1);
	// A backwards trace never moves the unicorn forwards.
	const result = { coverage, progress: reversed ? 0 : progress, reversed };
	if (wandered || (points.length > 1 && offPath > tol.maxOffPath))
		return { ok: false, hint: "stay-on-path", ...result };
	if (!startOk)
		return { ok: false, hint: reversed ? "this-way" : "start-here", ...result };
	if (reversed) return { ok: false, hint: "this-way", ...result };
	if (coverage < tol.requiredCoverage)
		return { ok: false, hint: "keep-going", ...result };
	return { ok: true, ...result };
}

const strip = ({ reversed: _, ...result }: Assessment): StrokeResult => result;

/**
 * Checks one finger trace against stroke `index` of a glyph. If the trace
 * fails but is a good trace of a later stroke, the hint is `this-one-first`.
 */
export function checkStroke(
	glyph: Glyph,
	index: number,
	trace: Point[],
	tolerance: Partial<TraceTolerance> = {},
): StrokeResult {
	const stroke = glyph.strokes[index];
	if (!stroke) throw new Error(`tracer: ${glyph.char} has no stroke ${index}`);
	const tol = { ...TRACE_TOLERANCE, ...tolerance };
	const own = assess(stroke, trace, tol);
	if (!own.ok) {
		for (const later of glyph.strokes.slice(index + 1)) {
			if (assess(later, trace, tol).ok)
				return { ...strip(own), hint: "this-one-first" };
		}
	}
	return strip(own);
}

/** Checks a whole letter: one trace per stroke, in the order drawn. */
export function checkLetter(
	glyph: Glyph,
	traces: Point[][],
	tolerance: Partial<TraceTolerance> = {},
): LetterResult {
	const strokes = glyph.strokes.map((_, i) => {
		const trace = traces[i];
		return trace
			? checkStroke(glyph, i, trace, tolerance)
			: { ok: false, coverage: 0, progress: 0, hint: "keep-going" as const };
	});
	const stroke = strokes.findIndex((r) => !r.ok);
	if (stroke === -1) return { ok: true, strokes };
	return { ok: false, strokes, stroke, hint: strokes[stroke]?.hint };
}

/**
 * How far (0–1) a trace in progress has followed a stroke from its start
 * dot, without gaps: for moving the unicorn along with the finger.
 */
export function progressAlong(
	stroke: Point[],
	trace: Point[],
	tolerance: Partial<TraceTolerance> = {},
): number {
	return assess(stroke, trace, { ...TRACE_TOLERANCE, ...tolerance }).progress;
}
