import { WebSocketServer } from "ws";
import type { Plugin } from "vite";

export function liveStyleSync(): Plugin {
	return {
		name: "livestylesync",

		configureServer() {
			const wss = new WebSocketServer({ port: 3100 });

			wss.on("connection", (socket) => {
				console.log("[LSS] client connected");

				socket.on("message", (raw) => {
					const msg = JSON.parse(raw.toString());
					console.log("[LSS] patch:", msg);
				});

				socket.on("close", () => {
					console.log("[LSS] client disconnected");
				});
			});
		},
	};
}
