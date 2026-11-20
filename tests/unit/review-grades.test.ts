import { describe, expect, it } from "vitest";
import { type Pr, report, summarise } from "../../scripts/review-grades";

const verdict = {
	body: "<!-- review-verdict sha=abc123 verdict=approve -->\nLooks good.",
};

function pr(number: number, labels: string[] = [], reviewed = true): Pr {
	return {
		number,
		title: `PR ${number}`,
		labels: labels.map((name) => ({ name })),
		comments: reviewed ? [verdict] : [{ body: "A normal comment." }],
	};
}

describe("review grades", () => {
	it("counts each grade and lists reviewed PRs with no grade", () => {
		const s = summarise([
			pr(3, ["review:agree"]),
			pr(4, ["review:noise", "game:hub"]),
			pr(5),
			pr(6, [], false),
		]);
		expect(s.counts).toEqual({
			"review:agree": 1,
			"review:missed": 0,
			"review:noise": 1,
		});
		expect(s.graded).toEqual([3, 4]);
		expect(s.ungraded.map((p) => p.number)).toEqual([5]);
		expect(s.result).toBeUndefined();
	});

	it("flags a PR with two grades and does not count it", () => {
		const s = summarise([pr(7, ["review:agree", "review:missed"])]);
		expect(s.conflicts).toEqual([7]);
		expect(s.graded).toEqual([]);
		expect(report(s)).toMatch(/More than one grade.*#7/);
	});

	it("after 10 graded PRs with 1 missed, auto-merge may start", () => {
		const prs = Array.from({ length: 10 }, (_, i) =>
			pr(i + 1, [i === 0 ? "review:missed" : "review:agree"]),
		);
		expect(summarise(prs).result).toMatch(/^1 review:missed.*may start/);
	});

	it("uses only the first 10 graded PRs, in PR order", () => {
		const prs = Array.from({ length: 12 }, (_, i) =>
			pr(12 - i, [i < 2 ? "review:missed" : "review:agree"]),
		);
		// PRs 11 and 12 are missed, but they come after the first 10.
		expect(summarise(prs).result).toMatch(/^0 review:missed/);
		const twoMissed = prs.map((p) =>
			p.number <= 2 ? pr(p.number, ["review:missed"]) : p,
		);
		expect(summarise(twoMissed).result).toMatch(/change the reviewer/);
	});
});
