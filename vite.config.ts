/// <reference types="vitest/config" />
import { defineConfig } from "vite";

// GitHub Pages serves the site from /kids-games/.
export default defineConfig({
	base: "/kids-games/",
	test: {
		include: ["tests/unit/**/*.test.ts"],
		passWithNoTests: true,
	},
});
