import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const hook = join(
	import.meta.dirname,
	"..",
	"..",
	".claude",
	"hooks",
	"guard-owner.sh",
);

function run(command: string) {
	return spawnSync("bash", [hook], {
		input: JSON.stringify({ tool_input: { command } }),
		encoding: "utf8",
	});
}

describe("guard-owner hook: only the owner merges and grades", () => {
	it.each([
		"gh pr merge 5",
		"gh pr merge 5 --squash --auto",
		"cd x && gh  pr   merge 5",
		"gh api -X PUT repos/o/r/pulls/5/merge",
		"gh api repos/o/r/pulls/5/merge -f merge_method=squash",
		"gh api graphql -f query='mutation { mergePullRequest(input: {}) { clientMutationId } }'",
		"gh api graphql -f query='mutation { enablePullRequestAutoMerge(input: {}) { clientMutationId } }'",
		"gh pr edit 5 --add-label review:agree",
		'gh issue edit 5 --add-label "review:missed"',
		"gh api repos/o/r/issues/5/labels -f 'labels[]=review:noise'",
	])("blocks %s", (command) => {
		const r = run(command);
		expect(r.status).toBe(2);
		expect(r.stderr).toMatch(/^Blocked:/);
	});

	it.each([
		"gh pr view 5",
		"gh pr checks 5 --watch",
		"gh issue edit 5 --add-label needs:owner",
		"gh api repos/o/r/pulls/5/comments",
		"gh label list --search review:",
		"npm run review-grades",
		"git merge origin/main",
		"grep -rn 'review:agree' CONTRIBUTING.md",
	])("allows %s", (command) => {
		expect(run(command).status).toBe(0);
	});
});
