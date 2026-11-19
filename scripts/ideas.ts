// Ideas live in ideas/<yyyy-mm-dd>-<slug>.md, one file per idea, so
// parallel PRs never edit the same line. `npm run ideas` prints them as one
// table for the monthly review.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

export interface Idea {
	file: string;
	date: string;
	for: string;
	skill: string;
	title: string;
	body: string;
}

const FILE_NAME = /^(\d{4}-\d{2}-\d{2})-[a-z0-9]+(?:-[a-z0-9]+)*\.md$/;
const FIELDS = ["date", "for", "skill"] as const;

export function parseIdea(
	file: string,
	text: string,
): { idea?: Idea; errors: string[] } {
	const errors: string[] = [];
	const name = FILE_NAME.exec(file);
	if (!name)
		errors.push(
			`${file}: name must be <yyyy-mm-dd>-<slug>.md (lowercase, hyphens)`,
		);

	const match = /^---\n([\s\S]*?)\n---\n+# (.+)\n+([\s\S]+)$/.exec(text);
	if (!match) {
		errors.push(
			`${file}: needs front matter (date, for, skill), then "# Title", then the idea`,
		);
		return { errors };
	}
	const [, front = "", title = "", body = ""] = match;
	const fields: Record<string, string> = {};
	for (const line of front.split("\n")) {
		const kv = /^(\w+):\s*(.+)$/.exec(line);
		if (kv?.[1] && kv[2]) fields[kv[1]] = kv[2].trim();
	}
	for (const key of FIELDS) {
		if (!fields[key]) errors.push(`${file}: front matter is missing "${key}"`);
	}
	if (name && fields.date && fields.date !== name[1]) {
		errors.push(`${file}: date ${fields.date} does not match the file name`);
	}
	if (errors.length > 0) return { errors };
	return {
		idea: {
			file,
			date: fields.date ?? "",
			for: fields.for ?? "",
			skill: fields.skill ?? "",
			title: title.trim(),
			body: body.trim(),
		},
		errors,
	};
}

export function readIdeas(dir: string): { ideas: Idea[]; errors: string[] } {
	const ideas: Idea[] = [];
	const errors: string[] = [];
	for (const file of readdirSync(dir).sort()) {
		if (!file.endsWith(".md")) continue;
		const result = parseIdea(file, readFileSync(join(dir, file), "utf8"));
		errors.push(...result.errors);
		if (result.idea) ideas.push(result.idea);
	}
	return { ideas, errors };
}

export function ideasTable(ideas: Idea[]): string {
	const rows = ideas.map(
		(i) =>
			`| ${i.date} | **${i.title}:** ${i.body.replace(/\s+/g, " ")} | ${i.for} | ${i.skill} |`,
	);
	return ["| Date | Idea | For | Skill |", "|---|---|---|---|", ...rows].join(
		"\n",
	);
}

if (import.meta.main) {
	const { ideas, errors } = readIdeas(join(import.meta.dirname, "..", "ideas"));
	if (errors.length > 0) {
		console.error(errors.join("\n"));
		process.exit(1);
	}
	console.log(ideasTable(ideas));
}
