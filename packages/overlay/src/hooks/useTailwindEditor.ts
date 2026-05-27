import { useState, useMemo, useRef } from "react";
import { getTailwindClasses } from "../css";

export interface TailwindEditorState {
	classes: string[];
	pending: Map<string, string>;
	handleSwap: (oldCls: string, newCls: string) => void;
	handleRemove: (cls: string) => void;
	reset: () => void;
	hasPending: boolean;
}

export function useTailwindEditor(selected: Element | null): TailwindEditorState {
	const [pending, setPending] = useState<Map<string, string>>(new Map());
	const prevEl = useRef<Element | null>(null);
	const originalClassName = useRef<string>("");

	if (prevEl.current !== selected) {
		// Restore DOM on previous element before switching
		if (prevEl.current) {
			prevEl.current.className = originalClassName.current;
		}
		prevEl.current = selected;
		originalClassName.current = selected?.className ?? "";
		setPending(new Map());
	}

	const classes = useMemo(() => {
		if (!selected) return [];
		return getTailwindClasses(selected);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [selected]);

	const handleSwap = (oldCls: string, newCls: string) => {
		setPending((m) => new Map(m).set(oldCls, newCls));
		if (selected) {
			selected.classList.remove(oldCls);
			if (newCls) selected.classList.add(newCls);
		}
	};

	const handleRemove = (cls: string) => {
		setPending((m) => new Map(m).set(cls, ""));
		selected?.classList.remove(cls);
	};

	const reset = () => {
		if (prevEl.current) {
			prevEl.current.className = originalClassName.current;
		}
		setPending(new Map());
	};

	return { classes, pending, handleSwap, handleRemove, reset, hasPending: pending.size > 0 };
}
