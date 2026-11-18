/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

const colours = { background: "#fff7e8" };

// GitHub Pages serves the site from /kids-games/.
export default defineConfig({
	base: "/kids-games/",
	plugins: [
		VitePWA({
			// A new version installs in the background and is used on the next
			// visit. The child never sees an update prompt.
			registerType: "autoUpdate",
			injectRegister: "script-defer",
			// The glob below already precaches the icons; listing them twice with
			// different revisions makes the service worker install fail.
			includeManifestIcons: false,
			manifest: {
				name: "Kids games",
				short_name: "Kids games",
				description: "Small games that teach. Works offline.",
				lang: "en-GB",
				display: "standalone",
				orientation: "any",
				background_color: colours.background,
				theme_color: colours.background,
				icons: [
					{
						src: "assets/icons/pwa-64x64.png",
						sizes: "64x64",
						type: "image/png",
					},
					{
						src: "assets/icons/pwa-192x192.png",
						sizes: "192x192",
						type: "image/png",
					},
					{
						src: "assets/icons/pwa-512x512.png",
						sizes: "512x512",
						type: "image/png",
					},
					{
						src: "assets/icons/maskable-icon-512x512.png",
						sizes: "512x512",
						type: "image/png",
						purpose: "maskable",
					},
				],
			},
			workbox: {
				// Precache everything: pages, code, images, sounds and fonts.
				globPatterns: [
					"**/*.{html,js,css,svg,png,ico,json,mp3,m4a,ogg,opus,wav,woff2}",
				],
				navigateFallback: "index.html",
				cleanupOutdatedCaches: true,
				// Control the first page at once, so the first visit is enough.
				clientsClaim: true,
			},
		}),
	],
	test: {
		include: ["tests/unit/**/*.test.ts"],
		passWithNoTests: true,
	},
});
