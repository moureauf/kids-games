import { expect, test } from "@playwright/test";

test("hub loads @shot", async ({ page }, testInfo) => {
	await page.goto("./");
	await expect(page.getByRole("heading", { name: "Kids games" })).toBeVisible();
	await page.screenshot({
		path: `screenshots/${testInfo.project.name}/hub.png`,
	});
});
