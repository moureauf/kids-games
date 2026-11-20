import { expect, test } from "@playwright/test";
import { creatures } from "../../src/games/sound-safari/creatures";
import { ROUND_TAPS } from "../../src/games/sound-safari/round";
import { installSpeechStub, spoken } from "./helpers/speech-stub";

const label = (en: string) => en[0]?.toUpperCase() + en.slice(1);

test("the scene shows six big creatures @shot", async ({ page }, testInfo) => {
	await page.goto("./#/sound-safari");
	const buttons = page.locator(".creature");
	await expect(buttons).toHaveCount(6);
	const boxes = [];
	for (const c of creatures) {
		const box = await page
			.getByRole("button", { name: label(c.en) })
			.boundingBox();
		if (!box) throw new Error(`${c.id} not visible`);
		expect(box.width).toBeGreaterThanOrEqual(120);
		expect(box.height).toBeGreaterThanOrEqual(120);
		boxes.push(box);
	}
	// No two targets overlap, so one tap never hits two creatures.
	for (let i = 0; i < boxes.length; i++) {
		for (let j = i + 1; j < boxes.length; j++) {
			const a = boxes[i];
			const b = boxes[j];
			if (!a || !b) continue;
			const apart =
				a.x + a.width <= b.x ||
				b.x + b.width <= a.x ||
				a.y + a.height <= b.y ||
				b.y + b.height <= a.y;
			expect(apart, `${creatures[i]?.id} / ${creatures[j]?.id}`).toBe(true);
		}
	}
	await page.screenshot({
		path: `screenshots/${testInfo.project.name}/sound-safari.png`,
	});
});

test("tapping each creature moves it and says its English name", async ({
	page,
}) => {
	await installSpeechStub(page);
	await page.goto("./#/sound-safari");
	const expected = [];
	for (const c of creatures) {
		const button = page.getByRole("button", { name: label(c.en) });
		await button.tap();
		await expect(button).toHaveClass(new RegExp(`anim-${c.animation}`));
		expected.push({ text: c.en, lang: "en-GB" });
		await expect.poll(() => spoken(page)).toEqual(expected);
	}
	// The movement ends on its own and leaves the creature ready again.
	await expect(page.locator(".creature[class*='anim-']")).toHaveCount(0);
});

test("re-tapping restarts the movement without repeating the name endlessly", async ({
	page,
}) => {
	await installSpeechStub(page);
	await page.goto("./#/sound-safari");
	// Speech that never ends, like a long word still being said.
	await page.evaluate(() => {
		const s = window.speechSynthesis as unknown as {
			speak: (u: SpeechSynthesisUtterance) => void;
		};
		s.speak = (u) => {
			if (u.text) window.__spoken.push({ text: u.text, lang: u.lang });
		};
	});
	const cow = page.getByRole("button", { name: "Cow" });
	for (let i = 0; i < 4; i++) await cow.tap();
	await expect(cow).toHaveClass(/anim-wiggle/);
	await expect
		.poll(() => spoken(page))
		.toEqual([{ text: "cow", lang: "en-GB" }]);
	// Another creature interrupts at once.
	await page.getByRole("button", { name: "Pig" }).tap();
	await expect
		.poll(() => spoken(page))
		.toEqual([
			{ text: "cow", lang: "en-GB" },
			{ text: "pig", lang: "en-GB" },
		]);
});

test("with reduced motion the creature stays put but still speaks", async ({
	page,
}) => {
	await page.emulateMedia({ reducedMotion: "reduce" });
	await installSpeechStub(page);
	await page.goto("./#/sound-safari");
	const sheep = page.getByRole("button", { name: "Sheep" });
	await sheep.tap();
	await expect(sheep).toHaveClass(/anim-bounce/);
	const name = await sheep
		.locator(".figure")
		.evaluate((el) => getComputedStyle(el).animationName);
	expect(name).toBe("safari-glow");
	await expect
		.poll(() => spoken(page))
		.toEqual([{ text: "sheep", lang: "en-GB" }]);
});

test("going home stops the speech and clears the scene", async ({ page }) => {
	await installSpeechStub(page);
	await page.goto("./#/sound-safari");
	await page.evaluate(() => {
		// Speech that never ends on its own; record cancel calls.
		const s = window.speechSynthesis as unknown as {
			speak: (u: SpeechSynthesisUtterance) => void;
			cancel: () => void;
		};
		s.speak = (u) => {
			if (u.text) window.__spoken.push({ text: u.text, lang: u.lang });
		};
		s.cancel = () => window.__spoken.push({ text: "<cancel>", lang: "" });
	});
	await page.getByRole("button", { name: "Tractor" }).tap();
	await expect(page.getByRole("button", { name: "Tractor" })).toHaveClass(
		/anim-drive/,
	);
	await expect
		.poll(() => spoken(page))
		.toEqual([{ text: "tractor", lang: "en-GB" }]);
	await page.evaluate(() => {
		location.hash = "#/";
	});
	await expect
		.poll(() => spoken(page))
		.toEqual([
			{ text: "tractor", lang: "en-GB" },
			{ text: "<cancel>", lang: "" },
		]);
	await expect(page.getByRole("heading", { name: "Kids games" })).toBeVisible();
	await expect(page.locator(".creature")).toHaveCount(0);
});

test("the hub shows the Sound safari tile @shot", async ({
	page,
}, testInfo) => {
	await page.goto("./");
	const tile = page.getByRole("link", { name: "Sound safari" });
	await expect(tile).toBeVisible();
	const box = await tile.boundingBox();
	expect(box?.width).toBeGreaterThanOrEqual(120);
	await page.screenshot({
		path: `screenshots/${testInfo.project.name}/hub-sound-safari.png`,
	});
	await tile.tap();
	await expect(page).toHaveURL(/#\/sound-safari$/);
	await expect(page.locator(".creature")).toHaveCount(6);
});

test("the scene fits an iPad held upright @shot", async ({
	page,
}, testInfo) => {
	await page.setViewportSize({ width: 810, height: 1080 });
	await page.goto("./#/sound-safari");
	for (const c of creatures) {
		const box = await page
			.getByRole("button", { name: label(c.en) })
			.boundingBox();
		if (!box) throw new Error(`${c.id} not visible`);
		expect(box.width).toBeGreaterThanOrEqual(120);
		expect(box.x).toBeGreaterThanOrEqual(0);
		expect(box.x + box.width).toBeLessThanOrEqual(810);
		expect(box.y + box.height).toBeLessThanOrEqual(1080);
	}
	await page.screenshot({
		path: `screenshots/${testInfo.project.name}/sound-safari-portrait.png`,
	});
});

test("a round is ROUND_TAPS taps, then the bus comes", async ({ page }) => {
	await installSpeechStub(page);
	await page.goto("./#/sound-safari");
	const bus = page.getByRole("img", { name: "The safari bus" });
	for (let i = 0; i < ROUND_TAPS - 1; i++) {
		const c = creatures[i % creatures.length];
		if (c) await page.locator(`[data-creature="${c.id}"]`).tap();
	}
	await expect(page.locator(".creature")).toHaveCount(6);
	await expect(bus).toHaveCount(0);
	await page.getByRole("button", { name: "Cow" }).tap();
	await expect(bus).toBeVisible();
});

test("after the last tap the bus takes everyone home @shot", async ({
	page,
}, testInfo) => {
	await installSpeechStub(page);
	await page.goto("./?e2e&safariTaps=3#/sound-safari");
	for (const name of ["Cow", "Pig", "Sheep"]) {
		await page.getByRole("button", { name }).tap();
	}
	const bus = page.getByRole("img", { name: "The safari bus" });
	await expect(bus).toBeVisible();
	// The bus stops in the meadow and everyone waves goodbye.
	await expect(bus).toHaveAttribute("data-step", "wave");
	await expect
		.poll(() => spoken(page))
		.toEqual([
			{ text: "cow", lang: "en-GB" },
			{ text: "pig", lang: "en-GB" },
			{ text: "sheep", lang: "en-GB" },
			{ text: "Bye bye!", lang: "en-GB" },
		]);
	const wave = await page
		.locator('[data-creature="duck"] .figure')
		.evaluate((el) => getComputedStyle(el).animationName);
	expect(wave).toBe("safari-wave");
	await page.screenshot({
		path: `screenshots/${testInfo.project.name}/sound-safari-bus.png`,
	});

	// A tap now does nothing: no movement, no name.
	const duck = page.getByRole("button", { name: "Duck" });
	await duck.tap();
	await expect(duck).not.toHaveClass(/anim-/);

	// The bus drives home, then the end screen shows.
	await expect(page.getByText("Well done for trying!")).toBeVisible({
		timeout: 10_000,
	});
	await expect(page.locator(".creature")).toHaveCount(0);
	await expect(bus).toHaveCount(0);

	// Taps where the scene was do nothing, and nothing starts again.
	await page.touchscreen.tap(540, 500);
	await page.touchscreen.tap(200, 700);
	await expect(page.getByText("Well done for trying!")).toBeVisible();
	await expect(page.locator(".creature")).toHaveCount(0);
	expect((await spoken(page)).map((s) => s.text)).toEqual([
		"cow",
		"pig",
		"sheep",
		"Bye bye!",
		"Well done for trying!",
	]);
	await expect(page).toHaveURL(/#\/sound-safari$/);
});

test("with reduced motion the bus stands still, then the round ends", async ({
	page,
}) => {
	await page.emulateMedia({ reducedMotion: "reduce" });
	await installSpeechStub(page);
	await page.goto("./?e2e&safariTaps=2#/sound-safari");
	await page.getByRole("button", { name: "Pig" }).tap();
	await page.getByRole("button", { name: "Tractor" }).tap();
	const bus = page.getByRole("img", { name: "The safari bus" });
	await expect(bus).toHaveAttribute("data-step", "wave");
	const motion = await bus.evaluate((el) => {
		const figure = document.querySelector('[data-creature="cow"] .figure');
		return {
			bus: getComputedStyle(el).animationName,
			busTransform: getComputedStyle(el).transform,
			creature: figure ? getComputedStyle(figure).animationName : "",
		};
	});
	expect(motion).toEqual({
		bus: "safari-hold",
		busTransform: "none",
		creature: "none",
	});
	await expect(page.getByText("Well done for trying!")).toBeVisible();
});
