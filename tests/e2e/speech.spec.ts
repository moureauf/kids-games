import { expect, test } from "@playwright/test";
import { installSpeechStub, spoken } from "./helpers/speech-stub";

// Speech in the real built page, through Sound safari: the English name of
// a tapped creature uses an English (en-GB) voice.

test("says a creature's name with the en-GB voice", async ({ page }) => {
	await installSpeechStub(page);
	await page.goto("./#/sound-safari");

	await page.getByRole("button", { name: "Cow" }).tap();

	await expect
		.poll(() => spoken(page))
		.toEqual([{ text: "cow", lang: "en-GB" }]);
});

test("stays silent, not French-accented, with only a French voice", async ({
	page,
}) => {
	await installSpeechStub(page, { voices: ["fr-FR"] });
	await page.goto("./#/sound-safari");
	const cow = page.getByRole("button", { name: "Cow" });
	await cow.tap();
	await expect(cow).toHaveClass(/anim-wiggle/);
	await page.waitForTimeout(300);
	expect(await spoken(page)).toEqual([]);
});

test("keeps working when no voices are installed", async ({ page }) => {
	const errors: Error[] = [];
	page.on("pageerror", (e) => errors.push(e));
	await installSpeechStub(page, { voices: [] });
	await page.goto("./#/sound-safari");

	const dino = page.getByRole("button", { name: "Dinosaur" });
	await dino.tap();
	await expect(dino).toHaveClass(/anim-stomp/);
	await page.getByRole("button", { name: "Pig" }).tap();
	await expect(page.getByRole("button", { name: "Pig" })).toHaveClass(
		/anim-bounce/,
	);
	expect(errors).toEqual([]);
});
