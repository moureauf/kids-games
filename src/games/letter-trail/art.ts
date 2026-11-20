// Original art for the letter trail, drawn for this repo: a round, chunky
// unicorn in the same style as the Sound safari creatures (thick soft
// outlines, colours from src/style.css). It is drawn facing right in a
// 200 x 200 box with its hooves on y = 180.

const INK = "#2b2140";
const SUN = "#ffc94d";
const CORAL = "#ff7a59";
const WHITE = "#ffffff";
const LILAC = "#e9e0ff";
const MUZZLE = "#ffe1ec";
const BLUSH = `fill="${CORAL}" opacity="0.35"`;

/** Rainbow colours, outside band first. */
export const RAINBOW = [
	"#ff6b6b",
	"#ffa94d",
	"#ffd43b",
	"#69db7c",
	"#4dabf7",
	"#9775fa",
];

/** Thick, soft outline. */
const O = `stroke="${INK}" stroke-width="6" stroke-linejoin="round" stroke-linecap="round"`;

/** A thick coloured strand with an ink outline (mane, tail). */
function strand(d: string, colour: string, width: number): string {
	return `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${width + 10}" stroke-linecap="round"/>
	<path d="${d}" fill="none" stroke="${colour}" stroke-width="${width}" stroke-linecap="round"/>`;
}

function leg(x: number, fill: string): string {
	return `<rect x="${x}" y="122" width="20" height="56" rx="10" fill="${fill}" ${O}/>
	<path d="M${x} 164 h20 v2 a10 10 0 0 1 -20 0 z" fill="#b58cff"/>`;
}

function star(x: number, y: number, r: number): string {
	const p = (a: number, d: number) =>
		`${(x + d * Math.cos(a)).toFixed(1)} ${(y + d * Math.sin(a)).toFixed(1)}`;
	const points: string[] = [];
	for (let i = 0; i < 10; i++) {
		const a = -Math.PI / 2 + (i * Math.PI) / 5;
		points.push(p(a, i % 2 ? r * 0.45 : r));
	}
	return `<path d="M${points.join(" L")} Z" fill="${SUN}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`;
}

const neck = `<path d="M116 100 C120 76 130 60 144 50 L172 64 C162 80 158 98 158 118 Z" fill="${WHITE}" ${O}/>`;

const head = `
	${strand("M146 40 C126 42 116 58 118 78", "#ff9ecf", 16)}
	${strand("M136 60 C124 64 116 74 117 86", "#b58cff", 14)}
	<path d="M144 44 L140 18 L160 36 Z" fill="${WHITE}" ${O}/>
	<path d="M146 38 L144 26 L153 35 Z" fill="#ffbfd9"/>
	<ellipse cx="158" cy="66" rx="30" ry="27" fill="${WHITE}" ${O}/>
	<path d="M152 44 L168 4 L176 42 Z" fill="${SUN}" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>
	<path d="M156 34 q7 3 15 -1 M160 23 q5 2 10 -1" fill="none" stroke="#e0a21f" stroke-width="3" stroke-linecap="round"/>
	${strand("M148 48 Q158 40 170 46", "#ff9ecf", 10)}
	<ellipse cx="178" cy="82" rx="18" ry="14" fill="${MUZZLE}" ${O}/>
	<circle cx="186" cy="78" r="2.5" fill="${INK}"/>
	<circle cx="150" cy="80" r="6" ${BLUSH}/>
	<g class="face-calm">
		<circle cx="162" cy="64" r="6" fill="${INK}"/><circle cx="164" cy="62" r="2.3" fill="${WHITE}"/>
		<path d="M172 90 q6 4 12 0" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>
	</g>
	<g class="face-happy">
		<path d="M155 66 q7 -9 14 0" fill="none" stroke="${INK}" stroke-width="4.5" stroke-linecap="round"/>
		<path d="M170 87 q8 10 16 0 z" fill="${INK}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
	</g>`;

/** The whole unicorn, hooves on y = 180. The happy face and the sparkles
 * show only inside an element with the class `happy`. */
export const unicornArt = `
	${strand("M44 100 C20 92 8 116 20 136 C28 150 18 160 8 158", "#ff9ecf", 14)}
	${strand("M44 110 C28 116 26 136 36 150 C42 160 34 168 24 168", "#b58cff", 12)}
	${strand("M46 118 C38 128 42 142 50 150", "#6f8cff", 10)}
	${leg(66, LILAC)}${leg(124, LILAC)}
	${leg(46, WHITE)}${leg(104, WHITE)}
	${neck}
	<ellipse cx="94" cy="112" rx="60" ry="36" fill="${WHITE}" ${O}/>
	<ellipse cx="80" cy="98" rx="24" ry="9" fill="${LILAC}" opacity="0.7"/>
	${head}
	<g class="sparkles">${star(20, 40, 14)}${star(186, 132, 10)}${star(100, 20, 9)}</g>`;

/** Hub tile: the unicorn under a rainbow. */
export const tileSvg = `
<svg viewBox="0 0 200 200" aria-hidden="true" focusable="false">
	<rect width="200" height="200" fill="#ffeef6"/>
	<g fill="none" stroke-width="12">
		${RAINBOW.map((c, i) => `<path d="M${16 + i * 11} 150 A${84 - i * 11} ${84 - i * 11} 0 0 1 ${184 - i * 11} 150" stroke="${c}"/>`).join("")}
	</g>
	<rect y="176" width="200" height="24" fill="#c9f0e2"/>
	<g fill="${WHITE}"><circle cx="18" cy="150" r="16"/><circle cx="38" cy="156" r="14"/><circle cx="182" cy="150" r="16"/><circle cx="162" cy="156" r="14"/></g>
	<g transform="translate(40 66) scale(0.62)">${unicornArt}</g>
	${star(36, 40, 10)}${star(168, 30, 8)}
</svg>`;
