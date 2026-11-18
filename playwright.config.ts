import { defineConfig, devices } from "@playwright/test";

const port = 4173;
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
		command: "npm run build && npm run preview",
		url: `http://localhost:${port}/kids-games/`,
		reuseExistingServer: !process.env.CI,
		timeout: 120_000,
	},
});
