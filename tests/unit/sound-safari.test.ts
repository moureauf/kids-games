import { describe, expect, it } from "vitest";
import { creatureArt } from "../../src/games/sound-safari/art";
import { creatures } from "../../src/games/sound-safari/creatures";

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
