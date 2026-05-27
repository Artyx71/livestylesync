import { WebSocketServer } from "ws";

interface CloseEmitter {
	once(event: "close", listener: () => void): unknown;
}
import { readdirSync, statSync } from "fs";
import { join } from "path";
import { patchCss } from "./patchers/css";
import { patchScss } from "./patchers/scss";
import { patchVue } from "./patchers/vue";
import { createRule } from "./patchers/create";
import { patchTailwindClass } from "./patchers/tailwind";
import { scanScssVars, patchScssVar } from "./patchers/scss-vars";
import type { ScssVarDef } from "./patchers/scss-vars";

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

export function startWss(root: string, httpServer: CloseEmitter | null, port: number) {
	const wss = new WebSocketServer({ port });

	wss.on("error", (err: NodeJS.ErrnoException) => {
		if (err.code !== "EADDRINUSE") throw err;
		console.log(`[LSS] port ${port} busy — restart to reconnect`);
	});

	httpServer?.once("close", () => wss.close());

	wss.on("connection", (socket) => {
		console.log("[LSS] client connected");

		socket.on("message", (raw) => {
			let msg: Record<string, string>;
			try {
				msg = JSON.parse(raw.toString());
			} catch {
				return;
			}

			if (msg.type === "list-files") {
				const files = findCssFiles(root);
				socket.send(JSON.stringify({ type: "files", files }));
				return;
			}

			if (msg.type === "list-scss-vars") {
				const scssFiles = findCssFiles(root).filter((f) => f.endsWith(".scss"));
				const vars: ScssVarDef[] = scssFiles.flatMap((f) => scanScssVars(f));
				socket.send(JSON.stringify({ type: "scss-vars", vars }));
				return;
			}

			if (msg.type === "patch-scss-var") {
				const { fileUrl, name, value } = msg;
				if (!fileUrl || !name || value == null) return;
				try {
					const ok = patchScssVar(fileUrl, name, value);
					if (!ok) {
						socket.send(JSON.stringify({ type: "error", message: `SCSS variable "${name}" not found in source file` }));
					} else {
						socket.send(JSON.stringify({ type: "patched" }));
					}
				} catch (err) {
					const message = err instanceof Error ? err.message : String(err);
					socket.send(JSON.stringify({ type: "error", message }));
				}
				return;
			}

			if (msg.type === "patch-tailwind") {
				const { classes, oldClass, newClass } = msg as unknown as {
					type: string; classes: string[]; oldClass: string; newClass: string;
				};
				if (!oldClass || !Array.isArray(classes)) return;
				try {
					const result = patchTailwindClass(root, classes, oldClass, newClass ?? "");
					if (!result.patched) {
						socket.send(JSON.stringify({ type: "error", message: `Class "${oldClass}" not found in source files` }));
					} else {
						socket.send(JSON.stringify({ type: "patched" }));
					}
				} catch (err) {
					const message = err instanceof Error ? err.message : String(err);
					socket.send(JSON.stringify({ type: "error", message }));
				}
				return;
			}

			if (msg.type === "create-rule") {
				const { fileUrl, selector, prop, value } = msg;
				if (!fileUrl || !selector || !prop || !value) return;
				try {
					createRule(fileUrl, selector, prop, value);
				} catch (err) {
					const message = err instanceof Error ? err.message : String(err);
					socket.send(JSON.stringify({ type: "error", message }));
				}
				return;
			}

			if (!msg.fileUrl || !msg.selector || !msg.prop || msg.value == null) return;

			const { fileUrl, selector, prop, value, mediaQuery } = msg;

			try {
				let result: { patched: boolean; line?: number };
				if (fileUrl.endsWith(".vue")) {
					result = patchVue(fileUrl, selector, prop, value, mediaQuery);
				} else if (fileUrl.endsWith(".scss")) {
					result = patchScss(fileUrl, selector, prop, value, mediaQuery);
				} else {
					result = patchCss(fileUrl, selector, prop, value, mediaQuery);
				}
				if (!result.patched) {
					socket.send(JSON.stringify({ type: "error", message: `Selector "${selector}" not found in source file` }));
				} else {
					socket.send(JSON.stringify({ type: "patched", fileUrl, line: result.line }));
				}
			} catch (err) {
				const message = err instanceof Error ? err.message : String(err);
				socket.send(JSON.stringify({ type: "error", message }));
			}
		});

		socket.on("close", () => {
			console.log("[LSS] client disconnected");
		});
	});
}
