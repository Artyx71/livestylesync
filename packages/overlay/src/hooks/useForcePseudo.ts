import { useEffect, useRef, useState } from "react";

export const PSEUDO_STATES = [":hover", ":focus", ":active"] as const;
export type PseudoState = typeof PSEUDO_STATES[number];

const CLASS_MAP: Record<PseudoState, string> = {
	":hover": "lss-force-hover",
	":focus": "lss-force-focus",
	":active": "lss-force-active",
};

function collectForcedCss(el: Element, pseudos: Set<PseudoState>): string {
	if (pseudos.size === 0) return "";
	const lines: string[] = [];

	for (const sheet of Array.from(document.styleSheets)) {
		try {
			collectFromRules(sheet.cssRules, el, pseudos, lines);
		} catch { /* cross-origin */ }
	}
	return lines.join("\n");
}

function collectFromRules(
	rules: CSSRuleList,
	el: Element,
	pseudos: Set<PseudoState>,
	out: string[]
): void {
	for (const rule of Array.from(rules)) {
		if (rule instanceof CSSStyleRule) {
			for (const pseudo of pseudos) {
				if (!rule.selectorText.includes(pseudo)) continue;
				const base = rule.selectorText.replace(
					new RegExp(pseudo.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"),
					""
				).trim();
				if (!base) continue;
				try { if (!el.matches(base)) continue; } catch { continue; }
				const forced = rule.selectorText.replace(
					new RegExp(pseudo.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"),
					`.${CLASS_MAP[pseudo]}`
				);
				out.push(`${forced} { ${rule.style.cssText} }`);
			}
		}
		const nested = (rule as unknown as { cssRules?: CSSRuleList }).cssRules;
		if (nested) collectFromRules(nested, el, pseudos, out);
	}
}

export function useForcePseudo(selected: Element | null) {
	const [active, setActive] = useState<Set<PseudoState>>(new Set());
	const styleEl = useRef<HTMLStyleElement | null>(null);
	const prevEl = useRef<Element | null>(null);

	// reset when element changes
	useEffect(() => {
		if (prevEl.current !== selected) {
			resetClasses(prevEl.current, active);
			styleEl.current?.remove();
			styleEl.current = null;
			setActive(new Set());
			prevEl.current = selected;
		}
	});

	const applyStyle = (el: Element, next: Set<PseudoState>) => {
		if (!styleEl.current) {
			styleEl.current = document.createElement("style");
			styleEl.current.id = "lss-force-pseudo";
			document.head.appendChild(styleEl.current);
		}
		styleEl.current.textContent = collectForcedCss(el, next);
	};

	const toggle = (pseudo: PseudoState) => {
		if (!selected) return;
		setActive((prev) => {
			const next = new Set(prev);
			if (next.has(pseudo)) {
				next.delete(pseudo);
				selected.classList.remove(CLASS_MAP[pseudo]);
			} else {
				next.add(pseudo);
				selected.classList.add(CLASS_MAP[pseudo]);
			}
			applyStyle(selected, next);
			return next;
		});
	};

	const reset = () => {
		if (selected) resetClasses(selected, active);
		styleEl.current?.remove();
		styleEl.current = null;
		setActive(new Set());
	};

	return { active, toggle, reset };
}

function resetClasses(el: Element | null, active: Set<PseudoState>) {
	if (!el) return;
	for (const pseudo of active) el.classList.remove(CLASS_MAP[pseudo]);
}
