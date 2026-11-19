import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
	checkCredits,
	checkFactFiles,
	checkFactsModule,
	listFiles,
	parseCredits,
} from "./helpers/guardrails";

const root = join(import.meta.dirname, "../..");
const fixtures = join(import.meta.dirname, "fixtures");

function joinErrors(errors: string[]): string {
	return errors.map((e) => `\n  - ${e}`).join("");
}

describe("guardrail: CREDITS.md covers every asset (CLAUDE.md, Assets)", () => {
	it("lists every file in public/assets/ as CC0 or Original, with no stale rows", () => {
		const markdown = readFileSync(join(root, "CREDITS.md"), "utf8");
		const assets = listFiles(join(root, "public/assets"), join(root, "public"));
		expect(assets.length).toBeGreaterThan(0);
		const errors = checkCredits(markdown, assets);
		expect(errors, `Fix CREDITS.md:${joinErrors(errors)}`).toEqual([]);
	});
});

describe("guardrail: every fact has a source (CLAUDE.md, Correct facts only)", () => {
	it("every fact in src/games/**/facts*.ts has an https source", async () => {
		const { errors } = await checkFactFiles(root, "src/games");
		expect(errors, `Fix the facts files:${joinErrors(errors)}`).toEqual([]);
	});
});

describe("CREDITS checker", () => {
	const table = (...rows: string[]) =>
		[
			"## Art",
			"",
			"| File | Source | Author | Licence |",
			"|---|---|---|---|",
			...rows,
		].join("\n");

	it("parses backticked paths and globs relative to public/", () => {
		const rows = parseCredits(
			table(
				"| `assets/icons/*.png`, `assets/icons/favicon.ico` | Generated | us | Original (MIT) |",
			),
		);
		expect(rows).toEqual([
			{
				line: 5,
				patterns: ["assets/icons/*.png", "assets/icons/favicon.ico"],
				licence: "Original (MIT)",
			},
		]);
	});

	it("accepts CC0 and Original rows, with * globs", () => {
		const md = table(
			"| `assets/icons/icon.svg` | This repo | us | Original (MIT) |",
			"| `assets/icons/*.png` | This repo | us | original |",
			"| `assets/sounds/pop.ogg` | https://example.org/pop | Someone | CC0 1.0 |",
		);
		expect(
			checkCredits(md, [
				"assets/icons/a.png",
				"assets/icons/b.png",
				"assets/icons/icon.svg",
				"assets/sounds/pop.ogg",
			]),
		).toEqual([]);
	});

	it("does not let * cross folders", () => {
		const md = table("| `assets/*.png` | This repo | us | Original |");
		const errors = checkCredits(md, ["assets/a.png", "assets/icons/b.png"]);
		expect(errors).toHaveLength(1);
		expect(errors[0]).toContain("public/assets/icons/b.png is not listed");
	});

	it("fails when an asset is missing, and says which row to add", () => {
		const md = table("| `assets/icons/icon.svg` | This repo | us | Original |");
		const errors = checkCredits(md, [
			"assets/icons/icon.svg",
			"assets/sounds/moo.ogg",
		]);
		expect(errors).toEqual([
			expect.stringContaining(
				"public/assets/sounds/moo.ogg is not listed in CREDITS.md",
			),
		]);
		expect(errors[0]).toContain("| `assets/sounds/moo.ogg` |");
	});

	it("fails on a licence that is not CC0 or Original", () => {
		const md = table(
			"| `assets/sounds/moo.ogg` | https://example.org/moo | Someone | CC BY 4.0 |",
		);
		const errors = checkCredits(md, ["assets/sounds/moo.ogg"]);
		expect(errors).toHaveLength(2);
		expect(errors[0]).toMatch(
			/CREDITS\.md line 5 \(`assets\/sounds\/moo\.ogg`\): licence "CC BY 4\.0" is not allowed/,
		);
		expect(errors[0]).toContain("CC0 or original");
		// A row with a disallowed licence does not count as credit.
		expect(errors[1]).toContain("public/assets/sounds/moo.ogg is not listed");
	});

	it("fails on a stale row that matches no file", () => {
		const md = table(
			"| `assets/icons/icon.svg` | This repo | us | Original |",
			"| `assets/sounds/gone.ogg` | https://example.org | Someone | CC0 |",
		);
		const errors = checkCredits(md, ["assets/icons/icon.svg"]);
		expect(errors).toEqual([
			expect.stringMatching(
				/CREDITS\.md line 6: `assets\/sounds\/gone\.ogg` matches no file .*stale/,
			),
		]);
	});

	it("fails on a row with no backticked path or a path outside assets/", () => {
		const md = table(
			"| assets/icons/icon.svg | This repo | us | Original |",
			"| `public/assets/icons/icon.svg` | This repo | us | Original |",
		);
		const errors = checkCredits(md, ["assets/icons/icon.svg"]);
		expect(errors).toHaveLength(3);
		expect(errors[0]).toContain(
			"line 5: the File column has no path in backticks",
		);
		expect(errors[1]).toContain(
			'must be a path relative to public/ that starts with "assets/"',
		);
		expect(errors[2]).toContain("public/assets/icons/icon.svg is not listed");
	});

	it("lists files recursively, relative to public/", () => {
		expect(
			listFiles(join(root, "public/assets"), join(root, "public")),
		).toContain("assets/icons/icon.svg");
		expect(listFiles(join(root, "no/such/dir"))).toEqual([]);
	});
});

describe("facts checker", () => {
	it("passes with zero facts files", async () => {
		const result = await checkFactFiles(fixtures, "no-games-here");
		expect(result).toEqual({ files: [], errors: [] });
	});

	it("accepts a fact with an https source", async () => {
		const result = await checkFactFiles(fixtures, "games/good");
		expect(result).toEqual({ files: ["games/good/facts.ts"], errors: [] });
	});

	it("rejects facts with a missing, empty or non-https source, and files with no facts", async () => {
		const { files, errors } = await checkFactFiles(fixtures, "games/bad");
		expect(files).toEqual([
			"games/bad/facts-sea.ts",
			"games/bad/factsheet-empty.ts",
		]);
		expect(errors).toHaveLength(5);
		expect(errors[0]).toBe(
			'games/bad/facts-sea.ts: seaFacts[0] (fact "A whale is a mammal.") has no source. Add source: "https://..." pointing to a trusted page (museum, encyclopedia, university) that states this fact, or remove the fact (CLAUDE.md: "No fact without a source").',
		);
		expect(errors[1]).toContain(
			'seaFacts[1] (fact "Starfish have no brain.") has no source',
		);
		expect(errors[2]).toContain(
			'seaFacts[2] (fact "Crabs walk sideways.") has source "http://example.org/crab", which is not an https URL',
		);
		expect(errors[3]).toContain(
			'seaFacts[3] (fact "Sharks have no bones.") has source "my book"',
		);
		expect(errors[4]).toContain(
			"games/bad/factsheet-empty.ts exports no fact entries",
		);
	});

	it("ignores exports that are not arrays of fact objects", () => {
		expect(
			checkFactsModule("x/facts.ts", {
				title: "Sea",
				facts: [{ fact: "Fish swim.", source: "https://example.org/fish" }],
				other: [1, 2, { name: "n" }],
			}),
		).toEqual([]);
	});
});
