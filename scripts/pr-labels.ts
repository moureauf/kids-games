// Size and tier labels for a PR (agent loop trial, Q1). The workflow
// .github/workflows/pr-labels.yml runs this file from main on
// pull_request_target. It never checks out or runs PR code: it reads the PR
// file list from the GitHub API only.
//
// Labels:
// - size:over when the counted lines are over the issue's size limit.
// - One tier: tier:owner-only (CLAUDE.md, .claude/, .github/), tier:docs
//   (docs/ or *.md only), tier:tests (tests/ only), else tier:game.
//
// The size rules MUST match scripts/pr-size.ts (LIMITS, SKIPPED, the size
// from the issue in the branch name). Change both files together.
import { readFileSync } from "node:fs";

export const LIMITS = { S: 250, M: 500 } as const;
export type Size = keyof typeof LIMITS;
export type Tier = "tier:owner-only" | "tier:docs" | "tier:tests" | "tier:game";

const SKIPPED = [
	/^tests\//,
	/(^|\/)package-lock\.json$/,
	/(^|\/)pnpm-lock\.yaml$/,
	/(^|\/)yarn\.lock$/,
	/\.lock$/,
];

const OWNER_ONLY = /^(CLAUDE\.md$|\.claude\/|\.github\/)/;
const DOCS = /^docs\/|\.md$/;
const TESTS = /^tests\//;

// One entry of GET /repos/{repo}/pulls/{n}/files. A binary file has 0 changes.
export interface FileChange {
	filename: string;
	changes: number;
	previous_filename?: string;
}

export function tierOf(files: FileChange[]): Tier {
	const names = files.flatMap((f) =>
		f.previous_filename ? [f.filename, f.previous_filename] : [f.filename],
	);
	if (names.some((n) => OWNER_ONLY.test(n))) return "tier:owner-only";
	if (names.length === 0) return "tier:game";
	if (names.every((n) => DOCS.test(n))) return "tier:docs";
	if (names.every((n) => TESTS.test(n))) return "tier:tests";
	return "tier:game";
}

export function countLines(files: FileChange[]): number {
	let counted = 0;
	for (const f of files) {
		if (!SKIPPED.some((re) => re.test(f.filename))) counted += f.changes;
	}
	return counted;
}

export function issueFromBranch(branch: string): number | undefined {
	const n = /^issue-(\d+)-/.exec(branch)?.[1];
	return n ? Number(n) : undefined;
}

export function sizeFromLabels(labels: string[]): Size {
	return labels.includes("size:M") ? "M" : "S";
}

const OURS = /^(tier:|size:over$)/;

export function labelPlan(
	current: string[],
	want: { tier: Tier; over: boolean },
): { add: string[]; remove: string[] } {
	const wanted = [want.tier, ...(want.over ? ["size:over"] : [])];
	return {
		add: wanted.filter((l) => !current.includes(l)),
		remove: current.filter((l) => OURS.test(l) && !wanted.includes(l)),
	};
}

async function api(path: string, init: RequestInit = {}): Promise<Response> {
	const res = await fetch(`https://api.github.com${path}`, {
		...init,
		headers: {
			accept: "application/vnd.github+json",
			authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
			"x-github-api-version": "2022-11-28",
		},
	});
	if (!res.ok && res.status !== 404) {
		throw new Error(`${init.method ?? "GET"} ${path}: ${res.status}`);
	}
	return res;
}

async function labelsOf(repo: string, n: number): Promise<string[] | null> {
	const res = await api(`/repos/${repo}/issues/${n}/labels?per_page=100`);
	if (res.status === 404) return null;
	return ((await res.json()) as { name: string }[]).map((l) => l.name);
}

async function prFiles(repo: string, n: number): Promise<FileChange[]> {
	const files: FileChange[] = [];
	// The API gives 3000 files at most (30 pages): far over any limit.
	for (let page = 1; page <= 30; page++) {
		const res = await api(
			`/repos/${repo}/pulls/${n}/files?per_page=100&page=${page}`,
		);
		const batch = (await res.json()) as FileChange[];
		files.push(...batch);
		if (batch.length < 100) break;
	}
	return files;
}

if (import.meta.main) {
	const repo = process.env.GITHUB_REPOSITORY ?? "";
	const event = JSON.parse(
		readFileSync(process.env.GITHUB_EVENT_PATH ?? "", "utf8"),
	) as { pull_request: { number: number; head: { ref: string } } };
	const n = event.pull_request.number;

	const files = await prFiles(repo, n);
	const issue = issueFromBranch(event.pull_request.head.ref);
	const size = sizeFromLabels(
		(issue ? await labelsOf(repo, issue) : null) ?? [],
	);
	const counted = countLines(files);
	const tier = tierOf(files);
	const over = counted > LIMITS[size];

	const { add, remove } = labelPlan((await labelsOf(repo, n)) ?? [], {
		tier,
		over,
	});
	for (const l of remove) {
		await api(`/repos/${repo}/issues/${n}/labels/${encodeURIComponent(l)}`, {
			method: "DELETE",
		});
	}
	if (add.length > 0) {
		await api(`/repos/${repo}/issues/${n}/labels`, {
			method: "POST",
			body: JSON.stringify({ labels: add }),
		});
	}
	console.log(
		`#${n}: ${files.length} files, ${counted} counted lines (size:${size} limit ${LIMITS[size]}), ${tier}${over ? ", size:over" : ""}`,
	);
	console.log(
		`Added: ${add.join(", ") || "none"}. Removed: ${remove.join(", ") || "none"}.`,
	);
}
