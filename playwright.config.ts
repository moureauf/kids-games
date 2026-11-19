import { createHash } from "node:crypto";
import { defineConfig, devices } from "@playwright/test";

// Each checkout (git worktree) gets its own port, so parallel sessions never
// test each other's build. Set PORT to choose one.
const port =
	Number(process.env.PORT) ||
	4200 +
		(createHash("sha1").update(process.cwd()).digest().readUInt16BE(0) % 800);
const ipad = devices["iPad (gen 7) landscape"];

// Tests run against the production build, because the service worker only
// exists there.
export default defineConfig({
	testDir: "tests/e2e",
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 1 : 0,
	reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
	use: {
		baseURL: `http://localhost:${port}/kids-games/`,
		trace: "retain-on-failure",
	},
	projects: [
		{ name: "ipad-webkit", use: { ...ipad } },
		{ name: "ipad-chromium", use: { ...ipad, browserName: "chromium" } },
	],
	webServer: {
		command: `npm run build && npx vite preview --port ${port} --strictPort`,
		url: `http://localhost:${port}/kids-games/`,
		// Never reuse a server: it may belong to another session's build.
		reuseExistingServer: false,
		timeout: 120_000,
	},
});
