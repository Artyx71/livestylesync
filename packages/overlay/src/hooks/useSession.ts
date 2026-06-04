import { useEffect, useMemo, useRef, useState } from "react";
import type { LogBatch, LogEntry } from "../types";

type SendFn = (data: object) => void;

const STORAGE_KEY = `lss:batches:${location.origin}`;

function loadStored(): { batches: LogBatch[]; batchId: number } {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return { batches: [], batchId: 0 };
		return JSON.parse(raw);
	} catch {
		return { batches: [], batchId: 0 };
	}
}

function saveStored(batches: LogBatch[], id: number) {
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify({ batches, batchId: id }));
	} catch { /* quota exceeded */ }
}

export function useSession({
	send,
	selected,
	selectedRef,
}: {
	send: SendFn;
	selected: Element | null;
	selectedRef: React.RefObject<Element | null>;
}) {
	const stored = useMemo(() => loadStored(), []);
	const [batches, setBatches] = useState<LogBatch[]>(stored.batches);
	const [copied, setCopied] = useState(false);
	const appliedState = useRef(new Map<string, string>());
	const batchId = useRef(stored.batchId);
	const pendingRefresh = useRef(false);

	useEffect(() => {
		saveStored(batches, batchId.current);
	}, [batches]);

	useEffect(() => {
		appliedState.current.clear();
	}, [selected]);

	const pushBatch = (entries: LogEntry[]) => {
		if (entries.length === 0) return;
		setBatches((prev) => [...prev, { id: ++batchId.current, entries }]);
	};

	const undoLast = () => {
		setBatches((prev) => {
			if (prev.length === 0) return prev;
			const last = prev[prev.length - 1];
			last.entries.forEach((e) => {
				if (e.isScssVar) {
					send({ type: "patch-scss-var", fileUrl: e.fileUrl, name: e.prop, value: e.oldValue });
					appliedState.current.set(`${e.fileUrl}|||${e.prop}`, e.oldValue);
				} else {
					send({ fileUrl: e.fileUrl, selector: e.selector, prop: e.prop, value: e.oldValue, mediaQuery: e.mediaQuery });
					const stateKey = `${e.fileUrl}|||${e.selector}|||${e.prop}|||${e.mediaQuery ?? ""}`;
					appliedState.current.set(stateKey, e.oldValue);
					const cur = selectedRef.current;
					if (cur) {
						try {
							if (cur.matches(e.selector)) (cur as HTMLElement).style.setProperty(e.prop, e.oldValue);
						} catch { /* skip */ }
					}
				}
			});
			pendingRefresh.current = true;
			return prev.slice(0, -1);
		});
	};

	const restore = (batch: LogBatch) => {
		batch.entries.forEach((e) => {
			if (e.isScssVar) {
				send({ type: "patch-scss-var", fileUrl: e.fileUrl, name: e.prop, value: e.oldValue });
				appliedState.current.set(`${e.fileUrl}|||${e.prop}`, e.oldValue);
				return;
			}
			send({ fileUrl: e.fileUrl, selector: e.selector, prop: e.prop, value: e.oldValue, mediaQuery: e.mediaQuery });
			const stateKey = `${e.fileUrl}|||${e.selector}|||${e.prop}|||${e.mediaQuery ?? ""}`;
			appliedState.current.set(stateKey, e.oldValue);
			const cur = selectedRef.current;
			if (cur) {
				try {
					if (cur.matches(e.selector)) (cur as HTMLElement).style.setProperty(e.prop, e.oldValue);
				} catch { /* skip */ }
			}
		});
		pushBatch(batch.entries.map((e) => ({ ...e, value: e.oldValue, oldValue: e.value, timestamp: Date.now() })));
		pendingRefresh.current = true;
	};

	const exportDiff = () => {
		const final = new Map<string, LogEntry>();
		batches.flatMap((b) => b.entries).forEach((e) => final.set(`${e.fileUrl}|||${e.selector}|||${e.prop}`, e));

		const cssEntries = [...final.values()].filter((e) => !e.isScssVar);
		const scssVarEntries = [...final.values()].filter((e) => e.isScssVar);

		const byFile = new Map<string, LogEntry[]>();
		cssEntries.forEach((e) => {
			if (!byFile.has(e.fileUrl)) byFile.set(e.fileUrl, []);
			byFile.get(e.fileUrl)!.push(e);
		});

		let text = `/* LiveStyleSync session diff */\n\n`;
		if (scssVarEntries.length > 0) {
			text += `/* SCSS variables changed:\n`;
			scssVarEntries.forEach((e) => {
				text += `   ${e.prop}: ${e.value}; /* ${e.fileUrl.split("/").slice(-2).join("/")} */\n`;
			});
			text += `*/\n\n`;
		}
		for (const [file, entries] of byFile) {
			text += `/* ${file.split("/").slice(-2).join("/")} */\n`;
			const bySelector = new Map<string, LogEntry[]>();
			entries.forEach((e) => {
				const k = e.selector + (e.mediaQuery ? ` { @media ${e.mediaQuery} }` : "");
				if (!bySelector.has(k)) bySelector.set(k, []);
				bySelector.get(k)!.push(e);
			});
			for (const [, props] of bySelector) {
				const mq = props[0].mediaQuery;
				const sel = props[0].selector;
				if (mq) text += `@media ${mq} {\n  ${sel} {\n`;
				else text += `${sel} {\n`;
				props.forEach((p) => { text += mq ? `    ${p.prop}: ${p.value};\n` : `  ${p.prop}: ${p.value};\n`; });
				text += mq ? `  }\n}\n` : `}\n`;
			}
			text += "\n";
		}
		navigator.clipboard.writeText(text).then(() => {
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		});
	};

	const clearSession = () => {
		setBatches([]);
		localStorage.removeItem(STORAGE_KEY);
	};

	return {
		batches,
		hasBatches: batches.length > 0,
		pushBatch,
		undoLast,
		restore,
		exportDiff,
		clearSession,
		copied,
		appliedState,
		pendingRefresh,
	};
}
