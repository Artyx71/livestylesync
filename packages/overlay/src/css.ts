import type { RawRule, RuleGroup } from "./types";

const INTERACTIVE_PSEUDOS = [
	":hover", ":focus", ":focus-visible", ":focus-within",
	":active", ":checked", ":disabled", ":visited",
];

export function stripInteractivePseudos(selector: string): string {
	let s = selector;
	for (const p of INTERACTIVE_PSEUDOS) {
		s = s.split(p).join("");
	}
	return s.trim();
}

export function getPseudoLabel(selector: string): string {
	for (const p of INTERACTIVE_PSEUDOS) {
		if (selector.includes(p)) return p;
	}
	return "base";
}

export function shortMedia(mq: string): string {
	const maxW = /max-width:\s*(\d+\w*)/.exec(mq);
	const minW = /min-width:\s*(\d+\w*)/.exec(mq);
	if (maxW) return `≤${maxW[1]}`;
	if (minW) return `≥${minW[1]}`;
	return "@media";
}

export function groupTabLabel(g: RuleGroup): string {
	if (g.mediaQuery) {
		const mq = shortMedia(g.mediaQuery);
		return g.label !== "base" ? `${mq} ${g.label}` : mq;
	}
	return g.label;
}

export function groupKey(g: RuleGroup): string {
	return g.selector + (g.mediaQuery ?? "");
}

export function getAncestorPath(el: Element): Element[] {
	const path: Element[] = [];
	let cur: Element | null = el;
	while (cur && cur.tagName !== "BODY" && cur.tagName !== "HTML") {
		path.unshift(cur);
		cur = cur.parentElement;
	}
	return path;
}

export function elLabel(el: Element): string {
	const tag = el.tagName.toLowerCase();
	const id = el.id ? `#${el.id}` : "";
	const cls = el.classList[0] ? `.${el.classList[0]}` : "";
	return `${tag}${id || cls}`;
}

function resolveRawSelector(sel: string, parentSelectors: string[]): string {
	if (!sel.includes("&")) return sel;
	const parent = parentSelectors[parentSelectors.length - 1] ?? "";
	return sel.replace(/&/g, parent).trim();
}

function collectRawRules(
	rules: CSSRuleList,
	parentSelectors: string[] = [],
	mediaQuery?: string,
	result: RawRule[] = [],
): RawRule[] {
	for (const rule of Array.from(rules)) {
		if (rule instanceof CSSStyleRule) {
			result.push({ selectorText: rule.selectorText, parentSelectors, mediaQuery, style: rule.style });
			const mySel = resolveRawSelector(rule.selectorText, parentSelectors);
			if ((rule as unknown as { cssRules?: CSSRuleList }).cssRules?.length) {
				collectRawRules(
					(rule as unknown as { cssRules: CSSRuleList }).cssRules,
					[...parentSelectors, mySel],
					mediaQuery,
					result,
				);
			}
		} else if (rule instanceof CSSMediaRule) {
			collectRawRules(rule.cssRules, parentSelectors, rule.conditionText, result);
		} else if (rule instanceof CSSSupportsRule) {
			collectRawRules(rule.cssRules, parentSelectors, mediaQuery, result);
		} else if ("style" in rule) {
			// CSSNestedDeclarations (Chrome 130+) — no selectorText, inherits parent
			result.push({
				selectorText: "&",
				parentSelectors,
				mediaQuery,
				style: (rule as unknown as { style: CSSStyleDeclaration }).style,
			});
		}
	}
	return result;
}

export function findAllSourceStyles(el: Element): RuleGroup[] {
	const groups: RuleGroup[] = [];
	const seenKeys = new Set<string>();

	for (const sheet of Array.from(document.styleSheets)) {
		let fileUrl: string | null = sheet.href;

		if (!fileUrl && sheet.ownerNode instanceof HTMLElement) {
			fileUrl = sheet.ownerNode.getAttribute("data-vite-dev-id");
		}

		if (!fileUrl) continue;

		let sheetRules: CSSRuleList;
		try {
			sheetRules = sheet.cssRules;
		} catch {
			continue;
		}

		const rawRules = collectRawRules(sheetRules);

		for (const raw of rawRules) {
			const effectiveRaw = resolveRawSelector(raw.selectorText, raw.parentSelectors);
			const { mediaQuery } = raw;

			if (!effectiveRaw || effectiveRaw === "*" || effectiveRaw === "&") continue;

			const stripped = stripInteractivePseudos(effectiveRaw);
			const isPseudo = stripped !== effectiveRaw;

			let matches = false;
			try { matches = el.matches(effectiveRaw); } catch { /* skip */ }

			if (!matches && isPseudo && stripped) {
				try { matches = el.matches(stripped); } catch { /* skip */ }
			}

			if (!matches) continue;

			const seenKey = `${effectiveRaw}|||${mediaQuery ?? ""}`;
			if (seenKeys.has(seenKey)) continue;
			seenKeys.add(seenKey);

			const isCssModule = /\.module\.css$/.test(fileUrl);
			const isVue = fileUrl.includes("?vue&type=style");
			const isScoped = /\[data-v-[a-f0-9]+\]/.test(effectiveRaw);

			let selector = effectiveRaw.replace(/\[data-v-[a-f0-9]+\]/g, "").trim();

			if (isCssModule) {
				selector = selector.replace(/\._[^.\s,>~+[\]]+/g, (match) => {
					let name = match.slice(2);
					name = name.replace(/_\d+$/, "");
					name = name.replace(/_[a-z0-9]{4,8}$/, "");
					return "." + name;
				});
			}

			const cleanUrl = isVue ? fileUrl.split("?")[0] : fileUrl;

			const styles: Record<string, string> = {};
			for (const decl of raw.style.cssText.split(";")) {
				const colon = decl.indexOf(":");
				if (colon === -1) continue;
				const prop = decl.slice(0, colon).trim();
				const value = decl.slice(colon + 1).trim();
				if (prop && value) styles[prop] = value;
			}
			if (Object.keys(styles).length === 0) continue;

			const label = getPseudoLabel(selector);
			const group: RuleGroup = { fileUrl: cleanUrl, selector, label, styles, mediaQuery };

			if (isScoped) {
				groups.unshift(group);
			} else {
				groups.push(group);
			}
		}
	}

	const baseGroups = groups.filter((g) => g.label === "base" && !g.mediaQuery);
	const bestBase = baseGroups.reduce<RuleGroup | null>(
		(best, g) => (!best || Object.keys(g.styles).length > Object.keys(best.styles).length) ? g : best,
		null
	);
	const rest = groups.filter((g) => g.label !== "base" || g.mediaQuery);
	return bestBase ? [bestBase, ...rest] : rest;
}
