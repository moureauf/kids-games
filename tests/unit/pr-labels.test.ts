import { describe, expect, it } from "vitest";
import {
	countLines,
	type FileChange,
	issueFromBranch,
	labelPlan,
	sizeFromLabels,
	tierOf,
} from "../../scripts/pr-labels";

function f(filename: string, changes = 10, previous?: string): FileChange {
	return previous
		? { filename, changes, previous_filename: previous }
		: { filename, changes };
}

describe("tier", () => {
	it("is owner-only when one file is CLAUDE.md, .claude/ or .github/", () => {
		expect(tierOf([f("src/main.ts"), f("CLAUDE.md")])).toBe("tier:owner-only");
		expect(tierOf([f(".claude/skills/next-issue/SKILL.md")])).toBe(
			"tier:owner-only",
		);
		expect(tierOf([f(".github/workflows/ci.yml")])).toBe("tier:owner-only");
	});

	it("is owner-only when a file moves out of .github/", () => {
		expect(tierOf([f("docs/ci.yml", 0, ".github/workflows/ci.yml")])).toBe(
			"tier:owner-only",
		);
	});

	it("is docs when all files are docs or Markdown", () => {
		expect(
			tierOf([
				f("docs/GAMES.md"),
				f("docs/images/letter-trail.png", 0),
				f("README.md"),
				f("ideas/2026-11-25-bubbles.md"),
			]),
		).toBe("tier:docs");
	});

	it("is tests when all files are in tests/", () => {
		expect(tierOf([f("tests/unit/a.test.ts"), f("tests/e2e/b.spec.ts")])).toBe(
			"tier:tests",
		);
	});

	it("is game for anything else, and for docs mixed with tests", () => {
		expect(tierOf([f("src/main.ts"), f("tests/unit/a.test.ts")])).toBe(
			"tier:game",
		);
		expect(tierOf([f("docs/GAMES.md"), f("tests/unit/a.test.ts")])).toBe(
			"tier:game",
		);
		expect(tierOf([f("scripts/pr-size.ts")])).toBe("tier:game");
		expect(tierOf([])).toBe("tier:game");
	});
});

describe("size count (same rules as scripts/pr-size.ts)", () => {
	it("does not count tests, lockfiles and binary files", () => {
		expect(
			countLines([
				f("src/games/letter-trail/trail.ts", 12),
				f("tests/unit/trail.test.ts", 40),
				f("package-lock.json", 200),
				f("sub/yarn.lock", 30),
				f("Cargo.lock", 5),
				f("docs/images/letter-trail.png", 0),
				f("CLAUDE.md", 4),
			]),
		).toBe(16);
	});

	it("counts a test-like name outside tests/", () => {
		expect(countLines([f("src/core/tests-helper.ts", 5)])).toBe(5);
	});
});

describe("size limit", () => {
	it("reads the issue number from the branch name", () => {
		expect(issueFromBranch("issue-59-label-workflow")).toBe(59);
		expect(issueFromBranch("dependabot/npm_and_yarn/vite-8")).toBeUndefined();
		expect(issueFromBranch("my-issue-59-x")).toBeUndefined();
	});

	it("is M only with a size:M label, else S", () => {
		expect(sizeFromLabels(["game:hub", "size:M"])).toBe("M");
		expect(sizeFromLabels(["size:S"])).toBe("S");
		expect(sizeFromLabels([])).toBe("S");
	});
});

describe("label plan", () => {
	it("adds the new labels and removes stale ones", () => {
		expect(
			labelPlan(["tier:docs", "size:over", "game:hub"], {
				tier: "tier:game",
				over: false,
			}),
		).toEqual({ add: ["tier:game"], remove: ["tier:docs", "size:over"] });
	});

	it("keeps labels that are still right", () => {
		expect(
			labelPlan(["tier:game", "size:over"], { tier: "tier:game", over: true }),
		).toEqual({ add: [], remove: [] });
	});

	it("adds size:over when over the limit", () => {
		expect(labelPlan([], { tier: "tier:tests", over: true })).toEqual({
			add: ["tier:tests", "size:over"],
			remove: [],
		});
	});
});
