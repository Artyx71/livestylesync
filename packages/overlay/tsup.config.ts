import { defineConfig } from "tsup";

export default defineConfig({
	entry: ["src/index.ts"],
	format: ["esm"],
	dts: true,
	esbuildOptions(options) {
		options.alias = {
			"react": "preact/compat",
			"react-dom": "preact/compat",
			"react-dom/client": "preact/compat/client",
			"react/jsx-runtime": "preact/jsx-runtime",
			"react/jsx-dev-runtime": "preact/jsx-dev-runtime",
		};
	},
});
