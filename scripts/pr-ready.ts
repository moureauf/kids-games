// Is a PR "approved and green" (agent loop trial, Q1, Q2)? Only when the
// latest reviewer verdict is `approve`, the verdict's sha is the PR head
// commit, and all checks pass. A push after the review makes it stale.
//
// Usage: npm run pr-ready -- <pr>   exit 0 when ready, else print why
//        npm run pr-ready           list the open PRs for the owner's batch merge
import { execFileSync } from "node:child_process";

export type Verdict = "approve" | "changes" | "owner-check";

export interface Check {
	name?: string;
	context?: string;
	status?: string; // CheckRun
	conclusion?: string; // CheckRun
	state?: string; // StatusContext
}

export interface Pr {
	number: number;
	title: string;
	headRefOid: string;
	isDraft: boolean;
	comments: { body: string }[];
	statusCheckRollup: Check[];
}

const MARKER =
	/<!-- review-verdict sha=([0-9a-f]{40}) verdict=(approve|changes|owner-check) -->/;
const GREEN = new Set(["SUCCESS", "NEUTRAL", "SKIPPED"]);

export function latestVerdict(
	comments: { body: string }[],
): { sha: string; verdict: Verdict } | undefined {
	for (const c of [...comments].reverse()) {
		const m = MARKER.exec(c.body);
		if (m?.[1] && m[2]) return { sha: m[1], verdict: m[2] as Verdict };
	}
	return undefined;
}

function checksState(checks: Check[]): "green" | "pending" | "failing" {
	if (checks.length === 0) return "pending";
	let pending = false;
	for (const c of checks) {
		const result = c.conclusion || c.state || "";
		if (c.status && c.status !== "COMPLETED") pending = true;
		else if (result === "PENDING" || result === "EXPECTED") pending = true;
		else if (!GREEN.has(result)) return "failing";
	}
	return pending ? "pending" : "green";
}

export function prState(pr: Pr): { ready: boolean; state: string } {
	const v = latestVerdict(pr.comments);
	const checks = checksState(pr.statusCheckRollup);
	let state: string;
	if (pr.isDraft) state = "draft";
	else if (checks === "failing") state = "checks failing";
	else if (!v) state = "no verdict";
	else if (v.sha !== pr.headRefOid)
		state = `stale verdict (${v.sha.slice(0, 7)}, head ${pr.headRefOid.slice(0, 7)})`;
	else if (v.verdict === "changes") state = "changes asked";
	else if (v.verdict === "owner-check") state = "owner check";
	else if (checks === "pending") state = "checks pending";
	else state = "ready";
	return { ready: state === "ready", state };
}

const FIELDS = "number,title,headRefOid,isDraft,comments,statusCheckRollup";

function gh(args: string[]): string {
	// gh prints hints on stderr; an error still throws with its message.
	return execFileSync("gh", args, {
		encoding: "utf8",
		stdio: ["ignore", "pipe", "pipe"],
	});
}

if (import.meta.main) {
	const n = process.argv[2];
	if (n) {
		const pr = JSON.parse(gh(["pr", "view", n, "--json", FIELDS])) as Pr;
		const { ready, state } = prState(pr);
		console.log(`#${pr.number} ${state}`);
		process.exit(ready ? 0 : 1);
	}
	const prs = JSON.parse(
		gh(["pr", "list", "--state", "open", "--json", FIELDS]),
	) as Pr[];
	if (prs.length === 0) console.log("No open PRs.");
	for (const pr of prs.sort((a, b) => a.number - b.number)) {
		console.log(`#${pr.number}\t${prState(pr).state}\t${pr.title}`);
	}
}
