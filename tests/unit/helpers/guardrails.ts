// Checkers for the CLAUDE.md guardrails: every asset is credited (CC0 or
// original) and every fact has a source URL. Each checker returns a list of
// error messages; an empty list means the check passed. The messages tell
// the reader exactly what to change.

import { existsSync, readdirSync } from "node:fs";
import { join, relative, sep } from "node:path";

/** Files the OS drops into folders; never part of the site. */
const IGNORED_FILES = new Set([".DS_Store", "Thumbs.db"]);

/** All files under `dir`, as `/`-separated paths relative to `base`. */
export function listFiles(dir: string, base: string = dir): string[] {
	if (!existsSync(dir)) return [];
	const files: string[] = [];
	for (const entry of readdirSync(dir, {
		recursive: true,
		withFileTypes: true,
	})) {
		if (!entry.isFile() || IGNORED_FILES.has(entry.name)) continue;
		const full = join(entry.parentPath, entry.name);
		files.push(relative(base, full).split(sep).join("/"));
	}
	return files.sort();
}

// ---------------------------------------------------------------- CREDITS

export interface CreditRow {
	/** 1-based line number in CREDITS.md. */
	line: number;
	/** Backticked paths or `*` globs from the File column, relative to public/. */
	patterns: string[];
	/** Text of the last column. */
	licence: string;
}

/** Allowed licence column: starts with "CC0" or "Original" (any case). */
const ALLOWED_LICENCE = /^(cc0|original)\b/i;

export const CREDITS_ROW_FORMAT =
	"| `assets/<folder>/<file>` | <source URL or 'This repo'> | <author> | CC0 |  (or 'Original' in the last column)";

function cells(row: string): string[] {
	return row
		.trim()
		.replace(/^\|/, "")
		.replace(/\|$/, "")
		.split("|")
		.map((c) => c.trim());
}

/** Table rows of CREDITS.md, without header and separator rows. */
export function parseCredits(markdown: string): CreditRow[] {
	const rows: CreditRow[] = [];
	const lines = markdown.split(/\r?\n/);
	lines.forEach((text, i) => {
		if (!text.trim().startsWith("|")) return;
		const row = cells(text);
		if (row.every((c) => /^:?-*:?$/.test(c))) return; // |---|---|
		if (row[0]?.toLowerCase() === "file") return; // header
		const patterns = [...(row[0] ?? "").matchAll(/`([^`]+)`/g)].map(
			(m) => m[1] ?? "",
		);
		rows.push({ line: i + 1, patterns, licence: row.at(-1) ?? "" });
	});
	return rows;
}

function globToRegExp(pattern: string): RegExp {
	const escaped = pattern
		.split("*")
		.map((part) => part.replace(/[.+?^${}()|[\]\\]/g, "\\$&"))
		.join("[^/]*");
	return new RegExp(`^${escaped}$`);
}

/**
 * Check CREDITS.md against the files in public/assets/.
 * @param markdown contents of CREDITS.md
 * @param assetFiles files under public/assets/, relative to public/
 *   (e.g. "assets/icons/icon.svg")
 */
export function checkCredits(markdown: string, assetFiles: string[]): string[] {
	const errors: string[] = [];
	const credited = new Set<string>();

	for (const row of parseCredits(markdown)) {
		const where = `CREDITS.md line ${row.line}`;
		if (row.patterns.length === 0) {
			errors.push(
				`${where}: the File column has no path in backticks. Write each path relative to public/ in backticks, e.g. ${CREDITS_ROW_FORMAT}`,
			);
			continue;
		}
		if (!ALLOWED_LICENCE.test(row.licence)) {
			errors.push(
				`${where} (${row.patterns.map((p) => `\`${p}\``).join(", ")}): licence "${row.licence}" is not allowed. Only CC0 files and original work may be used (CLAUDE.md, Assets). Replace the file with a CC0 or original one and write "CC0" or "Original" in the Licence column.`,
			);
		}
		for (const pattern of row.patterns) {
			if (!pattern.startsWith("assets/")) {
				errors.push(
					`${where}: \`${pattern}\` must be a path relative to public/ that starts with "assets/" (e.g. \`assets/sounds/pop.ogg\`, not \`public/assets/...\`).`,
				);
				continue;
			}
			const re = globToRegExp(pattern);
			const matches = assetFiles.filter((f) => re.test(f));
			if (matches.length === 0) {
				errors.push(
					`${where}: \`${pattern}\` matches no file in public/. The entry is stale: remove the row, or fix the path if the file was renamed.`,
				);
			}
			// Only a row with an allowed licence counts as credit.
			if (ALLOWED_LICENCE.test(row.licence)) {
				for (const m of matches) credited.add(m);
			}
		}
	}

	for (const file of assetFiles) {
		if (credited.has(file)) continue;
		errors.push(
			`public/${file} is not listed in CREDITS.md with a CC0 or Original licence. Add a row to the Sounds or Art table: | \`${file}\` | <source URL or 'This repo'> | <author> | CC0 or Original |`,
		);
	}
	return errors;
}

// ------------------------------------------------------------------ facts

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isHttpsUrl(value: string): boolean {
	try {
		return new URL(value).protocol === "https:";
	} catch {
		return false;
	}
}

/**
 * Check the exports of one `facts*.ts` module: every object with a `fact`
 * key in an exported array needs a `source` that is an https URL.
 * @param file path shown in messages, e.g. "src/games/dinos/facts.ts"
 * @param exports the module namespace (`await import(file)`)
 */
export function checkFactsModule(
	file: string,
	exports: Record<string, unknown>,
): string[] {
	const errors: string[] = [];
	let factCount = 0;

	for (const [name, value] of Object.entries(exports)) {
		if (!Array.isArray(value)) continue;
		value.forEach((entry, i) => {
			if (!isRecord(entry) || !("fact" in entry)) return;
			factCount++;
			const where = `${file}: ${name}[${i}]`;
			const fact = JSON.stringify(entry.fact);
			const source = entry.source;
			const fix = `Add source: "https://..." pointing to a trusted page (museum, encyclopedia, university) that states this fact, or remove the fact (CLAUDE.md: "No fact without a source").`;
			if (typeof source !== "string" || source.trim() === "") {
				errors.push(`${where} (fact ${fact}) has no source. ${fix}`);
			} else if (!isHttpsUrl(source.trim())) {
				errors.push(
					`${where} (fact ${fact}) has source ${JSON.stringify(source)}, which is not an https URL. ${fix}`,
				);
			}
		});
	}

	if (factCount === 0) {
		errors.push(
			`${file} exports no fact entries. A facts*.ts file must export an array of objects shaped { fact: string, source: "https://..." }. Rename the file if it does not hold facts.`,
		);
	}
	return errors;
}

/** `facts*.ts` files under `gamesDir`, relative to `root` (e.g. "src/games/x/facts.ts"). */
export function findFactFiles(root: string, gamesDir: string): string[] {
	return listFiles(join(root, gamesDir), root).filter((f) =>
		/(^|\/)facts[^/]*\.ts$/.test(f),
	);
}

/** Import every `facts*.ts` file under `gamesDir` and check it. */
export async function checkFactFiles(
	root: string,
	gamesDir: string,
): Promise<{ files: string[]; errors: string[] }> {
	const files = findFactFiles(root, gamesDir);
	const errors: string[] = [];
	for (const file of files) {
		const mod = (await import(join(root, file))) as Record<string, unknown>;
		errors.push(...checkFactsModule(file, mod));
	}
	return { files, errors };
}

/**
 * Rows in each CREDITS.md table must be sorted by their first path, so that
 * parallel PRs add rows in different places and do not conflict.
 */
export function checkCreditsSorted(markdown: string): string[] {
	const errors: string[] = [];
	let previous: CreditRow | undefined;
	for (const row of parseCredits(markdown)) {
		const sameTable = previous !== undefined && row.line === previous.line + 1;
		const key = row.patterns[0] ?? "";
		const previousKey = previous?.patterns[0] ?? "";
		if (sameTable && key < previousKey) {
			errors.push(
				`CREDITS.md line ${row.line}: \`${key}\` must come before \`${previousKey}\` (keep rows sorted by file path)`,
			);
		}
		previous = row;
	}
	return errors;
}
