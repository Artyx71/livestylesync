import { WebSocketServer } from "ws";
import type { ViteDevServer } from "vite";
import { readdirSync, statSync } from "fs";
import { join } from "path";
import { patchCss } from "./patchers/css";
import { patchScss } from "./patchers/scss";
import { patchVue } from "./patchers/vue";
import { createRule } from "./patchers/create";

const CSS_EXTS = new Set([".css", ".scss", ".vue"]);
const IGNORE_DIRS = new Set(["node_modules", ".git", "dist", ".nuxt", ".next", "out"]);

function findCssFiles(root: string, files: string[] = []): string[] {
	try {
		for (const entry of readdirSync(root)) {
			if (IGNORE_DIRS.has(entry)) continue;
			const full = join(root, entry);
			const stat = statSync(full);
			if (stat.isDirectory()) {
				findCssFiles(full, files);
			} else {
				const ext = full.slice(full.lastIndexOf("."));
				if (CSS_EXTS.has(ext)) files.push(full);
			}
		}
	} catch { /* skip unreadable dirs */ }
	return files;
}

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

			// list available CSS files
			if (msg.type === "list-files") {
				const root = server.config.root;
				const files = findCssFiles(root);
				socket.send(JSON.stringify({ type: "files", files }));
				return;
			}

			// create new CSS rule in a file
			if (msg.type === "create-rule") {
				const { fileUrl, selector, prop, value } = msg;
				if (!fileUrl || !selector || !prop || !value) return;
				try {
					createRule(fileUrl, selector, prop, value);
				} catch (err) {
					console.error("[LSS] create error:", err);
					const message = err instanceof Error ? err.message : String(err);
					socket.send(JSON.stringify({ type: "error", message }));
				}
				return;
			}

			if (!msg.fileUrl || !msg.selector || !msg.prop || !msg.value) return;

			const { fileUrl, selector, prop, value, mediaQuery } = msg;

			try {
				let patched: boolean;
				if (fileUrl.endsWith(".vue")) {
					patched = patchVue(fileUrl, selector, prop, value, mediaQuery);
				} else if (fileUrl.endsWith(".scss")) {
					patched = patchScss(fileUrl, selector, prop, value, mediaQuery);
				} else {
					patched = patchCss(fileUrl, selector, prop, value, mediaQuery);
				}
				if (!patched) {
					socket.send(JSON.stringify({ type: "error", message: `Selector "${selector}" not found in source file` }));
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
