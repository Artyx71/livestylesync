import { useEffect, useState } from "react";
import { findAllSourceStyles, groupKey } from "../css";
import type { RuleGroup } from "../types";

type UndoEntry = { fileUrl: string; selector: string; prop: string; oldValue: string; mediaQuery?: string }[];

export function useStyleEditor(selected: Element | null, send: (data: object) => void) {
	const [ruleGroups, setRuleGroups] = useState<RuleGroup[]>([]);
	const [activeIdx, setActiveIdx] = useState(0);
	const [groupStyles, setGroupStyles] = useState<Record<string, Record<string, string>>>({});
	const [allPending, setAllPending] = useState<Record<string, Record<string, string>>>({});
	const [newProp, setNewProp] = useState("");
	const [newValue, setNewValue] = useState("");
	const [serverError, setServerError] = useState<string | null>(null);
	const [undoStack, setUndoStack] = useState<UndoEntry[]>([]);

	useEffect(() => {
		if (!selected) return;
		const groups = findAllSourceStyles(selected);
		setRuleGroups(groups);
		setActiveIdx(0);
		setGroupStyles(Object.fromEntries(groups.map((g) => [groupKey(g), g.styles])));
		setAllPending({});
		setNewProp("");
		setNewValue("");
		setServerError(null);
		setUndoStack([]);
	}, [selected]);

	const activeGroup = ruleGroups[activeIdx] ?? null;
	const activeStyles = activeGroup ? (groupStyles[groupKey(activeGroup)] ?? {}) : {};
	const activePending = activeGroup ? (allPending[groupKey(activeGroup)] ?? {}) : {};

	const handleChange = (prop: string, value: string) => {
		if (!activeGroup) return;
		const key = groupKey(activeGroup);
		(selected as HTMLElement)?.style.setProperty(prop, value);
		setGroupStyles((prev) => ({ ...prev, [key]: { ...prev[key], [prop]: value } }));
		setAllPending((prev) => ({ ...prev, [key]: { ...prev[key], [prop]: value } }));
	};

	const handleAdd = () => {
		const prop = newProp.trim();
		const value = newValue.trim();
		if (!prop || !value || !activeGroup) return;
		const key = groupKey(activeGroup);
		(selected as HTMLElement)?.style.setProperty(prop, value);
		setGroupStyles((prev) => ({ ...prev, [key]: { ...prev[key], [prop]: value } }));
		setAllPending((prev) => ({ ...prev, [key]: { ...prev[key], [prop]: value } }));
		setNewProp("");
		setNewValue("");
	};

	const applyToFile = (currentGroupStyles: Record<string, Record<string, string>>) => {
		setServerError(null);

		const undoEntry: UndoEntry = [];

		Object.entries(allPending).forEach(([key, changes]) => {
			const group = ruleGroups.find((g) => groupKey(g) === key);
			if (!group) return;
			Object.entries(changes).forEach(([prop, value]) => {
				undoEntry.push({
					fileUrl: group.fileUrl,
					selector: group.selector,
					prop,
					oldValue: group.styles[prop] ?? "",
					mediaQuery: group.mediaQuery,
				});
				send({ fileUrl: group.fileUrl, selector: group.selector, prop, value, mediaQuery: group.mediaQuery });
			});
		});

		if (undoEntry.length > 0) {
			setUndoStack((prev) => [...prev, undoEntry]);
		}

		setGroupStyles((prev) => {
			const next = { ...prev };
			Object.entries(allPending).forEach(([key, changes]) => {
				next[key] = { ...next[key], ...changes };
			});
			return next;
		});
		setAllPending({});
	};

	const undo = () => {
		if (undoStack.length === 0) return;
		const entry = undoStack[undoStack.length - 1];
		setUndoStack((prev) => prev.slice(0, -1));
		setServerError(null);

		entry.forEach(({ fileUrl, selector, prop, oldValue, mediaQuery }) => {
			send({ fileUrl, selector, prop, value: oldValue, mediaQuery });
			(selected as HTMLElement)?.style.setProperty(prop, oldValue);
		});

		setGroupStyles((prev) => {
			const next = { ...prev };
			entry.forEach(({ selector, prop, oldValue, mediaQuery }) => {
				const key = selector + (mediaQuery ?? "");
				if (next[key]) next[key] = { ...next[key], [prop]: oldValue };
			});
			return next;
		});
	};

	const totalPending = Object.values(allPending).reduce((sum, g) => sum + Object.keys(g).length, 0);

	return {
		ruleGroups,
		activeIdx,
		setActiveIdx,
		activeGroup,
		activeStyles,
		activePending,
		allPending,
		groupStyles,
		newProp,
		setNewProp,
		newValue,
		setNewValue,
		serverError,
		setServerError,
		handleChange,
		handleAdd,
		applyToFile,
		undo,
		canUndo: undoStack.length > 0,
		totalPending,
	};
}
