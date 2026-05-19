import { useEffect, useState } from "react";
import { findAllSourceStyles, groupKey } from "../css";
import type { RuleGroup } from "../types";

export function useStyleEditor(selected: Element | null, send: (data: object) => void) {
	const [ruleGroups, setRuleGroups] = useState<RuleGroup[]>([]);
	const [activeIdx, setActiveIdx] = useState(0);
	const [groupStyles, setGroupStyles] = useState<Record<string, Record<string, string>>>({});
	const [allPending, setAllPending] = useState<Record<string, Record<string, string>>>({});
	const [newProp, setNewProp] = useState("");
	const [newValue, setNewValue] = useState("");
	const [serverError, setServerError] = useState<string | null>(null);

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

	const applyToFile = () => {
		setServerError(null);
		Object.entries(allPending).forEach(([key, changes]) => {
			const group = ruleGroups.find((g) => groupKey(g) === key);
			if (!group) return;
			Object.entries(changes).forEach(([prop, value]) => {
				send({
					fileUrl: group.fileUrl,
					selector: group.selector,
					prop,
					value,
					mediaQuery: group.mediaQuery,
				});
			});
		});
		setGroupStyles((prev) => {
			const next = { ...prev };
			Object.entries(allPending).forEach(([key, changes]) => {
				next[key] = { ...next[key], ...changes };
			});
			return next;
		});
		setAllPending({});
	};

	const totalPending = Object.values(allPending).reduce((sum, g) => sum + Object.keys(g).length, 0);

	return {
		ruleGroups,
		activeIdx,
		setActiveIdx,
		activeGroup,
		activeStyles,
		activePending,
		newProp,
		setNewProp,
		newValue,
		setNewValue,
		serverError,
		setServerError,
		handleChange,
		handleAdd,
		applyToFile,
		totalPending,
	};
}
