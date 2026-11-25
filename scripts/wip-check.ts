// WIP check (agent loop trial, Q9): a build session does not start when 3 or
// more PRs wait for the owner. It counts open PRs that are not drafts and not
// from Dependabot.
//
// Usage: node scripts/wip-check.ts   exit 0: go on; exit 1: stop
import { execFileSync } from "node:child_process";

export const WIP_LIMIT = 3;

export interface OpenPr {
	number: number;
	title: string;
	isDraft: boolean;
	author: { login: string };
}

export function wipCheck(prs: OpenPr[]): { go: boolean; waiting: OpenPr[] } {
	const waiting = prs.filter(
		(p) => !p.isDraft && !/dependabot/i.test(p.author.login),
	);
	return { go: waiting.length < WIP_LIMIT, waiting };
}

if (import.meta.main) {
	const prs = JSON.parse(
		execFileSync(
			"gh",
			[
				"pr",
				"list",
				"--state",
				"open",
				"--limit",
				"100",
				"--json",
				"number,title,isDraft,author",
			],
			{ encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
		),
	) as OpenPr[];
	const { go, waiting } = wipCheck(prs);
	console.log(`${waiting.length} PRs wait for the owner (limit ${WIP_LIMIT}).`);
	for (const p of waiting.sort((a, b) => a.number - b.number)) {
		console.log(`#${p.number}\t${p.title}`);
	}
	if (!go) {
		console.error(
			"Stop: do not claim an issue. The owner merges or closes PRs first.",
		);
		process.exit(1);
	}
}
