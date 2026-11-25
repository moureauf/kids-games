import { describe, expect, it } from "vitest";
import { type OpenPr, WIP_LIMIT, wipCheck } from "../../scripts/wip-check";

function pr(number: number, over: Partial<OpenPr> = {}): OpenPr {
	return {
		number,
		title: `PR ${number}`,
		isDraft: false,
		author: { login: "a-builder" },
		...over,
	};
}

describe("WIP check", () => {
	it("the limit is 3", () => {
		expect(WIP_LIMIT).toBe(3);
	});

	it("goes on with 2 PRs that wait for the owner", () => {
		expect(wipCheck([pr(1), pr(2)])).toEqual({
			go: true,
			waiting: [pr(1), pr(2)],
		});
	});

	it("stops with 3 or more", () => {
		expect(wipCheck([pr(1), pr(2), pr(3)]).go).toBe(false);
		expect(wipCheck([pr(1), pr(2), pr(3), pr(4)]).go).toBe(false);
	});

	it("does not count drafts or Dependabot PRs", () => {
		const s = wipCheck([
			pr(1),
			pr(2),
			pr(3, { isDraft: true }),
			pr(4, { author: { login: "app/dependabot" } }),
			pr(5, { author: { login: "dependabot[bot]" } }),
		]);
		expect(s.go).toBe(true);
		expect(s.waiting.map((p) => p.number)).toEqual([1, 2]);
	});

	it("goes on with no open PRs", () => {
		expect(wipCheck([]).go).toBe(true);
	});
});
