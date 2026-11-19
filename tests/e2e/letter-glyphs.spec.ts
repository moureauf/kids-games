import { expect, test } from "@playwright/test";
import { pointAt } from "../../src/games/letter-trail/geometry";
import {
	BASELINE,
	BOX_HEIGHT,
	LETTER_GAP,
	letters,
	X_HEIGHT,
} from "../../src/games/letter-trail/letters";

// A preview of the letter data only (no game screen yet): every glyph with
// its guide lines, stroke order, arrows and start dots. The real letter
// screen comes later and gets its own tests.
function sheet(): string {
	const order = ["L", "c", "o", "a", "e", "é"];
	const pad = 0.4;
	let x = pad;
	const parts: string[] = [];
	for (const char of order) {
		const g = letters[char];
		if (!g) continue;
		const out: string[] = [];
		for (const stroke of g.strokes) {
			const d = stroke
				.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(3)} ${p.y.toFixed(3)}`)
				.join("");
			out.push(
				`<path d="${d}" fill="none" stroke="#c9bfe8" stroke-width="0.17" stroke-linecap="round" stroke-linejoin="round"/>`,
			);
		}
		g.strokes.forEach((stroke, i) => {
			for (const f of g.arrows[i] ?? []) {
				const { point, angle } = pointAt(stroke, f);
				out.push(
					`<path d="M0.1 0L-0.08 0.09L-0.08 -0.09Z" fill="#5a4a8a" transform="translate(${point.x} ${point.y}) rotate(${(angle * 180) / Math.PI})"/>`,
				);
			}
			const start = stroke[0];
			if (!start) return;
			out.push(
				`<circle cx="${start.x}" cy="${start.y}" r="0.09" fill="#2e8b57"/>`,
			);
			const label = g.labels?.[i];
			if (label) {
				out.push(
					`<text x="${start.x + label.x}" y="${start.y + label.y + 0.08}" font-size="0.24" font-family="sans-serif" font-weight="bold" text-anchor="middle" fill="#5a4a8a">${i + 1}</text>`,
				);
			}
		});
		parts.push(
			`<g data-char="${char}" transform="translate(${x} ${pad})">${out.join("")}</g>`,
		);
		x += g.width + LETTER_GAP * 2;
	}
	const width = x - LETTER_GAP * 2 + pad;
	const height = BOX_HEIGHT + pad * 2;
	const line = (y: number, dash = "") =>
		`<line x1="0" x2="${width}" y1="${y + pad}" y2="${y + pad}" stroke="#999" stroke-width="0.015" ${dash}/>`;
	return `<!DOCTYPE html><html><body style="margin:0;background:#fff7e8;display:grid;place-items:center;height:100vh">
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="95%">
${line(0)}${line(BASELINE - X_HEIGHT, 'stroke-dasharray="0.05 0.05"')}${line(BASELINE)}
${parts.join("\n")}
</svg></body></html>`;
}

test("letter data renders with start dots @shot", async ({
	page,
}, testInfo) => {
	await page.setContent(sheet());
	await expect(page.locator("g[data-char]")).toHaveCount(6);
	await expect(page.locator("circle")).toHaveCount(8);
	await page.screenshot({
		path: `screenshots/${testInfo.project.name}/letter-glyphs.png`,
	});
});
