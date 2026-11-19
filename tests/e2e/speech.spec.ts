import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import { expect, type Page, test } from "@playwright/test";
import type { Lang } from "../../src/core/speech";
import { installSpeechStub, spoken } from "./helpers/speech-stub";

declare global {
	interface Window {
		__speechUnderTest?: {
			say: (text: string, lang?: Lang) => Promise<void>;
			sayAll: (items: { text: string; lang: Lang }[]) => Promise<void>;
		};
	}
}

// No game uses speech yet, so the test loads src/core/speech.ts into the
// built page itself. Nothing extra ships to users.
const speechModule = `${stripTypeScriptTypes(
	readFileSync(new URL("../../src/core/speech.ts", import.meta.url), "utf8"),
)}
window.__speechUnderTest = { say, sayAll };`;

async function loadSpeech(page: Page) {
	await page.goto("./");
	await page.addScriptTag({ content: speechModule, type: "module" });
	await page.waitForFunction(() => window.__speechUnderTest !== undefined);
}

test("names a word in English, then in French", async ({ page }) => {
	await installSpeechStub(page);
	await loadSpeech(page);

	await page.evaluate(() =>
		window.__speechUnderTest?.sayAll([
			{ text: "the cow", lang: "en" },
			{ text: "la vache", lang: "fr" },
		]),
	);

	expect(await spoken(page)).toEqual([
		{ text: "the cow", lang: "en-GB" },
		{ text: "la vache", lang: "fr-FR" },
	]);
});

test("keeps working when no voices are installed", async ({ page }) => {
	const errors: Error[] = [];
	page.on("pageerror", (e) => errors.push(e));
	await installSpeechStub(page, { voices: [] });
	await loadSpeech(page);

	await page.evaluate(() => window.__speechUnderTest?.say("hello"));

	await expect(page.getByRole("heading", { name: "Kids games" })).toBeVisible();
	expect(errors).toEqual([]);
});
