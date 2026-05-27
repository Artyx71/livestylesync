import type { Compiler } from "webpack";
import { startWss } from "livestylesync-server-core";

export interface LiveStyleSyncPluginOptions {
	port?: number;
}

let started = false;

export class LiveStyleSyncPlugin {
	private port: number;

	constructor(options: LiveStyleSyncPluginOptions = {}) {
		this.port = options.port ?? 3100;
	}

	apply(compiler: Compiler): void {
		if (compiler.options.mode !== "development") return;
		if (started) return;

		compiler.hooks.afterEnvironment.tap("LiveStyleSyncPlugin", () => {
			if (started) return;
			started = true;
			startWss(compiler.context, null, this.port);
		});
	}
}
