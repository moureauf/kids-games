// The owner grades the reviewer subagent on each PR with one label:
// review:agree, review:missed or review:noise (agent loop trial, Q5, Q10).
// `npm run review-grades` counts the grades and, after 10 graded PRs, prints
// the exit rule (Q13).
import { execFileSync } from "node:child_process";

export const GRADES = [
	"review:agree",
	"review:missed",
	"review:noise",
] as const;
export type Grade = (typeof GRADES)[number];

// The reviewer starts its PR comment with this marker.
const VERDICT = "<!-- review-verdict ";
const TRIAL_SIZE = 10;

export interface Pr {
	number: number;
	title: string;
	labels: { name: string }[];
	comments: { body: string }[];
}

export interface Summary {
	counts: Record<Grade, number>;
	graded: number[];
	ungraded: Pr[];
	conflicts: number[];
	result?: string;
}

export function summarise(prs: Pr[]): Summary {
	const counts = Object.fromEntries(GRADES.map((g) => [g, 0])) as Record<
		Grade,
		number
	>;
	const graded: number[] = [];
	const ungraded: Pr[] = [];
	const conflicts: number[] = [];
	const firstTen: Grade[] = [];

	for (const pr of [...prs].sort((a, b) => a.number - b.number)) {
		const grades = GRADES.filter((g) => pr.labels.some((l) => l.name === g));
		const reviewed = pr.comments.some((c) => c.body.includes(VERDICT));
		if (grades.length > 1) {
			conflicts.push(pr.number);
			continue;
		}
		const [grade] = grades;
		if (grade) {
			counts[grade]++;
			graded.push(pr.number);
			if (firstTen.length < TRIAL_SIZE) firstTen.push(grade);
		} else if (reviewed) {
			ungraded.push(pr);
		}
	}

	const summary: Summary = { counts, graded, ungraded, conflicts };
	if (firstTen.length === TRIAL_SIZE) {
		const missed = firstTen.filter((g) => g === "review:missed").length;
		summary.result =
			missed <= 1
				? `${missed} review:missed in the first ${TRIAL_SIZE}: auto-merge for docs and tests may start, after a bot identity (Q13).`
				: `${missed} review:missed in the first ${TRIAL_SIZE}: change the reviewer, then grade ${TRIAL_SIZE} more PRs (Q13).`;
	}
	return summary;
}

export function report(s: Summary): string {
	const lines = [
		`Graded: ${s.graded.length} of ${TRIAL_SIZE}`,
		...GRADES.map((g) => `  ${g}: ${s.counts[g]}`),
	];
	if (s.conflicts.length > 0)
		lines.push(
			`More than one grade (fix the labels): ${s.conflicts.map((n) => `#${n}`).join(" ")}`,
		);
	if (s.ungraded.length > 0) {
		lines.push("Reviewed, not graded yet:");
		for (const pr of s.ungraded) lines.push(`  #${pr.number} ${pr.title}`);
	}
	lines.push(
		s.result ?? `Result: after ${TRIAL_SIZE} graded PRs (Q13 exit rule).`,
	);
	return lines.join("\n");
}

if (import.meta.main) {
	const json = execFileSync(
		"gh",
		[
			"pr",
			"list",
			"--state",
			"all",
			"--limit",
			"500",
			"--json",
			"number,title,labels,comments",
		],
		{ encoding: "utf8" },
	);
	console.log(report(summarise(JSON.parse(json) as Pr[])));
}
