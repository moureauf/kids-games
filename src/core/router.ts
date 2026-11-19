// Hash routes: `#/` is the hub, `#/<id>` is a game. Anything else goes to
// the hub, so a stale bookmark never shows a blank screen.
export type Route = { name: "hub" } | { name: "game"; id: string };

export function parseRoute(hash: string, gameIds: readonly string[]): Route {
	const match = /^#\/([^/?#]+)\/?$/.exec(hash);
	const id = match?.[1] ? safeDecode(match[1]) : undefined;
	if (id && gameIds.includes(id)) return { name: "game", id };
	return { name: "hub" };
}

function safeDecode(part: string): string | undefined {
	try {
		return decodeURIComponent(part);
	} catch {
		return undefined;
	}
}

export function hubHash(): string {
	return "#/";
}

export function gameHash(id: string): string {
	return `#/${encodeURIComponent(id)}`;
}
