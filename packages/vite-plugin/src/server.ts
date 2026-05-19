import { WebSocketServer } from "ws";
import type { ViteDevServer } from "vite";
import { patchCss } from "./patchers/css";
import { patchScss } from "./patchers/scss";
import { patchVue } from "./patchers/vue";

export function startWss(server: ViteDevServer, port: number) {
	const wss = new WebSocketServer({ port });

	wss.on("error", (err: NodeJS.ErrnoException) => {
		if (err.code !== "EADDRINUSE") throw err;
		console.log(`[LSS] port ${port} busy — restart Vite to reconnect`);
	});

	server.httpServer?.once("close", () => wss.close());

	wss.on("connection", (socket) => {
		console.log("[LSS] client connected");

		socket.on("message", (raw) => {
			let msg: Record<string, string>;
			try {
				msg = JSON.parse(raw.toString());
			} catch {
				return;
			}
			if (!msg.fileUrl || !msg.selector || !msg.prop || !msg.value) return;

			const { fileUrl, selector, prop, value, mediaQuery } = msg;

			try {
				if (fileUrl.endsWith(".vue")) {
					patchVue(fileUrl, selector, prop, value, mediaQuery);
				} else if (fileUrl.endsWith(".scss")) {
					patchScss(fileUrl, selector, prop, value, mediaQuery);
				} else {
					patchCss(fileUrl, selector, prop, value, mediaQuery);
				}
			} catch (err) {
				console.error("[LSS] patch error:", err);
				const message = err instanceof Error ? err.message : String(err);
				socket.send(JSON.stringify({ type: "error", message }));
			}
		});

		socket.on("close", () => {
			console.log("[LSS] client disconnected");
		});
	});
}
