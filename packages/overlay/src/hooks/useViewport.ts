import { useState, useRef } from "react";

export const BREAKPOINTS = [
	{ label: "375", width: 375 },
	{ label: "768", width: 768 },
	{ label: "1024", width: 1024 },
] as const;

export function useViewport() {
	const [active, setActive] = useState<number | null>(null);
	const styleEl = useRef<HTMLStyleElement | null>(null);

	const setWidth = (width: number | null) => {
		if (!styleEl.current) {
			styleEl.current = document.createElement("style");
			styleEl.current.id = "lss-viewport";
			document.head.appendChild(styleEl.current);
		}
		if (width === null) {
			styleEl.current.textContent = "";
		} else {
			styleEl.current.textContent =
				`body { max-width: ${width}px !important; overflow-x: hidden !important; }`;
		}
		setActive(width);
	};

	const toggle = (width: number) => {
		setWidth(active === width ? null : width);
	};

	const reset = () => setWidth(null);

	return { active, setWidth, toggle, reset, BREAKPOINTS };
}
