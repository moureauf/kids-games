import { describe, expect, it } from "vitest";
import { creatureArt } from "../../src/games/sound-safari/art";
import { creatures } from "../../src/games/sound-safari/creatures";
import { ROUND_TAPS, roundTaps } from "../../src/games/sound-safari/round";

describe("Sound safari creatures", () => {
	it("has six creatures with unique ids", () => {
		expect(creatures).toHaveLength(6);
		expect(new Set(creatures.map((c) => c.id)).size).toBe(6);
	});

	it("mixes animals, one vehicle and one dinosaur", () => {
		const kinds = creatures.map((c) => c.kind);
		expect(kinds.filter((k) => k === "vehicle")).toHaveLength(1);
		expect(kinds.filter((k) => k === "dinosaur")).toHaveLength(1);
		expect(kinds.filter((k) => k === "animal")).toHaveLength(4);
	});

	for (const c of creatures) {
		describe(c.id, () => {
			it("has non-empty English and French names", () => {
				expect(c.en.trim()).not.toBe("");
				expect(c.fr.trim()).not.toBe("");
			});

			it("has its French article", () => {
				expect(c.fr).toMatch(/^(le |la |l'|les )\S/);
			});

			it("has art", () => {
				expect(creatureArt[c.id]?.length ?? 0).toBeGreaterThan(100);
			});

			it("stands inside the screen", () => {
				expect(c.x).toBeGreaterThan(10);
				expect(c.x).toBeLessThan(90);
				expect(c.y).toBeGreaterThan(40);
				expect(c.y).toBeLessThanOrEqual(95);
			});
		});
	}
});

describe("Sound safari round", () => {
	it("lasts about 20 taps, more than one tap on each creature", () => {
		expect(ROUND_TAPS).toBe(20);
		expect(ROUND_TAPS).toBeGreaterThan(creatures.length);
	});

	it("uses the real count without ?e2e", () => {
		expect(roundTaps("")).toBe(ROUND_TAPS);
		expect(roundTaps("?safariTaps=2")).toBe(ROUND_TAPS);
	});

	it("lets e2e tests shorten the round", () => {
		expect(roundTaps("?e2e&safariTaps=3")).toBe(3);
	});

	it("ignores a bad override", () => {
		for (const bad of ["0", "-2", "1.5", "abc", ""]) {
			expect(roundTaps(`?e2e&safariTaps=${bad}`)).toBe(ROUND_TAPS);
		}
		expect(roundTaps("?e2e")).toBe(ROUND_TAPS);
	});
});
