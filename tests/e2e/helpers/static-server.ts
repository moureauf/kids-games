// A small static server for one test: it serves a private copy of `dist/`
// under /kids-games/. A test can then change the files (deploy a new
// build) without touching the server that the other tests share.
import { createReadStream, statSync } from "node:fs";
import { cp, mkdtemp, rm } from "node:fs/promises";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { extname, join, normalize } from "node:path";

const types: Record<string, string> = {
	".html": "text/html; charset=utf-8",
	".js": "text/javascript; charset=utf-8",
	".css": "text/css; charset=utf-8",
	".json": "application/json",
	".webmanifest": "application/manifest+json",
	".svg": "image/svg+xml",
	".png": "image/png",
	".ico": "image/x-icon",
	".mp3": "audio/mpeg",
	".m4a": "audio/mp4",
	".ogg": "audio/ogg",
	".opus": "audio/ogg",
	".wav": "audio/wav",
	".woff2": "font/woff2",
};

export interface StaticSite {
	/** The site URL, ending in /kids-games/. */
	url: string;
	/** The folder with the served files. Change them to deploy a new build. */
	dir: string;
	close(): Promise<void>;
}

export async function serveCopyOfDist(): Promise<StaticSite> {
	const dir = await mkdtemp(join(tmpdir(), "kids-games-site-"));
	await cp(join(process.cwd(), "dist"), dir, { recursive: true });

	const server = createServer((req, res) => {
		const path = decodeURIComponent(
			new URL(req.url ?? "/", "http://x").pathname,
		);
		if (!path.startsWith("/kids-games/")) {
			res.writeHead(404).end();
			return;
		}
		let file = normalize(join(dir, path.slice("/kids-games/".length)));
		if (!file.startsWith(dir)) {
			res.writeHead(403).end();
			return;
		}
		try {
			if (statSync(file).isDirectory()) file = join(file, "index.html");
			statSync(file);
		} catch {
			res.writeHead(404).end();
			return;
		}
		res.writeHead(200, {
			"Content-Type": types[extname(file)] ?? "application/octet-stream",
			"Cache-Control": "no-cache",
		});
		createReadStream(file).pipe(res);
	});
	await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
	const { port } = server.address() as AddressInfo;

	return {
		url: `http://127.0.0.1:${port}/kids-games/`,
		dir,
		async close() {
			server.closeAllConnections();
			await new Promise((resolve) => server.close(resolve));
			await rm(dir, { recursive: true, force: true });
		},
	};
}
