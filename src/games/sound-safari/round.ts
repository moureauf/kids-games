// How long a Sound safari round lasts. The round is counted in taps, never
// in time (CLAUDE.md: "a natural end"). After the last tap the safari bus
// comes to take everyone home.

/** Taps in one round. Every tap counts, also a tap on the same creature. */
export const ROUND_TAPS = 20;

/**
 * The taps to use for this round. End-to-end tests may shorten the round
 * with `?e2e&safariTaps=<n>`; without `e2e` the real count always applies.
 */
export function roundTaps(search: string): number {
	const params = new URLSearchParams(search);
	if (!params.has("e2e")) return ROUND_TAPS;
	const n = Number(params.get("safariTaps"));
	return Number.isInteger(n) && n > 0 ? n : ROUND_TAPS;
}
