// Size check for a PR (agent loop trial, Q8). Counts the changed lines
// (added + deleted) against the base, without tests, lockfiles and binary
// files. size:S allows 250 lines, size:M 500. A larger change is split into
// more issues.
//
// Usage: npm run pr-size -- [S|M] [base]
// With no size, it reads the size:* label of the issue in the branch name
// (issue-<n>-...). The base is origin/main by default (or the stacked branch).
// It counts the working tree, so it also works before the commit.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

export const LIMITS = { S: 250, M: 500 } as const;
export type Size = keyof typeof LIMITS;

export interface Change {
	file: string;
	lines: number | null; // null: binary
}

const SKIPPED = [
	/^tests\//,
	/(^|\/)package-lock\.json$/,
	/(^|\/)pnpm-lock\.yaml$/,
	/(^|\/)yarn\.lock$/,
	/\.lock$/,
];

// `git diff --numstat` lines: "<added>\t<deleted>\t<file>", "-" for binary.
export function parseNumstat(text: string): Change[] {
	return text
		.split("\n")
		.filter((l) => l.trim() !== "")
		.map((l) => {
			const [added = "", deleted = "", ...file] = l.split("\t");
			const binary = added === "-" || deleted === "-";
			return {
				file: file.join("\t"),
				lines: binary ? null : Number(added) + Number(deleted),
			};
		});
}

export function countLines(changes: Change[]): {
	counted: number;
	skipped: string[];
} {
	let counted = 0;
	const skipped: string[] = [];
	for (const c of changes) {
		if (c.lines === null || SKIPPED.some((re) => re.test(c.file))) {
			skipped.push(c.file);
		} else {
			counted += c.lines;
		}
	}
	return { counted, skipped };
}

function git(...args: string[]): string {
	return execFileSync("git", args, { encoding: "utf8" });
}

function untracked(): Change[] {
	return git("ls-files", "--others", "--exclude-standard", "-z")
		.split("\0")
		.filter(Boolean)
		.map((file) => {
			const data = readFileSync(file);
			if (data.includes(0)) return { file, lines: null };
			const text = data.toString("utf8");
			const lines = text.split("\n").length - (text.endsWith("\n") ? 1 : 0);
			return { file, lines };
		});
}

function sizeFromIssue(): Size {
	const branch = git("branch", "--show-current").trim();
	const n = /^issue-(\d+)-/.exec(branch)?.[1];
	if (!n) return "S";
	const labels = execFileSync(
		"gh",
		["issue", "view", n, "--json", "labels", "-q", ".labels[].name"],
		{ encoding: "utf8" },
	);
	return /^size:M$/m.test(labels) ? "M" : "S";
}

if (import.meta.main) {
	const [first, second] = process.argv.slice(2);
	const size: Size = first === "S" || first === "M" ? first : sizeFromIssue();
	const base =
		(first === "S" || first === "M" ? second : first) ?? "origin/main";
	const from = git("merge-base", base, "HEAD").trim();
	const changes = [
		...parseNumstat(git("diff", "--numstat", from)),
		...untracked(),
	];
	const { counted, skipped } = countLines(changes);
	const limit = LIMITS[size];
	console.log(
		`${counted} changed lines (limit for size:${size} is ${limit}), against ${base}`,
	);
	if (skipped.length > 0) console.log(`Not counted: ${skipped.join(", ")}`);
	if (counted > limit) {
		console.error(
			counted > LIMITS.M
				? "Too large for one PR. Split the work into more issues."
				: `Over size:${size}. Split the work into more issues, or ask the owner to relabel the issue size:M.`,
		);
		process.exit(1);
	}
}
