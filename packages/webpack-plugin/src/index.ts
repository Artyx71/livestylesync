import type { Compiler } from "webpack";
import { startWss } from "livestylesync-server-core";

export interface LiveStyleSyncPluginOptions {
	port?: number;
}

const startedCompilers = new WeakMap<object, boolean>();

export class LiveStyleSyncPlugin {
	private port: number;

	constructor(options: LiveStyleSyncPluginOptions = {}) {
		this.port = options.port ?? 3100;
	}

	apply(compiler: Compiler): void {
		if (compiler.options.mode !== "development") return;
		if (startedCompilers.get(compiler)) return;

		compiler.hooks.afterEnvironment.tap("LiveStyleSyncPlugin", () => {
			if (startedCompilers.get(compiler)) return;
			startedCompilers.set(compiler, true);
			const root = compiler.options.context ?? compiler.context;
			startWss(root, null, this.port);
		});
	}
}
