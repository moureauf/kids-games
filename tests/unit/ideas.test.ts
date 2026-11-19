import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ideasTable, parseIdea, readIdeas } from "../../scripts/ideas";

const good = `---
date: 2026-01-02
for: Both
skill: Counting
---

# Pebble path

Count pebbles to cross the stream.
`;

describe("guardrail: every idea file is valid (CLAUDE.md, Session workflow)", () => {
	it("ideas/ has at least one idea and no errors", () => {
		const { ideas, errors } = readIdeas(
			join(import.meta.dirname, "..", "..", "ideas"),
		);
		expect(errors).toEqual([]);
		expect(ideas.length).toBeGreaterThan(0);
	});
});

describe("idea parser", () => {
	it("reads front matter, title and body", () => {
		const { idea, errors } = parseIdea("2026-01-02-pebble-path.md", good);
		expect(errors).toEqual([]);
		expect(idea).toMatchObject({
			date: "2026-01-02",
			for: "Both",
			skill: "Counting",
			title: "Pebble path",
			body: "Count pebbles to cross the stream.",
		});
	});

	it("rejects a bad file name", () => {
		expect(parseIdea("Pebble Path.md", good).errors[0]).toMatch(/name must be/);
	});

	it("rejects a date that does not match the file name", () => {
		expect(parseIdea("2026-01-03-pebble-path.md", good).errors[0]).toMatch(
			/does not match/,
		);
	});

	it("rejects missing fields and a missing title", () => {
		const noSkill = good.replace("skill: Counting\n", "");
		expect(parseIdea("2026-01-02-pebble-path.md", noSkill).errors[0]).toMatch(
			/missing "skill"/,
		);
		const noTitle = good.replace("# Pebble path\n\n", "");
		expect(parseIdea("2026-01-02-pebble-path.md", noTitle).errors[0]).toMatch(
			/front matter/,
		);
	});

	it("prints a Markdown table", () => {
		const { idea } = parseIdea("2026-01-02-pebble-path.md", good);
		expect(ideasTable(idea ? [idea] : [])).toContain(
			"| 2026-01-02 | **Pebble path:** Count pebbles to cross the stream. | Both | Counting |",
		);
	});
});
