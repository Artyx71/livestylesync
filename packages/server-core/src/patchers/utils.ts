import type postcss from "postcss";

export function resolveRuleSelector(rule: postcss.Rule): string {
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

export function camelToKebab(prop: string): string {
	return prop.replace(/([A-Z])/g, "-$1").toLowerCase();
}

export function escapeForRegex(s: string): string {
	return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function selectorToRegex(selector: string): string {
	return selector
		.split(",")
		.map((s) => escapeForRegex(s.trim()))
		.join(",\\s*\\n?\\s*");
}

export function findBlock(css: string, selRegex: string): { start: number; end: number } | null {
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

export function findMediaBlock(css: string, conditionText: string): { start: number; end: number } | null {
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

export function patchBlockContent(content: string, cssProp: string, value: string, indent: string): string {
	const propPattern = new RegExp(`${escapeForRegex(cssProp)}\\s*:[^;]+;`);
	if (propPattern.test(content)) {
		return content.replace(propPattern, `${cssProp}: ${value};`);
	}
	return content.trimEnd() + `\n${indent}${cssProp}: ${value};\n`;
}
