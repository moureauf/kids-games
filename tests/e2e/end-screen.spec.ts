import { expect, test } from "@playwright/test";
import { installSpeechStub, spoken } from "./helpers/speech-stub";

const LINE = { text: "Well done for trying!", lang: "en-GB" };

test("the end screen says its line once, and again on a tap of the moon", async ({
	page,
}) => {
	await installSpeechStub(page);
	await page.goto("./?e2e#/test");
	await page.getByRole("button", { name: "Finish" }).tap();

	const end = page.getByRole("region", { name: "End of round" });
	await expect(end).toBeVisible();
	await expect.poll(() => spoken(page)).toEqual([LINE]);

	// It never repeats on its own.
	await page.waitForTimeout(1500);
	expect(await spoken(page)).toEqual([LINE]);

	// The moon is a big button: a tap says the line again.
	const moon = end.getByRole("button", { name: "Say it again" });
	const box = await moon.boundingBox();
	expect(box?.width).toBeGreaterThanOrEqual(88);
	expect(box?.height).toBeGreaterThanOrEqual(88);
	await moon.tap();
	await expect.poll(() => spoken(page)).toEqual([LINE, LINE]);
	await moon.tap();
	await expect.poll(() => spoken(page)).toEqual([LINE, LINE, LINE]);
});

test("leaving the end screen stops the speech", async ({ page }) => {
	await installSpeechStub(page);
	// Speech that never ends by itself, so a cancel is easy to see.
	await page.addInitScript(() => {
		const s = window.speechSynthesis as SpeechSynthesis & {
			cancelled?: number;
		};
		s.cancelled = 0;
		s.speak = (u: SpeechSynthesisUtterance) => {
			if (u.text) window.__spoken.push({ text: u.text, lang: u.lang });
		};
		s.cancel = () => {
			s.cancelled = (s.cancelled ?? 0) + 1;
		};
	});
	await page.goto("./?e2e#/test");
	await page.getByRole("button", { name: "Finish" }).tap();
	await expect.poll(() => spoken(page)).toEqual([LINE]);
	const before = await page.evaluate(
		() => (window.speechSynthesis as { cancelled?: number }).cancelled ?? 0,
	);

	await page.getByRole("button", { name: "Home" }).click();
	await expect(page.getByRole("heading", { name: "Kids games" })).toBeVisible();
	await expect
		.poll(() =>
			page.evaluate(
				() => (window.speechSynthesis as { cancelled?: number }).cancelled ?? 0,
			),
		)
		.toBeGreaterThan(before);
});
