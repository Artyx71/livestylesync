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

function patchCss(filePath: string, selector: string, prop: string, value: string) {
	const css = readFileSync(filePath, "utf-8");
	const selRegex = selectorToRegex(selector);

	// Пробуем заменить существующее свойство
	const replacePattern = new RegExp(
		`(${selRegex}\\s*\\{[^}]*)${prop}\\s*:[^;]+;`,
		"s"
	);
	let updated = css.replace(replacePattern, `$1${prop}: ${value};`);

	// Если свойства нет — добавляем в блок
	if (updated === css) {
		const addPattern = new RegExp(`(${selRegex}\\s*\\{)([^}]*)`, "s");
		updated = css.replace(addPattern, `$1$2  ${prop}: ${value};\n`);
	}

	if (updated === css) {
		console.log("[LSS] selector not found, skipping");
		return;
	}

	writeFileSync(filePath, updated, "utf-8");
	console.log(`[LSS] wrote ${prop}: ${value} → ${filePath}`);
}

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
