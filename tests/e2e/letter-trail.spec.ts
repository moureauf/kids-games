import { expect, type Page, test } from "@playwright/test";
import type { Point } from "../../src/games/letter-trail/geometry";
import { letters } from "../../src/games/letter-trail/letters";
import { installSpeechStub, spoken } from "./helpers/speech-stub";

const PRAISE = "What careful tracing. Well done!";
const a = letters.a;
if (!a) throw new Error("no glyph a");

/** Glyph units to screen pixels, with the board's own transform. */
async function toScreen(page: Page, points: Point[]): Promise<Point[]> {
	return page.locator(".trail-board").evaluate((svg, pts) => {
		const m = (svg as SVGSVGElement).getScreenCTM();
		if (!m) throw new Error("no CTM");
		return pts.map((p) => {
			const s = new DOMPoint(p.x, p.y).matrixTransform(m);
			return { x: s.x, y: s.y };
		});
	}, points);
}

/** Extra points so no step is longer than `step` units, like a real finger. */
function dense(points: Point[], step = 0.04): Point[] {
	const out: Point[] = [];
	points.forEach((p, i) => {
		const prev = points[i - 1];
		if (prev) {
			const n = Math.ceil(Math.hypot(p.x - prev.x, p.y - prev.y) / step);
			for (let k = 1; k < n; k++) {
				out.push({
					x: prev.x + ((p.x - prev.x) * k) / n,
					y: prev.y + ((p.y - prev.y) * k) / n,
				});
			}
		}
		out.push(p);
	});
	return out;
}

/** Drags one finger (a primary pointer) through the points. */
async function drag(page: Page, points: Point[]): Promise<void> {
	const screen = await toScreen(page, dense(points));
	const first = screen[0];
	if (!first) return;
	await page.mouse.move(first.x, first.y);
	await page.mouse.down();
	for (const p of screen.slice(1)) await page.mouse.move(p.x, p.y);
	await page.mouse.up();
}

const board = (page: Page) => page.locator(".trail");

test("the letter screen shows guide lines, the letter and a start dot @shot", async ({
	page,
}, testInfo) => {
	await page.goto("./#/letter-trail");
	await expect(board(page)).toBeVisible();
	await expect(page.locator(".trail-guides line")).toHaveCount(2);
	await expect(page.locator(".trail-letter path")).toHaveCount(
		a.strokes.length,
	);
	await expect(page.locator(".trail-dot")).toBeVisible();
	// The demo runs once, then the child's turn.
	await expect(board(page)).toHaveAttribute("data-state", "ready", {
		timeout: 10_000,
	});

	// x-height of about 250 CSS px on the iPad in landscape.
	const [top, base] = await toScreen(page, [
		{ x: 0, y: 0.9 },
		{ x: 0, y: 1.9 },
	]);
	const xHeight = (base?.y ?? 0) - (top?.y ?? 0);
	expect(xHeight).toBeGreaterThan(220);
	expect(xHeight).toBeLessThanOrEqual(251);
	await page.screenshot({
		path: `screenshots/${testInfo.project.name}/letter-trail.png`,
	});
});

test("tracing a along its strokes completes the letter @shot", async ({
	page,
}, testInfo) => {
	await installSpeechStub(page);
	await page.goto("./#/letter-trail");
	await expect(board(page)).toBeVisible();

	const [bowl, stick] = a.strokes;
	if (!bowl || !stick) throw new Error("a has two strokes");
	await drag(page, bowl);
	await expect(board(page)).toHaveAttribute("data-stroke", "1");
	await expect(page.locator('.trail-rainbow[data-stroke="0"]')).toBeVisible();
	await drag(page, stick);

	await expect(board(page)).toHaveAttribute("data-state", "done");
	await expect(board(page)).toHaveClass(/happy/);
	await expect
		.poll(() => spoken(page))
		.toEqual([{ text: PRAISE, lang: "en-GB" }]);
	// Let the unicorn trot to its place and finish its happy hops.
	await page.waitForTimeout(2000);
	await page.screenshot({
		path: `screenshots/${testInfo.project.name}/letter-trail-done.png`,
	});
	// Nothing new starts by itself: the screen stays until the child goes home.
	await expect(board(page)).toHaveAttribute("data-state", "done");
});

test("the rainbow follows a trace in progress @shot", async ({
	page,
}, testInfo) => {
	await page.goto("./#/letter-trail");
	const bowl = a.strokes[0] ?? [];
	const screen = await toScreen(page, bowl.slice(0, 45));
	const first = screen[0];
	if (!first) throw new Error("empty");
	await page.mouse.move(first.x, first.y);
	await page.mouse.down();
	for (const p of screen.slice(1)) await page.mouse.move(p.x, p.y);
	await expect(board(page)).toHaveAttribute("data-state", "tracing");
	await expect(page.locator('.trail-rainbow[data-stroke="0"]')).toBeVisible();
	await page.screenshot({
		path: `screenshots/${testInfo.project.name}/letter-trail-tracing.png`,
	});
	await page.mouse.up();
	// Stopped early: no penalty, the rainbow fades and the start dot is back.
	await expect(board(page)).toHaveAttribute("data-state", "ready");
	await expect(page.locator('.trail-rainbow[data-stroke="0"]')).toBeHidden();
	await expect(page.locator(".trail-dot")).toBeVisible();
});

test("a wrong trace gets no penalty and no sound", async ({ page }) => {
	await installSpeechStub(page);
	await page.goto("./#/letter-trail");
	const bowl = a.strokes[0] ?? [];
	// Backwards, from the end of the stroke to its start.
	await drag(page, [...bowl].reverse());
	await expect(board(page)).toHaveAttribute("data-state", "ready");
	await expect(board(page)).toHaveAttribute("data-stroke", "0");
	await expect(page.locator(".trail-dot.pulse")).toBeVisible();
	await expect(page.locator('.trail-rainbow[data-stroke="0"]')).toBeHidden();
	expect(await spoken(page)).toEqual([]);
	// The next go can still succeed.
	await drag(page, bowl);
	await expect(board(page)).toHaveAttribute("data-stroke", "1");
});

test("the hub shows the letter trail tile", async ({ page }) => {
	await page.goto("./");
	const tile = page.getByRole("link", { name: "Unicorn letter trail" });
	await expect(tile).toBeVisible();
	const box = await tile.boundingBox();
	expect(box?.width).toBeGreaterThanOrEqual(88);
	await tile.tap();
	await expect(page).toHaveURL(/#\/letter-trail$/);
	await expect(board(page)).toBeVisible();
});

test("with reduced motion there is no demo, the arrows show the way", async ({
	page,
}) => {
	await page.emulateMedia({ reducedMotion: "reduce" });
	await page.goto("./#/letter-trail");
	await expect(board(page)).toHaveAttribute("data-state", "ready");
	await expect(page.locator(".trail-arrows")).toBeVisible();
	await expect(page.locator(".trail-spark")).toBeHidden();
});

test("going home stops the speech and clears the screen", async ({ page }) => {
	await installSpeechStub(page);
	await page.goto("./#/letter-trail");
	await page.evaluate(() => {
		const s = window.speechSynthesis as unknown as { cancel: () => void };
		s.cancel = () => window.__spoken.push({ text: "<cancel>", lang: "" });
	});
	await page.evaluate(() => {
		location.hash = "#/";
	});
	await expect(page.getByRole("heading", { name: "Kids games" })).toBeVisible();
	await expect(board(page)).toHaveCount(0);
	expect(await spoken(page)).toContainEqual({ text: "<cancel>", lang: "" });
});

test("the letter fits an iPad held upright", async ({ page }) => {
	await page.setViewportSize({ width: 810, height: 1080 });
	await page.goto("./#/letter-trail");
	const corners = await toScreen(page, [
		{ x: 0, y: 0.9 },
		{ x: a.width, y: 1.9 },
	]);
	for (const c of corners) {
		expect(c.x).toBeGreaterThan(0);
		expect(c.x).toBeLessThan(810);
		expect(c.y).toBeGreaterThan(136); // below the home button
		expect(c.y).toBeLessThan(1080);
	}
});
