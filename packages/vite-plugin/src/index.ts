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

function findMediaBlock(css: string, conditionText: string): { start: number; end: number } | null {
	const target = conditionText.replace(/\s+/g, " ").trim();
	let searchFrom = 0;

	while (searchFrom < css.length) {
		const atIdx = css.indexOf("@media", searchFrom);
		if (atIdx === -1) return null;

		const braceIdx = css.indexOf("{", atIdx);
		if (braceIdx === -1) return null;

		const between = css.slice(atIdx + 6, braceIdx).replace(/\s+/g, " ").trim();

		if (between === target) {
			let depth = 0;
			for (let i = braceIdx; i < css.length; i++) {
				if (css[i] === "{") depth++;
				else if (css[i] === "}") {
					depth--;
					if (depth === 0) return { start: braceIdx, end: i };
				}
			}
		}

		searchFrom = braceIdx + 1;
	}
	return null;
}

function patchBlockContent(content: string, cssProp: string, value: string, indent: string): string {
	const propPattern = new RegExp(`${escapeForRegex(cssProp)}\\s*:[^;]+;`);
	if (propPattern.test(content)) {
		return content.replace(propPattern, `${cssProp}: ${value};`);
	}
	return content.trimEnd() + `\n${indent}${cssProp}: ${value};\n`;
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

function patchScss(filePath: string, selector: string, prop: string, value: string, mediaQuery?: string) {
	const cssProp = camelToKebab(prop);
	const src = readFileSync(filePath, "utf-8");
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const scssParser = postcssScss as any;
	const root: postcss.Root = scssParser.parse(src);
	const normalizedSelector = selector.replace(/\s+/g, " ").trim();
	const normalizedMedia = mediaQuery?.replace(/\s+/g, " ").trim();

	let found = false;

	// Walk rules — handles both @media { selector } and selector { @media { selector } } formats
	root.walkRules((rule) => {
		if (found) return false;
		const resolved = resolveRuleSelector(rule).replace(/\s+/g, " ").trim();
		if (resolved !== normalizedSelector) return;

		if (normalizedMedia) {
			// Check if this rule is inside the right @media
			let inTargetMedia = false;
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			let p: any = rule.parent;
			while (p) {
				if (p.type === "atrule" && p.name === "media") {
					const params: string = p.params.replace(/\s+/g, " ").trim();
					if (params === normalizedMedia) { inTargetMedia = true; break; }
				}
				p = p.parent;
			}
			if (!inTargetMedia) return;
		} else {
			// No media: rule must NOT be inside any @media
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			let p: any = rule.parent;
			while (p) {
				if (p.type === "atrule" && p.name === "media") return;
				p = p.parent;
			}
		}

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

	// SCSS nesting format: selector { @media { declarations directly } } — no inner rule
	if (!found && normalizedMedia) {
		root.walkRules((rule) => {
			if (found) return false;
			const resolved = resolveRuleSelector(rule).replace(/\s+/g, " ").trim();
			if (resolved !== normalizedSelector) return;

			// Outer rule must NOT be inside @media
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			let p: any = rule.parent;
			while (p) {
				if (p.type === "atrule" && p.name === "media") return;
				p = p.parent;
			}

			rule.each((child) => {
				if (found) return false;
				if (child.type !== "atrule") return;
				const atRule = child as postcss.AtRule;
				if (atRule.name !== "media") return;
				if (atRule.params.replace(/\s+/g, " ").trim() !== normalizedMedia) return;

				let propFound = false;
				atRule.walkDecls(cssProp, (decl) => {
					decl.value = value;
					propFound = true;
				});
				if (!propFound) {
					atRule.append(new postcss.Declaration({ prop: cssProp, value }));
				}
				found = true;
			});
		});
	}

	if (!found) {
		console.log("[LSS] selector not found in SCSS");
		return;
	}

	let output = "";
	scssParser.stringify(root, (str: string) => { output += str; });
	writeFileSync(filePath, output, "utf-8");
	console.log(`[LSS] wrote ${cssProp}: ${value} → ${filePath} (scss)`);
}

function patchVue(filePath: string, selector: string, prop: string, value: string, mediaQuery?: string) {
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

	let newCss: string | null = null;

	if (mediaQuery) {
		// Try: @media { selector { } }
		const mediaBlock = findMediaBlock(css, mediaQuery);
		if (mediaBlock) {
			const inner = css.slice(mediaBlock.start + 1, mediaBlock.end);
			const block = findBlock(inner, selRegex);
			if (block) {
				const content = inner.slice(block.start + 1, block.end);
				const patched = patchBlockContent(content, cssProp, value, "    ");
				const newInner = inner.slice(0, block.start + 1) + patched + inner.slice(block.end);
				newCss = css.slice(0, mediaBlock.start + 1) + newInner + css.slice(mediaBlock.end);
			}
		}

		// Try: selector { @media { } }
		if (!newCss) {
			const outerBlock = findBlock(css, selRegex);
			if (outerBlock) {
				const inner = css.slice(outerBlock.start + 1, outerBlock.end);
				const innerMedia = findMediaBlock(inner, mediaQuery);
				if (innerMedia) {
					const content = inner.slice(innerMedia.start + 1, innerMedia.end);
					const patched = patchBlockContent(content, cssProp, value, "    ");
					const newInner = inner.slice(0, innerMedia.start + 1) + patched + inner.slice(innerMedia.end);
					newCss = css.slice(0, outerBlock.start + 1) + newInner + css.slice(outerBlock.end);
				}
			}
		}
	} else {
		const block = findBlock(css, selRegex);
		if (block) {
			const content = css.slice(block.start + 1, block.end);
			const patched = patchBlockContent(content, cssProp, value, "  ");
			newCss = css.slice(0, block.start + 1) + patched + css.slice(block.end);
		}
	}

	if (!newCss) {
		console.log("[LSS] selector not found in <style scoped>");
		return;
	}

	const updated = src.slice(0, styleStart) + newCss + src.slice(styleStart + css.length);
	writeFileSync(filePath, updated, "utf-8");
	console.log(`[LSS] wrote ${cssProp}: ${value} → ${filePath} (vue scoped)`);
}

function patchCss(filePath: string, selector: string, prop: string, value: string, mediaQuery?: string) {
	const cssProp = camelToKebab(prop);
	const css = readFileSync(filePath, "utf-8");
	const selRegex = selectorToRegex(selector);

	if (!mediaQuery) {
		const block = findBlock(css, selRegex);
		if (!block) {
			console.log("[LSS] selector not found, skipping");
			return;
		}
		const content = css.slice(block.start + 1, block.end);
		const patched = patchBlockContent(content, cssProp, value, "  ");
		const updated = css.slice(0, block.start + 1) + patched + css.slice(block.end);
		writeFileSync(filePath, updated, "utf-8");
		console.log(`[LSS] wrote ${cssProp}: ${value} → ${filePath}`);
		return;
	}

	// Try: @media { selector { } }
	const mediaBlock = findMediaBlock(css, mediaQuery);
	if (mediaBlock) {
		const inner = css.slice(mediaBlock.start + 1, mediaBlock.end);
		const block = findBlock(inner, selRegex);
		if (block) {
			const content = inner.slice(block.start + 1, block.end);
			const patched = patchBlockContent(content, cssProp, value, "    ");
			const newInner = inner.slice(0, block.start + 1) + patched + inner.slice(block.end);
			const updated = css.slice(0, mediaBlock.start + 1) + newInner + css.slice(mediaBlock.end);
			writeFileSync(filePath, updated, "utf-8");
			console.log(`[LSS] wrote ${cssProp}: ${value} → ${filePath} (@media ${mediaQuery})`);
			return;
		}
	}

	// Try: selector { @media { } } (CSS nesting format)
	const outerBlock = findBlock(css, selRegex);
	if (outerBlock) {
		const inner = css.slice(outerBlock.start + 1, outerBlock.end);
		const innerMedia = findMediaBlock(inner, mediaQuery);
		if (innerMedia) {
			const content = inner.slice(innerMedia.start + 1, innerMedia.end);
			const patched = patchBlockContent(content, cssProp, value, "    ");
			const newInner = inner.slice(0, innerMedia.start + 1) + patched + inner.slice(innerMedia.end);
			const updated = css.slice(0, outerBlock.start + 1) + newInner + css.slice(outerBlock.end);
			writeFileSync(filePath, updated, "utf-8");
			console.log(`[LSS] wrote ${cssProp}: ${value} → ${filePath} (css-nested @media ${mediaQuery})`);
			return;
		}
	}

	console.log("[LSS] @media block not found, skipping");
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

					const { fileUrl, selector, prop, value, mediaQuery } = msg;

					if (fileUrl.endsWith(".vue")) {
						patchVue(fileUrl, selector, prop, value, mediaQuery);
					} else if (fileUrl.endsWith(".scss")) {
						patchScss(fileUrl, selector, prop, value, mediaQuery);
					} else {
						patchCss(fileUrl, selector, prop, value, mediaQuery);
					}
				});

				socket.on("close", () => {
					console.log("[LSS] client disconnected");
				});
			});
		},
	};
}
