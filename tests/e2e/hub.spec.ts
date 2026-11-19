import { expect, type Locator, type Page, test } from "@playwright/test";

const HOLD_MS = 1000;

// Press and keep the finger down on the element for `ms`, then lift.
async function hold(page: Page, target: Locator, ms: number) {
	const box = await target.boundingBox();
	if (!box) throw new Error("target not visible");
	await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
	await page.mouse.down();
	await page.waitForTimeout(ms);
	await page.mouse.up();
}

test("hub loads @shot", async ({ page }, testInfo) => {
	await page.goto("./?e2e");
	await expect(page.getByRole("heading", { name: "Kids games" })).toBeVisible();
	await expect(page.getByRole("link", { name: "Test game" })).toBeVisible();
	await page.screenshot({
		path: `screenshots/${testInfo.project.name}/hub.png`,
	});
});

test("hub tiles are big enough for small fingers", async ({ page }) => {
	await page.goto("./?e2e");
	const box = await page.getByRole("link", { name: "Test game" }).boundingBox();
	expect(box?.width).toBeGreaterThanOrEqual(120);
	expect(box?.height).toBeGreaterThanOrEqual(120);
});

test("the test game is hidden without ?e2e", async ({ page }) => {
	await page.goto("./#/test");
	await expect(page.getByRole("heading", { name: "Kids games" })).toBeVisible();
	await expect(page.getByRole("link", { name: "Test game" })).toHaveCount(0);
	await expect(page).toHaveURL(/#\/$/);
});

test("tap a tile, then hold home to go back @shot", async ({
	page,
}, testInfo) => {
	await page.goto("./?e2e");
	await page.getByRole("link", { name: "Test game" }).click();

	await expect(page).toHaveURL(/#\/test$/);
	await expect(page.getByRole("button", { name: "Finish" })).toBeVisible();
	const home = page.getByRole("button", { name: "Home (hold)" });
	await expect(home).toBeVisible();
	const box = await home.boundingBox();
	expect(box?.width).toBeGreaterThanOrEqual(120);
	await page.screenshot({
		path: `screenshots/${testInfo.project.name}/game-view.png`,
	});

	// A quick tap does nothing.
	await home.click();
	await page.waitForTimeout(HOLD_MS + 200);
	await expect(page.getByRole("button", { name: "Finish" })).toBeVisible();

	// A short hold goes home.
	await hold(page, home, HOLD_MS + 300);
	await expect(page.getByRole("heading", { name: "Kids games" })).toBeVisible();
	await expect(page).toHaveURL(/#\/$/);
	await expect(page.getByRole("button", { name: "Finish" })).toHaveCount(0);
});

test("unknown routes go to the hub", async ({ page }) => {
	await page.goto("./?e2e#/no-such-game");
	await expect(page.getByRole("heading", { name: "Kids games" })).toBeVisible();
	await expect(page).toHaveURL(/#\/$/);
});

test("end-of-round screen is calm and only goes home on a tap @shot", async ({
	page,
}, testInfo) => {
	await page.goto("./?e2e#/test");
	await page.getByRole("button", { name: "Finish" }).click();

	const end = page.getByRole("region", { name: "End of round" });
	await expect(end).toBeVisible();
	await expect(end.getByText("Well done for trying!")).toBeVisible();
	// The game is gone and nothing restarts on its own.
	await expect(page.getByRole("button", { name: "Finish" })).toHaveCount(0);
	await page.screenshot({
		path: `screenshots/${testInfo.project.name}/end-screen.png`,
	});
	await page.waitForTimeout(1500);
	await expect(end).toBeVisible();
	await expect(page).toHaveURL(/#\/test$/);

	const home = end.getByRole("button", { name: "Home" });
	const box = await home.boundingBox();
	expect(box?.width).toBeGreaterThanOrEqual(120);
	await home.click();
	await expect(page.getByRole("heading", { name: "Kids games" })).toBeVisible();
});
