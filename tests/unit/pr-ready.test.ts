import { describe, expect, it } from "vitest";
import { latestVerdict, type Pr, prState } from "../../scripts/pr-ready";

const head = "a".repeat(40);
const old = "b".repeat(40);
const lint = { name: "check", status: "COMPLETED", conclusion: "SUCCESS" };
const green = [
	lint,
	{ name: "e2e", status: "COMPLETED", conclusion: "SUCCESS" },
];

function verdict(sha: string, v: string) {
	return { body: `<!-- review-verdict sha=${sha} verdict=${v} -->\nText.` };
}

function pr(over: Partial<Pr> = {}): Pr {
	return {
		number: 7,
		title: "A PR",
		headRefOid: head,
		isDraft: false,
		comments: [verdict(head, "approve")],
		statusCheckRollup: green,
		...over,
	};
}

describe("reviewer verdict", () => {
	it("the latest verdict wins", () => {
		expect(
			latestVerdict([
				verdict(old, "changes"),
				{ body: "A normal comment." },
				verdict(head, "approve"),
				{ body: "Thanks!" },
			]),
		).toEqual({ sha: head, verdict: "approve" });
	});

	it("ignores a short sha or an unknown verdict", () => {
		expect(
			latestVerdict([
				{ body: "<!-- review-verdict sha=abc123 verdict=approve -->" },
				{ body: `<!-- review-verdict sha=${head} verdict=lgtm -->` },
			]),
		).toBeUndefined();
	});
});

describe("PR ready state", () => {
	it("is ready with an approve verdict at the head and green checks", () => {
		expect(prState(pr())).toEqual({ ready: true, state: "ready" });
	});

	it("is not ready when the verdict is for an older commit", () => {
		const s = prState(pr({ comments: [verdict(old, "approve")] }));
		expect(s.ready).toBe(false);
		expect(s.state).toMatch(/^stale verdict/);
	});

	it("is not ready with no verdict, changes or owner check", () => {
		expect(prState(pr({ comments: [] })).state).toBe("no verdict");
		expect(prState(pr({ comments: [verdict(head, "changes")] })).state).toBe(
			"changes asked",
		);
		expect(
			prState(pr({ comments: [verdict(head, "owner-check")] })).state,
		).toBe("owner check");
	});

	it("is not ready when checks fail or are not done", () => {
		const failing = [
			lint,
			{ name: "e2e", status: "COMPLETED", conclusion: "FAILURE" },
		];
		expect(prState(pr({ statusCheckRollup: failing })).state).toBe(
			"checks failing",
		);
		const running = [lint, { name: "e2e", status: "IN_PROGRESS" }];
		expect(prState(pr({ statusCheckRollup: running })).state).toBe(
			"checks pending",
		);
		expect(prState(pr({ statusCheckRollup: [] })).state).toBe("checks pending");
		expect(
			prState(pr({ statusCheckRollup: [{ context: "x", state: "SUCCESS" }] }))
				.ready,
		).toBe(true);
	});

	it("a draft is never ready", () => {
		expect(prState(pr({ isDraft: true })).ready).toBe(false);
	});
});
