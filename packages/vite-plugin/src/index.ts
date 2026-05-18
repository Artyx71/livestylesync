import { WebSocketServer } from "ws";
import type { Plugin } from "vite";
import { readFileSync, writeFileSync } from "fs";
import postcss from "postcss";
import postcssScss from "postcss-scss";

function camelToKebab(prop: string): string {
	return prop.replace(/([A-Z])/g, "-$1").toLowerCase();
}

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

function resolveRuleSelector(rule: postcss.Rule): string {
	const selectors = rule.selector.split(",").map((s) => s.trim());
	let parent = rule.parent;

	while (parent && "selector" in parent) {
		const parentSelectors = (parent as postcss.Rule).selector.split(",").map((s) => s.trim());
		const resolved: string[] = [];

		for (const ps of parentSelectors) {
			for (const cs of selectors) {
				if (cs.includes("&")) {
					resolved.push(cs.replace(/&/g, ps).trim());
				} else {
					resolved.push(`${ps} ${cs}`.trim());
				}
			}
		}

		selectors.length = 0;
		selectors.push(...resolved);
		parent = (parent as postcss.Rule).parent;
	}

	return selectors.join(", ");
}

function patchScss(filePath: string, selector: string, prop: string, value: string) {
	const cssProp = camelToKebab(prop);
	const src = readFileSync(filePath, "utf-8");
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const scssParser = postcssScss as any;
	const root: postcss.Root = scssParser.parse(src);
	const normalizedSelector = selector.replace(/\s+/g, " ").trim();

	let found = false;

	root.walkRules((rule) => {
		const resolved = resolveRuleSelector(rule).replace(/\s+/g, " ").trim();
		if (resolved !== normalizedSelector) return;

		let propFound = false;
		rule.walkDecls(cssProp, (decl) => {
			decl.value = value;
			propFound = true;
		});
		if (!propFound) {
			rule.append(new postcss.Declaration({ prop: cssProp, value }));
		}
		found = true;
	});

	if (!found) {
		console.log("[LSS] selector not found in SCSS");
		return;
	}

	let output = "";
	scssParser.stringify(root, (str: string) => { output += str; });
	writeFileSync(filePath, output, "utf-8");
	console.log(`[LSS] wrote ${cssProp}: ${value} → ${filePath} (scss)`);
}

function patchVue(filePath: string, selector: string, prop: string, value: string) {
	const cssProp = camelToKebab(prop);
	const src = readFileSync(filePath, "utf-8");

	const styleMatch = /<style[^>]*scoped[^>]*>([\s\S]*?)<\/style>/m.exec(src);
	if (!styleMatch) {
		console.log("[LSS] no <style scoped> block found");
		return;
	}

	const styleStart = styleMatch.index + styleMatch[0].indexOf(">") + 1;
	const css = styleMatch[1];
	const selRegex = selectorToRegex(selector);
	const block = findBlock(css, selRegex);

	if (!block) {
		console.log("[LSS] selector not found in <style scoped>");
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

	const newCss = css.slice(0, block.start + 1) + newBlockContent + css.slice(block.end);
	const updated = src.slice(0, styleStart) + newCss + src.slice(styleStart + css.length);
	writeFileSync(filePath, updated, "utf-8");
	console.log(`[LSS] wrote ${cssProp}: ${value} → ${filePath} (vue scoped)`);
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

					if (msg.fileUrl.endsWith(".vue")) {
						patchVue(msg.fileUrl, msg.selector, msg.prop, msg.value);
					} else if (msg.fileUrl.endsWith(".scss")) {
						patchScss(msg.fileUrl, msg.selector, msg.prop, msg.value);
					} else {
						patchCss(msg.fileUrl, msg.selector, msg.prop, msg.value);
					}
				});

				socket.on("close", () => {
					console.log("[LSS] client disconnected");
				});
			});
		},
	};
}
