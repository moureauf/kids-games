import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { expect, type Locator, type Page, test } from "@playwright/test";
import { serveCopyOfDist } from "./helpers/static-server";

// Press and keep the finger down on the element for `ms`, then lift.
async function hold(page: Page, target: Locator, ms: number) {
	const box = await target.boundingBox();
	if (!box) throw new Error("target not visible");
	await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
	await page.mouse.down();
	await page.waitForTimeout(ms);
	await page.mouse.up();
}

// Deploy "build B": change index.html and its revision in the precache list
// of sw.js, as a real new build does. The new sw.js makes the browser
// install a new service worker.
async function deployBuildB(dir: string) {
	const indexPath = join(dir, "index.html");
	const html = (await readFile(indexPath, "utf8")).replace(
		"</head>",
		'<meta name="build" content="B"></head>',
	);
	await writeFile(indexPath, html);
	const revision = createHash("md5").update(html).digest("hex");
	const swPath = join(dir, "sw.js");
	const sw = await readFile(swPath, "utf8");
	const next = sw.replace(
		/(url:"index\.html",revision:")[0-9a-f]+(")/,
		`$1${revision}$2`,
	);
	expect(next, "sw.js lists index.html with a revision").not.toBe(sw);
	await writeFile(swPath, next);
}

// The test uses its own server with a private copy of dist/, so it can
// deploy build B without changing the files of the other tests.
test("a new version shows on the hub, never in the middle of a game", async ({
	page,
	context,
}) => {
	const site = await serveCopyOfDist();
	try {
		// Build A is installed, and a later visit starts under its control.
		await page.goto(`${site.url}?e2e#/`);
		await page.evaluate(() => navigator.serviceWorker.ready);
		await page.waitForFunction(
			() => navigator.serviceWorker.controller !== null,
		);
		await page.reload();
		await expect(page.locator('meta[name="build"]')).toHaveCount(0);

		// A game is open when build B arrives.
		await page.getByRole("link", { name: "Test game" }).click();
		const finish = page.getByRole("button", { name: "Finish" });
		await expect(finish).toBeVisible();
		await page.evaluate(() => {
			(window as unknown as { buildA: boolean }).buildA = true;
		});

		await deployBuildB(site.dir);
		// The browser looks for a new sw.js (as it does on its own after a
		// navigation). Build B installs and takes control of this page.
		await page.evaluate(async () => {
			const changed = new Promise((resolve) =>
				navigator.serviceWorker.addEventListener("controllerchange", resolve, {
					once: true,
				}),
			);
			const reg = await navigator.serviceWorker.getRegistration();
			await reg?.update();
			await changed;
		});

		// The game is not reloaded: same page, same round.
		await page.waitForTimeout(500);
		await expect(finish).toBeVisible();
		expect(
			await page.evaluate(
				() => (window as unknown as { buildA?: boolean }).buildA,
			),
		).toBe(true);

		// The child goes home. The page reloads one time and shows build B,
		// from the new cache (the network is off).
		let loads = 0;
		page.on("load", () => {
			loads++;
		});
		await context.setOffline(true);
		await hold(page, page.getByRole("button", { name: "Home (hold)" }), 1300);
		await expect(page.locator('meta[name="build"]')).toHaveAttribute(
			"content",
			"B",
		);
		await expect(
			page.getByRole("heading", { name: "Kids games" }),
		).toBeVisible();
		await expect(page).toHaveURL(/#\/$/);
		expect(
			await page.evaluate(
				() => (window as unknown as { buildA?: boolean }).buildA,
			),
		).toBeUndefined();
		await page.waitForTimeout(500);
		expect(loads).toBe(1);
	} finally {
		await context.setOffline(false);
		await site.close();
	}
});
