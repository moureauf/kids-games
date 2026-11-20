// Original art for Sound safari, drawn for this repo. Round shapes, thick
// soft outlines, colours from src/style.css. Each creature is drawn facing
// right in a 200 x 200 box with its feet on y = 180.

const INK = "#2b2140";
const SUN = "#ffc94d";
const CORAL = "#ff7a59";
const MINT = "#5cc8a8";
const WHITE = "#ffffff";
const PINK = "#ffbfae";
const BLUSH = `fill="${CORAL}" opacity="0.35"`;

/** Thick, soft outline. */
const O = `stroke="${INK}" stroke-width="6" stroke-linejoin="round" stroke-linecap="round"`;

/** A friendly eye with a shine. */
function eye(x: number, y: number, r = 6): string {
	return `<circle cx="${x}" cy="${y}" r="${r}" fill="${INK}"/><circle cx="${x + r * 0.35}" cy="${y - r * 0.4}" r="${r * 0.38}" fill="${WHITE}"/>`;
}

function smile(x: number, y: number, w = 12): string {
	return `<path d="M${x - w / 2} ${y} q${w / 2} ${w * 0.55} ${w} 0" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>`;
}

const cowHead = `
	<path d="M144 44 q-4 -14 4 -18 q4 8 6 16" fill="${SUN}" ${O}/>
	<path d="M180 44 q4 -14 -4 -18 q-4 8 -6 16" fill="${SUN}" ${O}/>
	<ellipse cx="130" cy="56" rx="15" ry="8" transform="rotate(-24 130 56)" fill="${PINK}" ${O}/>
	<ellipse cx="194" cy="56" rx="15" ry="8" transform="rotate(24 194 56)" fill="${PINK}" ${O}/>
	<ellipse cx="162" cy="66" rx="30" ry="30" fill="${WHITE}" ${O}/>
	<path d="M146 42 q10 -4 16 6 q-6 12 -18 6 z" fill="${INK}"/>
	<circle cx="145" cy="76" r="5" ${BLUSH}/><circle cx="179" cy="76" r="5" ${BLUSH}/>
	<ellipse cx="162" cy="92" rx="26" ry="17" fill="${PINK}" ${O}/>
	<ellipse cx="153" cy="91" rx="3.5" ry="4.5" fill="${INK}"/>
	<ellipse cx="171" cy="91" rx="3.5" ry="4.5" fill="${INK}"/>
	${eye(150, 66)}${eye(174, 66)}`;

const cow = `
	<path d="M40 92 C 22 100 20 122 26 140" fill="none" stroke="${INK}" stroke-width="6" stroke-linecap="round"/>
	<path d="M18 136 q8 -8 16 0 q-2 14 -8 14 q-6 0 -8 -14 z" fill="${INK}"/>
	<rect x="66" y="118" width="20" height="58" rx="10" fill="#ece4f2" ${O}/>
	<rect x="126" y="118" width="20" height="58" rx="10" fill="#ece4f2" ${O}/>
	<rect x="46" y="118" width="20" height="58" rx="10" fill="${WHITE}" ${O}/>
	<rect x="106" y="118" width="20" height="58" rx="10" fill="${WHITE}" ${O}/>
	<path d="M46 164 h20 v2 a10 10 0 0 1 -20 0 z M106 164 h20 v2 a10 10 0 0 1 -20 0 z" fill="${INK}"/>
	<rect x="32" y="66" width="126" height="76" rx="38" fill="${WHITE}" ${O}/>
	<path d="M62 80 q16 -6 22 8 q4 16 -12 20 q-16 2 -16 -12 q0 -10 6 -16 z" fill="${INK}"/>
	<path d="M106 112 q12 -6 18 4 q2 12 -10 14 q-12 0 -12 -8 q0 -6 4 -10 z" fill="${INK}"/>
	<ellipse cx="96" cy="144" rx="12" ry="6" fill="${PINK}" ${O}/>
	${cowHead}`;

const sheepBumps = [
	[50, 106],
	[62, 78],
	[90, 64],
	[120, 66],
	[146, 82],
	[152, 110],
	[138, 134],
	[110, 142],
	[80, 142],
	[56, 130],
]
	.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="22"/>`)
	.join("");

const sheep = `
	<rect x="62" y="124" width="14" height="54" rx="7" fill="${INK}"/>
	<rect x="122" y="124" width="14" height="54" rx="7" fill="${INK}"/>
	<rect x="78" y="124" width="14" height="54" rx="7" fill="#4a3d63"/>
	<rect x="106" y="124" width="14" height="54" rx="7" fill="#4a3d63"/>
	<g fill="${WHITE}" ${O}>${sheepBumps}</g>
	<ellipse cx="100" cy="104" rx="56" ry="38" fill="${WHITE}"/>
	<ellipse cx="80" cy="92" rx="14" ry="8" fill="#f1ecf7"/>
	<ellipse cx="140" cy="80" rx="14" ry="8" transform="rotate(-20 140 80)" fill="#4a3d63" ${O}/>
	<ellipse cx="190" cy="80" rx="14" ry="8" transform="rotate(20 190 80)" fill="#4a3d63" ${O}/>
	<ellipse cx="165" cy="94" rx="24" ry="28" fill="#4a3d63" ${O}/>
	<g fill="${WHITE}" ${O}><circle cx="154" cy="68" r="11"/><circle cx="168" cy="64" r="11"/><circle cx="180" cy="70" r="9"/></g>
	<circle cx="156" cy="92" r="7" fill="${WHITE}"/><circle cx="174" cy="92" r="7" fill="${WHITE}"/>
	${eye(157, 93, 4)}${eye(175, 93, 4)}
	<path d="M159 108 q6 5 12 0" fill="none" stroke="${WHITE}" stroke-width="4" stroke-linecap="round"/>`;

const pig = `
	<path d="M38 104 c-14 -4 -18 12 -8 14 c10 2 10 -12 -2 -14 c-8 -1 -12 4 -12 8" fill="none" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>
	<rect x="62" y="134" width="22" height="44" rx="11" fill="#f4a690" ${O}/>
	<rect x="114" y="134" width="22" height="44" rx="11" fill="#f4a690" ${O}/>
	<rect x="44" y="134" width="22" height="44" rx="11" fill="${PINK}" ${O}/>
	<rect x="96" y="134" width="22" height="44" rx="11" fill="${PINK}" ${O}/>
	<ellipse cx="94" cy="112" rx="64" ry="44" fill="${PINK}" ${O}/>
	<ellipse cx="74" cy="96" rx="20" ry="10" fill="${WHITE}" opacity="0.45"/>
	<path d="M136 74 l-4 -26 l22 12 z" fill="#f4a690" ${O}/>
	<path d="M176 74 l6 -26 l-22 10 z" fill="#f4a690" ${O}/>
	<circle cx="156" cy="96" r="32" fill="${PINK}" ${O}/>
	<ellipse cx="176" cy="104" rx="17" ry="14" fill="#ff9c84" ${O}/>
	<ellipse cx="171" cy="104" rx="3" ry="4.5" fill="${INK}"/>
	<ellipse cx="181" cy="104" rx="3" ry="4.5" fill="${INK}"/>
	${eye(146, 88)}${eye(166, 82, 5)}
	<circle cx="138" cy="104" r="6" ${BLUSH}/>
	${smile(150, 116, 10)}`;

const duck = `
	<path d="M76 156 v18 M108 156 v18" stroke="${CORAL}" stroke-width="8" stroke-linecap="round"/>
	<path d="M60 178 q16 -16 32 0 z M92 178 q16 -16 32 0 z" fill="${CORAL}" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>
	<path d="M40 122 L22 90 L62 104 Z" fill="${SUN}" ${O}/>
	<ellipse cx="92" cy="128" rx="60" ry="38" fill="${SUN}" ${O}/>
	<path d="M44 112 l18 -6 l2 12 z" fill="${SUN}"/>
	<circle cx="138" cy="74" r="32" fill="${SUN}" ${O}/>
	<path d="M120 102 q10 10 30 4 l-6 -10 z" fill="${SUN}"/>
	<path d="M64 120 q30 -18 60 2 q-26 26 -60 -2 z" fill="#f2ad2e" ${O}/>
	<path d="M162 72 q28 0 30 10 q-6 12 -32 8 z" fill="${CORAL}" ${O}/>
	<path d="M164 82 q12 2 26 0" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>
	${eye(146, 64)}
	<circle cx="134" cy="84" r="6" ${BLUSH}/>
	<path d="M126 44 q2 -12 12 -12 q-2 6 2 10" fill="${SUN}" ${O}/>`;

/** A wheel that spins while the tractor drives (class "wheel"). */
function wheel(cx: number, cy: number, r: number): string {
	const hub = r * 0.42;
	return `<g class="wheel">
		<circle cx="${cx}" cy="${cy}" r="${r}" fill="${INK}"/>
		<circle cx="${cx}" cy="${cy}" r="${r - 7}" fill="none" stroke="#4a3d63" stroke-width="4" stroke-dasharray="6 6"/>
		<circle cx="${cx}" cy="${cy}" r="${hub}" fill="${SUN}" ${O}/>
		<path d="M${cx - hub} ${cy} H${cx + hub} M${cx} ${cy - hub} V${cy + hub}" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>
	</g>`;
}

const tractor = `
	<rect x="152" y="68" width="10" height="40" rx="5" fill="#4a3d63" ${O}/>
	<path d="M148 66 h18" stroke="${INK}" stroke-width="6" stroke-linecap="round"/>
	<rect x="44" y="50" width="62" height="84" rx="14" fill="${CORAL}" ${O}/>
	<rect x="56" y="60" width="38" height="28" rx="8" fill="#cfe0ff" ${O}/>
	<path d="M62 70 l10 -2 l-10 14 z" fill="${WHITE}" opacity="0.8"/>
	<rect x="36" y="38" width="78" height="16" rx="8" fill="${SUN}" ${O}/>
	<rect x="94" y="96" width="92" height="48" rx="16" fill="${CORAL}" ${O}/>
	<path d="M120 108 v24 M134 108 v24 M148 108 v24" stroke="#d9573a" stroke-width="5" stroke-linecap="round"/>
	<circle cx="176" cy="114" r="7" fill="${SUN}" ${O}/>
	${wheel(66, 136, 42)}
	${wheel(158, 156, 24)}`;

const dinosaur = `
	<path d="M42 116 Q14 128 4 164 Q30 150 50 140 Z" fill="${MINT}" ${O}/>
	<rect x="62" y="134" width="22" height="44" rx="11" fill="#47b293" ${O}/>
	<rect x="114" y="134" width="22" height="44" rx="11" fill="#47b293" ${O}/>
	<path d="M116 110 Q122 70 140 46 L166 54 Q148 82 146 126 Z" fill="${MINT}" ${O}/>
	<ellipse cx="88" cy="118" rx="60" ry="38" fill="${MINT}" ${O}/>
	<path d="M120 102 q6 -16 18 -38 l10 6 q-10 22 -12 40 z" fill="${MINT}"/>
	<ellipse cx="88" cy="128" rx="34" ry="12" fill="#c9f0e2"/>
	<rect x="44" y="136" width="22" height="42" rx="11" fill="${MINT}" ${O}/>
	<rect x="96" y="136" width="22" height="42" rx="11" fill="${MINT}" ${O}/>
	<g fill="${SUN}" ${O}>
		<circle cx="60" cy="88" r="8"/><circle cx="84" cy="80" r="9"/><circle cx="110" cy="84" r="8"/>
	</g>
	<ellipse cx="160" cy="44" rx="30" ry="22" fill="${MINT}" ${O}/>
	<circle cx="184" cy="40" r="2.5" fill="${INK}"/>
	${eye(156, 36, 6)}
	<circle cx="150" cy="52" r="5" ${BLUSH}/>
	<path d="M166 54 q10 6 18 -2" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>`;

/** Creature art by id: the inside of a 200 x 200 SVG, feet on y = 180. */
export const creatureArt: Record<string, string> = {
	cow,
	sheep,
	pig,
	duck,
	tractor,
	dinosaur,
};

/**
 * The safari bus that takes everyone home at the end of a round. Our own
 * design: a round yellow bus with a striped sun roof and open windows. It
 * has no face. It faces right in a 320 x 220 box, wheels on y = 206.
 */
export const busSvg = `
<svg class="safari-bus-art" viewBox="0 0 320 220" aria-hidden="true" focusable="false">
	<ellipse class="shadow" cx="160" cy="207" rx="140" ry="9"/>
	<g class="bus-body">
		<path d="M52 52 v-24 M110 52 v-24 M168 52 v-24 M226 52 v-24" stroke="${INK}" stroke-width="6" stroke-linecap="round"/>
		<rect x="34" y="6" width="214" height="24" rx="12" fill="${WHITE}" ${O}/>
		<path d="M62 9 v18 M96 9 v18 M130 9 v18 M164 9 v18 M198 9 v18 M232 9 v18" stroke="${CORAL}" stroke-width="14"/>
		<rect x="34" y="6" width="214" height="24" rx="12" fill="none" ${O}/>
		<path d="M30 70 q0 -20 20 -20 h196 q18 0 26 18 l30 62 q6 12 6 26 v14 q0 18 -18 18 h-242 q-18 0 -18 -18 z" fill="${SUN}" ${O}/>
		<rect x="46" y="66" width="46" height="46" rx="14" fill="#cfe0ff" ${O}/>
		<rect x="104" y="66" width="46" height="46" rx="14" fill="#cfe0ff" ${O}/>
		<rect x="162" y="66" width="46" height="46" rx="14" fill="#cfe0ff" ${O}/>
		<path d="M222 66 h24 q8 0 12 8 l20 40 h-56 z" fill="#cfe0ff" ${O} />
		<path d="M54 76 l12 -4 l-12 18 z M112 76 l12 -4 l-12 18 z M170 76 l12 -4 l-12 18 z M230 76 l12 -4 l-12 18 z" fill="${WHITE}" opacity="0.8"/>
		<path d="M33 132 h264" stroke="${MINT}" stroke-width="16"/>
		<circle cx="292" cy="160" r="9" fill="${WHITE}" ${O}/>
		<rect x="22" y="152" width="20" height="14" rx="7" fill="${CORAL}" ${O}/>
		<rect x="286" y="176" width="24" height="14" rx="7" fill="#d9d2e6" ${O}/>
		<path d="M30 70 q0 -20 20 -20 h196 q18 0 26 18 l30 62 q6 12 6 26 v14 q0 18 -18 18 h-242 q-18 0 -18 -18 z" fill="none" ${O}/>
	</g>
	${wheel(82, 178, 28)}
	${wheel(238, 178, 28)}
</svg>`;

// --------------------------------------------------------------- scenery

/** The land: far hills, the meadow and a winding lane. Stretches to fit. */
export const landSvg = `
<svg class="safari-land" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" focusable="false">
	<path d="M0 40 Q14 30 30 37 Q46 28 62 36 Q80 28 100 35 V100 H0 Z" fill="#a8e6cf"/>
	<path d="M0 46 Q22 39 46 44 Q74 40 100 45 V100 H0 Z" fill="#7fd6b6"/>
	<path d="M0 64 Q30 58 60 66 Q82 70 100 64 V100 H0 Z" fill="#6ccfac"/>
	<path d="M56 44 Q50 52 62 60 Q78 70 70 84 Q64 94 66 100 H92 Q88 92 92 82 Q100 66 80 56 Q66 50 62 44 Z" fill="#ffe7b0" stroke="#f2cf86" stroke-width="2" vector-effect="non-scaling-stroke"/>
</svg>`;

export const sunSvg = `
<svg class="safari-sun" viewBox="0 0 120 120" aria-hidden="true" focusable="false">
	<g stroke="${SUN}" stroke-width="8" stroke-linecap="round">
		<path d="M60 6 v12 M60 102 v12 M6 60 h12 M102 60 h12 M22 22 l8 8 M90 90 l8 8 M98 22 l-8 8 M30 90 l-8 8"/>
	</g>
	<circle cx="60" cy="60" r="32" fill="${SUN}" stroke="#f2ad2e" stroke-width="4"/>
	${eye(50, 56, 4)}${eye(70, 56, 4)}
	${smile(60, 68, 14)}
	<circle cx="42" cy="68" r="4" ${BLUSH}/><circle cx="78" cy="68" r="4" ${BLUSH}/>
</svg>`;

export const cloudSvg = `
<svg class="safari-cloud" viewBox="0 0 160 80" aria-hidden="true" focusable="false">
	<path d="M24 66 q-20 0 -18 -18 q2 -16 22 -14 q4 -24 30 -22 q16 -14 36 0 q26 -6 32 18 q24 0 24 18 q0 18 -22 18 z" fill="${WHITE}" opacity="0.92"/>
</svg>`;

export const flowerSvg = `
<svg class="safari-flower" viewBox="0 0 40 50" aria-hidden="true" focusable="false">
	<path d="M20 26 v22" stroke="#3fa585" stroke-width="4" stroke-linecap="round"/>
	<g fill="${WHITE}"><circle cx="20" cy="10" r="7"/><circle cx="30" cy="18" r="7"/><circle cx="26" cy="29" r="7"/><circle cx="14" cy="29" r="7"/><circle cx="10" cy="18" r="7"/></g>
	<circle cx="20" cy="20" r="6" fill="${SUN}"/>
</svg>`;

/** Hub tile: a cow peeping over a sunny hill. */
export const tileSvg = `
<svg viewBox="0 0 200 200" aria-hidden="true" focusable="false">
	<rect width="200" height="200" fill="#dfe7ff"/>
	<circle cx="160" cy="42" r="22" fill="${SUN}"/>
	<path d="M0 150 Q50 118 100 134 Q150 116 200 140 V200 H0 Z" fill="#7fd6b6"/>
	<path d="M0 176 Q60 160 120 172 Q170 180 200 168 V200 H0 Z" fill="${MINT}"/>
	<g transform="translate(-118 34) scale(1.35)">${cowHead}</g>
	<circle cx="30" cy="172" r="6" fill="${WHITE}"/><circle cx="30" cy="172" r="2.5" fill="${SUN}"/>
	<circle cx="176" cy="180" r="6" fill="${WHITE}"/><circle cx="176" cy="180" r="2.5" fill="${SUN}"/>
</svg>`;
