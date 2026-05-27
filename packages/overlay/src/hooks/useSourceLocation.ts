import { useMemo } from "react";

export interface SourceLocation {
	fileUrl: string;
	line: number;
}

// Accept only app source files — reject anything from build tooling / node_modules
function isAppSource(path: string): boolean {
	return (
		/\.(tsx?|jsx?|vue|svelte)$/.test(path) &&
		!path.includes(".vite") &&
		!path.includes("node_modules") &&
		!path.includes("@react-refresh")
	);
}

function parseDebugStack(el: Element): SourceLocation | null {
	const key = Object.keys(el).find((k) => k.startsWith("__reactFiber$"));
	if (!key) return null;

	// Captures path (stops at ? or :), optional query param, then :line:col
	// Handles Vite's ?t=<timestamp> cache-buster
	const FRAME_RE = /\(https?:\/\/[^/]+(\/[^?):]+)(?:[^):]*)?:(\d+):\d+\)/g;

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let fiber = (el as any)[key];
	while (fiber) {
		const stack = fiber._debugStack;
		if (stack?.stack) {
			const frames = [...stack.stack.matchAll(FRAME_RE)];
			for (const m of frames) {
				if (!isAppSource(m[1])) continue;
				return { fileUrl: m[1], line: parseInt(m[2]) };
			}
		}
		fiber = fiber.return;
	}
	return null;
}

export function useSourceLocation(selected: Element | null): SourceLocation | null {
	return useMemo(() => {
		if (!selected) return null;
		try {
			return parseDebugStack(selected);
		} catch {
			return null;
		}
	}, [selected]);
}
