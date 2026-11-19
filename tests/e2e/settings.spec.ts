import { expect, type Locator, type Page, test } from "@playwright/test";

const GATE_MS = 3000;
// A shortened hold for the fast tests; one test below uses the real 3 s.
const FAST_GATE_MS = 300;
const fastHub = `./?e2e&gateMs=${FAST_GATE_MS}`;

// Press and keep the finger down on the element for `ms`, then lift.
async function hold(page: Page, target: Locator, ms: number) {
	const box = await target.boundingBox();
	if (!box) throw new Error("target not visible");
	await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
	await page.mouse.down();
	await page.waitForTimeout(ms);
	await page.mouse.up();
}

const gate = (page: Page) =>
	page.getByRole("button", { name: "Settings for grown-ups (hold)" });
const panel = (page: Page) => page.getByRole("dialog", { name: "Settings" });
const french = (page: Page) =>
	page.getByRole("switch", { name: "French words" });

test("the parent gate is quiet but big enough to hold", async ({ page }) => {
	await page.goto("./");
	const box = await gate(page).boundingBox();
	expect(box?.width).toBeGreaterThanOrEqual(88);
	expect(box?.height).toBeGreaterThanOrEqual(88);
	await expect(panel(page)).toHaveCount(0);
});

test("a short tap or an early release does not open settings", async ({
	page,
}) => {
	await page.goto("./");
	await gate(page).click();
	await page.waitForTimeout(500);
	await expect(panel(page)).toHaveCount(0);

	// Lift after 2 s, then wait past 3 s: still closed.
	await hold(page, gate(page), 2000);
	await page.waitForTimeout(1500);
	await expect(panel(page)).toHaveCount(0);
});

test("a real 3-second hold opens settings", async ({ page }) => {
	test.slow();
	await page.goto("./");
	await hold(page, gate(page), GATE_MS + 300);
	await expect(panel(page)).toBeVisible();
	await expect(french(page)).toHaveAttribute("aria-checked", "false");
});

test("the French choice survives a reload @shot", async ({
	page,
}, testInfo) => {
	await page.goto(fastHub);
	await hold(page, gate(page), FAST_GATE_MS + 200);
	await expect(panel(page)).toBeVisible();
	await expect(french(page)).toBeFocused();

	await french(page).click();
	await expect(french(page)).toHaveAttribute("aria-checked", "true");
	await page.screenshot({
		path: `screenshots/${testInfo.project.name}/settings-panel.png`,
		animations: "disabled",
	});
	await page.getByRole("button", { name: "Done" }).click();
	await expect(panel(page)).toHaveCount(0);

	await page.reload();
	await hold(page, gate(page), FAST_GATE_MS + 200);
	await expect(french(page)).toHaveAttribute("aria-checked", "true");

	// Turn it off again; Escape also closes the panel.
	await french(page).click();
	await expect(french(page)).toHaveAttribute("aria-checked", "false");
	await page.keyboard.press("Escape");
	await expect(panel(page)).toHaveCount(0);
	await expect(gate(page)).toBeFocused();
	await page.reload();
	await hold(page, gate(page), FAST_GATE_MS + 200);
	await expect(french(page)).toHaveAttribute("aria-checked", "false");
});

test("the gate override only works in e2e mode", async ({ page }) => {
	await page.goto(`./?gateMs=${FAST_GATE_MS}`);
	await hold(page, gate(page), FAST_GATE_MS + 200);
	await page.waitForTimeout(300);
	await expect(panel(page)).toHaveCount(0);
});
