// The creatures of the Sound safari meadow. Names only, no facts, so no
// sources are needed. The French name keeps its article ("la vache"): the
// French setting (issue #8) says it after the English one.

export type CreatureKind = "animal" | "vehicle" | "dinosaur";

/** How a creature moves when tapped. Each has a CSS class `anim-<kind>`. */
export type AnimationKind = "bounce" | "wiggle" | "drive" | "stomp";

export interface Creature {
	/** Stable id, used for the art, the e2e tests and `data-creature`. */
	id: string;
	/** English name, spoken on tap (en-GB voice). */
	en: string;
	/** French name with its article, e.g. "la vache". */
	fr: string;
	kind: CreatureKind;
	animation: AnimationKind;
	/** Where it stands in the scene: centre x and feet y, in % of the screen. */
	x: number;
	y: number;
	/** Draw the art mirrored, so not everyone faces the same way. */
	flip?: boolean;
}

// Back row stands on the far meadow, front row near the bottom edge.
// The rows and columns are far enough apart that a palm hits only one.
export const creatures: readonly Creature[] = [
	{
		id: "sheep",
		en: "sheep",
		fr: "le mouton",
		kind: "animal",
		animation: "bounce",
		x: 20,
		y: 56,
		flip: true,
	},
	{
		id: "dinosaur",
		en: "dinosaur",
		fr: "le dinosaure",
		kind: "dinosaur",
		animation: "stomp",
		x: 50,
		y: 56,
	},
	{
		id: "cow",
		en: "cow",
		fr: "la vache",
		kind: "animal",
		animation: "wiggle",
		x: 80,
		y: 56,
		flip: true,
	},
	{
		id: "duck",
		en: "duck",
		fr: "le canard",
		kind: "animal",
		animation: "wiggle",
		x: 19,
		y: 91,
	},
	{
		id: "pig",
		en: "pig",
		fr: "le cochon",
		kind: "animal",
		animation: "bounce",
		x: 47,
		y: 91,
	},
	{
		id: "tractor",
		en: "tractor",
		fr: "le tracteur",
		kind: "vehicle",
		animation: "drive",
		x: 79,
		y: 91,
	},
];
