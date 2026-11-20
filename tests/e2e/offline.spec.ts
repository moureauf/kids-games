import { expect, test } from "@playwright/test";
import { creatures } from "../../src/games/sound-safari/creatures";
import { installSpeechStub, spoken } from "./helpers/speech-stub";

// After one visit with network, the whole site must work offline.
// Every game is added to this test when it is built.
test("works offline after the first load @shot", async ({
	page,
	context,
}, testInfo) => {
	await installSpeechStub(page);
	await page.goto("./");
	// The service worker has cached everything once it controls the page.
	await page.evaluate(() => navigator.serviceWorker.ready);
	await page.waitForFunction(() => navigator.serviceWorker.controller !== null);

	await context.setOffline(true);
	await page.reload();

	await expect(page.getByRole("heading", { name: "Kids games" })).toBeVisible();
	await page.screenshot({
		path: `screenshots/${testInfo.project.name}/hub-offline.png`,
	});

	// Every route still works offline: a game, its end screen, and home.
	await page.goto("./?e2e#/");
	await page.getByRole("link", { name: "Test game" }).click();
	await page.getByRole("button", { name: "Finish" }).click();
	await expect(page.getByText("Well done for trying!")).toBeVisible();
	await expect
		.poll(async () => (await spoken(page)).map((s) => s.text))
		.toEqual(["Well done for trying!"]);
	await page.getByRole("button", { name: "Home" }).click();
	await expect(page.getByRole("link", { name: "Test game" })).toBeVisible();

	// Sound safari: every creature moves and says its name offline.
	await page.getByRole("link", { name: "Sound safari" }).click();
	await expect(page.locator(".creature")).toHaveCount(6);
	for (const c of creatures) {
		const button = page.locator(`[data-creature="${c.id}"]`);
		await button.tap();
		await expect(button).toHaveClass(new RegExp(`anim-${c.animation}`));
	}
	await expect
		.poll(async () => (await spoken(page)).map((s) => s.text))
		.toEqual(["Well done for trying!", ...creatures.map((c) => c.en)]);

	// Settings open behind the parent gate and save offline.
	await page.goto("./?e2e&gateMs=200#/");
	const french = page.getByRole("switch", { name: "French words" });
	const openSettings = async () => {
		await page.getByRole("button", { name: /^Settings for grown-ups/ }).hover();
		await page.mouse.down();
		await expect(french).toBeVisible();
		await page.mouse.up();
	};
	await openSettings();
	await french.click();
	await page.getByRole("button", { name: "Done" }).click();
	await page.reload();
	await openSettings();
	await expect(french).toHaveAttribute("aria-checked", "true");
});

test("is installable on the iPad", async ({ page, request }) => {
	await page.goto("./");

	const manifestHref = await page
		.locator('link[rel="manifest"]')
		.getAttribute("href");
	expect(manifestHref).toBeTruthy();
	const manifest = await (
		await request.get(new URL(manifestHref ?? "", page.url()).href)
	).json();
	expect(manifest).toMatchObject({
		name: "Kids games",
		display: "standalone",
		start_url: "/kids-games/",
		scope: "/kids-games/",
	});
	const sizes = manifest.icons.map((i: { sizes: string }) => i.sizes);
	expect(sizes).toEqual(expect.arrayContaining(["192x192", "512x512"]));
	for (const icon of manifest.icons as { src: string }[]) {
		expect((await request.get(new URL(icon.src, page.url()).href)).ok()).toBe(
			true,
		);
	}

	const touchIcon = await page
		.locator('link[rel="apple-touch-icon"]')
		.getAttribute("href");
	expect(
		(await request.get(new URL(touchIcon ?? "", page.url()).href)).ok(),
	).toBe(true);
	await expect(
		page.locator('meta[name="apple-mobile-web-app-capable"]'),
	).toHaveAttribute("content", "yes");
});
