import { expect, test } from "@playwright/test";

// After one visit with network, the whole site must work offline.
// Every game is added to this test when it is built.
test("works offline after the first load @shot", async ({
	page,
	context,
}, testInfo) => {
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
