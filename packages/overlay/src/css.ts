import type { RawRule, RootVar, RuleGroup } from "./types";

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
	const isContainer = mq.startsWith("@container");
	const inner = isContainer ? mq.slice("@container".length).trim() : mq;
	const prefix = isContainer ? "@c " : "";
	const maxW = /max-width:\s*(\d+\w*)/.exec(inner);
	const minW = /min-width:\s*(\d+\w*)/.exec(inner);
	if (maxW) return `${prefix}≤${maxW[1]}`;
	if (minW) return `${prefix}≥${minW[1]}`;
	return isContainer ? "@container" : "@media";
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
		} else if (
			!(rule instanceof CSSMediaRule) &&
			!(rule instanceof CSSSupportsRule) &&
			(rule as unknown as { conditionText?: string }).conditionText !== undefined &&
			(rule as unknown as { cssRules?: CSSRuleList }).cssRules
		) {
			// @container — has conditionText but is not @media or @supports
			const cr = rule as unknown as { conditionText: string; cssRules: CSSRuleList };
			collectRawRules(cr.cssRules, parentSelectors, `@container ${cr.conditionText}`, result);
		} else if ((rule as unknown as { cssRules?: CSSRuleList }).cssRules) {
			// @layer and other container at-rules
			collectRawRules(
				(rule as unknown as { cssRules: CSSRuleList }).cssRules,
				parentSelectors,
				mediaQuery,
				result,
			);
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

// Tailwind v3: uses --tw- variables; v4: emits @layer theme/base/utilities blocks
const TAILWIND_LAYERS = new Set(["theme", "base", "utilities", "components"]);

export function isTailwindSheet(sheet: CSSStyleSheet): boolean {
	try {
		for (const rule of Array.from(sheet.cssRules)) {
			if (rule.cssText.includes("--tw-")) return true;
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const name = (rule as any).name;
			if (typeof name === "string" && TAILWIND_LAYERS.has(name)) return true;
		}
	} catch { /* cross-origin */ }
	return false;
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

		const sheetIsTailwind = isTailwindSheet(sheet);
		const rawRules = collectRawRules(sheetRules);

		for (const raw of rawRules) {
			const effectiveRaw = resolveRawSelector(raw.selectorText, raw.parentSelectors);
			const { mediaQuery } = raw;

			if (!effectiveRaw || effectiveRaw === "&") continue;
			// Skip selectors where any comma-part is the universal selector — matches every element
			const selParts = effectiveRaw.split(",").map((s) => s.trim());
			if (selParts.some((p) => p === "*" || p.startsWith("*:") || p.startsWith("* "))) continue;

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

			const isCssModule = /\.module\.css(\?|$)/.test(fileUrl);
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

			const cleanUrl = (isVue || isCssModule) ? fileUrl.split("?")[0] : fileUrl;

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
			const group: RuleGroup = { fileUrl: cleanUrl, selector, label, styles, mediaQuery, isTailwind: sheetIsTailwind || undefined };

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

function collectRootVars(rules: CSSRuleList, fileUrl: string, vars: RootVar[], seen: Set<string>): void {
	for (const rule of Array.from(rules)) {
		if (rule instanceof CSSStyleRule) {
			if (rule.selectorText === ":root" || rule.selectorText === "html") {
				for (const prop of Array.from(rule.style)) {
					if (!prop.startsWith("--")) continue;
					const key = `${prop}|||${fileUrl}`;
					if (seen.has(key)) continue;
					seen.add(key);
					vars.push({ name: prop, value: rule.style.getPropertyValue(prop).trim(), fileUrl, selector: rule.selectorText });
				}
			}
		} else if (!(rule instanceof CSSMediaRule) && (rule as unknown as { cssRules?: CSSRuleList }).cssRules) {
			// recurse into @layer, @supports, @container — but NOT @media (skip dark-mode overrides)
			collectRootVars((rule as unknown as { cssRules: CSSRuleList }).cssRules, fileUrl, vars, seen);
		}
	}
}

function collectTailwindSelectors(rules: CSSRuleList, out: Set<string>): void {
	for (const rule of Array.from(rules)) {
		if (rule instanceof CSSStyleRule) {
			out.add(rule.selectorText);
		} else if ((rule as unknown as { cssRules?: CSSRuleList }).cssRules) {
			collectTailwindSelectors((rule as unknown as { cssRules: CSSRuleList }).cssRules, out);
		}
	}
}

export function getTailwindClasses(el: Element): string[] {
	const classList = Array.from(el.classList);
	if (classList.length === 0) return [];

	const tailwindSelectors = new Set<string>();
	for (const sheet of Array.from(document.styleSheets)) {
		if (!isTailwindSheet(sheet)) continue;
		try {
			collectTailwindSelectors(sheet.cssRules, tailwindSelectors);
		} catch { /* cross-origin */ }
	}

	return classList.filter((cls) => {
		const escaped = CSS.escape(cls);
		return [...tailwindSelectors].some((sel) => sel.includes("." + escaped));
	});
}

export function findRootVars(): RootVar[] {
	const vars: RootVar[] = [];
	const seen = new Set<string>();

	for (const sheet of Array.from(document.styleSheets)) {
		let fileUrl: string | null = sheet.href;
		if (!fileUrl && sheet.ownerNode instanceof HTMLElement) {
			fileUrl = sheet.ownerNode.getAttribute("data-vite-dev-id");
		}
		if (!fileUrl) continue;

		let rules: CSSRuleList;
		try { rules = sheet.cssRules; } catch { continue; }

		collectRootVars(rules, fileUrl.split("?")[0], vars, seen);
	}
	return vars;
}
