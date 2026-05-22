import type { Plugin } from "vite";
import { startWss } from "livestylesync-server-core";

interface LiveStyleSyncOptions {
	port?: number;
}

export function liveStyleSync(options: LiveStyleSyncOptions = {}): Plugin {
	const port = options.port ?? 3100;

	return {
		name: "livestylesync",

		configureServer(server) {
			startWss(server.config.root, server.httpServer, port);
		},
	};
}
