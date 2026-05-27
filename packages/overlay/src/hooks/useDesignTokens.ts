import { useState } from "react";
import { isTailwindSheet } from "../css";

export interface DesignToken {
	name: string;
	value: string;
	fileUrl: string;
	selector: string;
}

export interface TokenGroup {
	prefix: string;
	label: string;
	tokens: DesignToken[];
}

const GROUP_CONFIG: Array<{ prefix: string; label: string }> = [
	{ prefix: "color", label: "Colors" },
	{ prefix: "spacing", label: "Spacing" },
	{ prefix: "font", label: "Typography" },
	{ prefix: "radius", label: "Radius" },
	{ prefix: "shadow", label: "Shadows" },
	{ prefix: "size", label: "Sizes" },
	{ prefix: "border", label: "Borders" },
	{ prefix: "transition", label: "Transitions" },
];

const KNOWN_PREFIXES = new Set(GROUP_CONFIG.map((g) => g.prefix));

const ROOT_SELECTORS = new Set([":root", "html"]);

function getPrefix(name: string): string {
	const first = name.replace(/^--/, "").split("-")[0];
	return KNOWN_PREFIXES.has(first) ? first : "other";
}

function collectVars(
	rules: CSSRuleList,
	fileUrl: string,
	out: DesignToken[],
	seen: Set<string>
): void {
	for (const rule of Array.from(rules)) {
		if (rule instanceof CSSStyleRule) {
			// only `:root`, `html`, and `[data-theme*]` scope to avoid noise
			const sel = rule.selectorText;
			if (!ROOT_SELECTORS.has(sel) && !sel.startsWith("[data-theme")) continue;
			for (const prop of Array.from(rule.style)) {
				if (!prop.startsWith("--")) continue;
				if (seen.has(prop)) continue;
				seen.add(prop);
				out.push({
					name: prop,
					value: rule.style.getPropertyValue(prop).trim(),
					fileUrl,
					selector: sel,
				});
			}
		}
		const nested = (rule as unknown as { cssRules?: CSSRuleList }).cssRules;
		if (nested) collectVars(nested, fileUrl, out, seen);
	}
}

function scanTokens(): DesignToken[] {
	const tokens: DesignToken[] = [];
	const seen = new Set<string>();

	for (const sheet of Array.from(document.styleSheets)) {
		if (isTailwindSheet(sheet)) continue;

		let fileUrl = sheet.href ?? "";
		if (!fileUrl && sheet.ownerNode instanceof HTMLElement) {
			fileUrl = sheet.ownerNode.getAttribute("data-vite-dev-id") ?? "";
		}
		if (!fileUrl) continue;

		try {
			collectVars(sheet.cssRules, fileUrl.split("?")[0], tokens, seen);
		} catch { /* cross-origin */ }
	}

	return tokens;
}

function groupTokens(tokens: DesignToken[]): TokenGroup[] {
	const map = new Map<string, DesignToken[]>();
	for (const t of tokens) {
		const prefix = getPrefix(t.name);
		if (!map.has(prefix)) map.set(prefix, []);
		map.get(prefix)!.push(t);
	}

	const groups: TokenGroup[] = GROUP_CONFIG
		.filter((c) => map.has(c.prefix))
		.map((c) => ({ prefix: c.prefix, label: c.label, tokens: map.get(c.prefix)! }));

	if (map.has("other")) {
		groups.push({ prefix: "other", label: "Other", tokens: map.get("other")! });
	}
	return groups;
}

export function useDesignTokens(send: (data: object) => void) {
	const [tokens, setTokens] = useState<DesignToken[]>([]);
	const [pending, setPending] = useState<Record<string, string>>({});

	const load = () => setTokens(scanTokens());

	const handleChange = (name: string, value: string) => {
		setPending((p) => ({ ...p, [name]: value }));
	};

	const apply = () => {
		for (const [name, value] of Object.entries(pending)) {
			const token = tokens.find((t) => t.name === name);
			if (!token) continue;
			send({ fileUrl: token.fileUrl, selector: token.selector, prop: name, value });
		}
		setPending({});
	};

	const reset = () => setPending({});

	return {
		tokens,
		groups: groupTokens(tokens),
		pending,
		hasPending: Object.keys(pending).length > 0,
		load,
		handleChange,
		apply,
		reset,
	};
}
