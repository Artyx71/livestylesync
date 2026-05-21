import { useEffect, useState } from "react";

export function useElementSearch(
	overlayRootRef: React.RefObject<HTMLDivElement | null>,
	searchHighlightRef: React.RefObject<HTMLDivElement | null>,
	setSelected: (el: Element) => void,
) {
	const [query, setQuery] = useState("");
	const [matches, setMatches] = useState<Element[]>([]);
	const [focusIdx, setFocusIdx] = useState(0);

	const filter = (els: Element[]) =>
		els.filter((el) => !overlayRootRef.current?.contains(el));

	const search = (q: string) => {
		setQuery(q);
		if (!q.trim()) { setMatches([]); return; }
		const trimmed = q.trim();
		if (trimmed === "*") { setMatches([]); return; }
		let results: Element[] = [];

		try {
			results = filter(Array.from(document.querySelectorAll(trimmed)));
		} catch { /* invalid selector */ }

		// bare word → also try .class and #id
		if (results.length === 0 && !trimmed.startsWith(".") && !trimmed.startsWith("#")) {
			try {
				const byClass = filter(Array.from(document.querySelectorAll(`.${trimmed}`)));
				const byIdEl = document.querySelector(`#${trimmed}`);
				const byId = byIdEl && !overlayRootRef.current?.contains(byIdEl) ? [byIdEl] : [];
				results = [...byId, ...byClass];
			} catch { /* skip */ }
		}

		setMatches(results);
		setFocusIdx(0);
	};

	useEffect(() => {
		const h = searchHighlightRef.current;
		if (!h) return;
		if (matches.length === 0) { h.style.display = "none"; return; }
		const el = matches[Math.min(focusIdx, matches.length - 1)];
		const rect = el.getBoundingClientRect();
		h.style.display = "block";
		h.style.top = rect.top + "px";
		h.style.left = rect.left + "px";
		h.style.width = rect.width + "px";
		h.style.height = rect.height + "px";
		el.scrollIntoView({ block: "nearest", behavior: "smooth" });
	}, [matches, focusIdx, searchHighlightRef]);

	const select = () => {
		const el = matches[Math.min(focusIdx, matches.length - 1)];
		if (el) { setSelected(el); clear(); }
	};

	const next = () => setFocusIdx((i) => (i + 1) % matches.length);
	const prev = () => setFocusIdx((i) => (i - 1 + matches.length) % matches.length);

	const clear = () => {
		setQuery("");
		setMatches([]);
		setFocusIdx(0);
		if (searchHighlightRef.current) searchHighlightRef.current.style.display = "none";
	};

	return { query, search, matches, focusIdx, next, prev, select, clear };
}
