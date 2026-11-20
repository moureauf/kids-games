import { describe, expect, it } from "vitest";
import { countLines, parseNumstat } from "../../scripts/pr-size";

const numstat = [
	"10\t2\tsrc/games/letter-trail/trail.ts",
	"40\t0\ttests/unit/trail.test.ts",
	"120\t80\tpackage-lock.json",
	"-\t-\tdocs/images/letter-trail.png",
	"3\t1\tCLAUDE.md",
	"",
].join("\n");

describe("PR size check", () => {
	it("reads added and deleted lines, and marks binary files", () => {
		expect(parseNumstat(numstat)).toEqual([
			{ file: "src/games/letter-trail/trail.ts", lines: 12 },
			{ file: "tests/unit/trail.test.ts", lines: 40 },
			{ file: "package-lock.json", lines: 200 },
			{ file: "docs/images/letter-trail.png", lines: null },
			{ file: "CLAUDE.md", lines: 4 },
		]);
	});

	it("does not count tests, lockfiles and binary files", () => {
		expect(countLines(parseNumstat(numstat))).toEqual({
			counted: 16,
			skipped: [
				"tests/unit/trail.test.ts",
				"package-lock.json",
				"docs/images/letter-trail.png",
			],
		});
	});

	it("counts a test-like name outside tests/", () => {
		const { counted } = countLines([
			{ file: "src/core/tests-helper.ts", lines: 5 },
		]);
		expect(counted).toBe(5);
	});
});
