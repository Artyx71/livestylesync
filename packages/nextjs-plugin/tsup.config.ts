import { defineConfig } from "tsup";

export default defineConfig({
	entry: ["src/index.ts"],
	format: ["esm"],
	dts: true,
	external: ["webpack", "next", "livestylesync-server-core"],
});
