import type { Compiler } from "webpack";
import { startWss } from "livestylesync-server-core";

let started = false;

export class LiveStyleSyncPlugin {
	private port: number;

	constructor(options: { port?: number } = {}) {
		this.port = options.port ?? 3100;
	}

	apply(compiler: Compiler): void {
		if (compiler.options.mode !== "development") return;
		if (started) return;

		compiler.hooks.afterEnvironment.tap("LiveStyleSyncPlugin", () => {
			if (started) return;
			started = true;
			const root = compiler.context;
			startWss(root, null, this.port);
		});
	}
}
