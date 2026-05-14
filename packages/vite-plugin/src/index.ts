import { WebSocketServer } from "ws";
import type { Plugin } from "vite";
import { readFileSync, writeFileSync } from "fs";

function escapeForRegex(s: string): string {
	return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function selectorToRegex(selector: string): string {
	return selector
		.split(",")
		.map((s) => escapeForRegex(s.trim()))
		.join(",\\s*\\n?\\s*");
}

function findBlock(css: string, selRegex: string): { start: number; end: number } | null {
	const pattern = new RegExp(`${selRegex}\\s*\\{`, "s");
	const match = pattern.exec(css);
	if (!match) return null;

	const start = match.index + match[0].length - 1;
	let depth = 0;

	for (let i = start; i < css.length; i++) {
		if (css[i] === "{") depth++;
		else if (css[i] === "}") {
			depth--;
			if (depth === 0) return { start, end: i };
		}
	}
	return null;
}

function camelToKebab(prop: string): string {
	return prop.replace(/([A-Z])/g, "-$1").toLowerCase();
}

function patchCss(filePath: string, selector: string, prop: string, value: string) {
	const cssProp = camelToKebab(prop);
	const css = readFileSync(filePath, "utf-8");
	const selRegex = selectorToRegex(selector);

	const block = findBlock(css, selRegex);
	if (!block) {
		console.log("[LSS] selector not found, skipping");
		return;
	}

	const blockContent = css.slice(block.start + 1, block.end);
	const propPattern = new RegExp(`${cssProp}\\s*:[^;]+;`);

	let newBlockContent: string;

	if (propPattern.test(blockContent)) {
		newBlockContent = blockContent.replace(propPattern, `${cssProp}: ${value};`);
	} else {
		newBlockContent = blockContent.trimEnd() + `\n  ${cssProp}: ${value};\n`;
	}

	const updated = css.slice(0, block.start + 1) + newBlockContent + css.slice(block.end);
	writeFileSync(filePath, updated, "utf-8");
	console.log(`[LSS] wrote ${cssProp}: ${value} → ${filePath}`);
}

interface LiveStyleSyncOptions {
	port?: number;
}

export function liveStyleSync(options: LiveStyleSyncOptions = {}): Plugin {
	const port = options.port ?? 3100;

	return {
		name: "livestylesync",

		configureServer(server) {
			const wss = new WebSocketServer({ port });

			wss.on("error", (err: NodeJS.ErrnoException) => {
				if (err.code !== "EADDRINUSE") throw err;
				console.log(`[LSS] port ${port} busy — restart Vite to reconnect`);
			});

			server.httpServer?.once("close", () => wss.close());

			wss.on("connection", (socket) => {
				console.log("[LSS] client connected");

				socket.on("message", (raw) => {
					const msg = JSON.parse(raw.toString());
					if (!msg.fileUrl || !msg.selector || !msg.prop || !msg.value) return;
					patchCss(msg.fileUrl, msg.selector, msg.prop, msg.value);
				});

				socket.on("close", () => {
					console.log("[LSS] client disconnected");
				});
			});
		},
	};
}
