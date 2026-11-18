import {
	defineConfig,
	minimal2023Preset,
} from "@vite-pwa/assets-generator/config";

// Run `npm run icons` after editing public/assets/icons/icon.svg.
export default defineConfig({
	preset: {
		...minimal2023Preset,
		maskable: {
			...minimal2023Preset.maskable,
			resizeOptions: { background: "#fff7e8" },
		},
		apple: {
			...minimal2023Preset.apple,
			resizeOptions: { background: "#fff7e8" },
		},
	},
	images: ["public/assets/icons/icon.svg"],
});
