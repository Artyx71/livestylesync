import { useEffect, useRef, useState } from "react";
import { useWebSocket } from "./useWebSocket";
import { useElementPicker } from "./hooks/useElementPicker";
import { useStyleEditor } from "./hooks/useStyleEditor";
import { useCreateRule } from "./hooks/useCreateRule";
import { useElementSearch } from "./hooks/useElementSearch";
import { useDraggable } from "./hooks/useDraggable";
import { useResizable } from "./hooks/useResizable";
import { useRootVars } from "./hooks/useRootVars";
import { useScssVars } from "./hooks/useScssVars";
import { useComponentInfo } from "./hooks/useComponentInfo";
import { useTailwindEditor } from "./hooks/useTailwindEditor";
import { useSourceLocation } from "./hooks/useSourceLocation";
import { useForcePseudo } from "./hooks/useForcePseudo";
import { useViewport } from "./hooks/useViewport";
import { useSession } from "./hooks/useSession";
import { groupKey } from "./css";
import { ElementSearchBar } from "./components/ElementSearchBar";
import { CssVarsPanel } from "./components/CssVarsPanel";
import { ViewportSwitcher } from "./components/ViewportSwitcher";
import { ScssVarsPanel } from "./components/ScssVarsPanel";
import { StyleEditor } from "./components/StyleEditor";
import { SessionHistory } from "./components/SessionHistory";
import type { LogEntry, ScssVar } from "./types";

export function Overlay({ port = 3100 }: { port?: number }) {
	const [open, setOpen] = useState(false);
	const [varsOpen, setVarsOpen] = useState(false);
	const [scssVarsOpen, setScssVarsOpen] = useState(false);
	const [historyOpen, setHistoryOpen] = useState(false);
	const [toast, setToast] = useState(false);
	const [editorUrl, setEditorUrl] = useState<string | null>(null);

	const overlayRootRef = useRef<HTMLDivElement>(null);
	const searchHighlightRef = useRef<HTMLDivElement>(null);
	const lastAction = useRef<"css" | "scss-var">("css");
	const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
	const selectedRef = useRef<Element | null>(null);

	const { picking, setPicking, selected, setSelected, highlightRef } = useElementPicker(overlayRootRef);
	selectedRef.current = selected;
	const { pos, onMouseDown: onDragStart } = useDraggable({ x: window.innerWidth - 320, y: window.innerHeight - 500 });
	const { width, onResizeMouseDown } = useResizable(300);

	const { send, status } = useWebSocket(`ws://localhost:${port}`, (data) => {
		if (!data || typeof data !== "object") return;
		const msg = data as Record<string, unknown>;
		if (msg.type === "error") {
			const message = (msg as Record<string, string>).message ?? "Unknown error";
			if (lastAction.current === "scss-var") {
				scssVars.setError(message);
			} else {
				editor.setServerError(message);
			}
		}
		if (msg.type === "files") cr.handleFiles(msg.files as string[]);
		if (msg.type === "scss-vars") scssVars.handleVars(msg.vars as ScssVar[]);
		if (msg.type === "patched") {
			const fl = msg.fileUrl as string | undefined;
			const ln = msg.line as number | undefined;
			if (fl && ln) setEditorUrl(`vscode://file/${fl}:${ln}`);
			showToast();
			if (session.pendingRefresh.current) {
				session.pendingRefresh.current = false;
				setTimeout(() => editor.refresh(), 300);
			}
		}
	});

	const elSearch = useElementSearch(overlayRootRef, searchHighlightRef, setSelected);
	const cr = useCreateRule(selected, send, () => {});
	const editor = useStyleEditor(selected, send);
	const session = useSession({ send, selected, selectedRef });
	const rootVars = useRootVars(send);
	const scssVars = useScssVars(send);
	const componentInfo = useComponentInfo(selected);
	const tw = useTailwindEditor(selected);
	const forcePseudo = useForcePseudo(selected);
	const viewport = useViewport();
	const sourceLocation = useSourceLocation(selected);

	const showToast = () => {
		if (toastTimer.current) clearTimeout(toastTimer.current);
		setToast(true);
		toastTimer.current = setTimeout(() => setToast(false), 2000);
	};

	useEffect(() => {
		const handler = (e: KeyboardEvent) => {
			if (e.altKey && e.key === "s") { e.preventDefault(); setOpen((v) => !v); }
		};
		document.addEventListener("keydown", handler);
		return () => document.removeEventListener("keydown", handler);
	}, []);

	const handleApply = () => {
		lastAction.current = "css";
		const entries: LogEntry[] = [];
		Object.entries(editor.allPending).forEach(([key, changes]) => {
			const group = editor.ruleGroups.find((g) => groupKey(g) === key);
			if (!group) return;
			Object.entries(changes).forEach(([prop, value]) => {
				const stateKey = `${group.fileUrl}|||${group.selector}|||${prop}|||${group.mediaQuery ?? ""}`;
				const oldValue = session.appliedState.current.get(stateKey) ?? group.styles[prop] ?? "";
				entries.push({ fileUrl: group.fileUrl, selector: group.selector, prop, value, oldValue, mediaQuery: group.mediaQuery, timestamp: Date.now() });
				session.appliedState.current.set(stateKey, value);
			});
		});
		session.pushBatch(entries);
		editor.applyToFile(editor.groupStyles);
	};

	const handleVarsApply = () => {
		const entries: LogEntry[] = [];
		Object.entries(rootVars.pending).forEach(([name, value]) => {
			const def = rootVars.vars.find((v) => v.name === name);
			if (!def) return;
			const stateKey = `${def.fileUrl}|||${def.selector}|||${name}|||`;
			const oldValue = session.appliedState.current.get(stateKey) ?? def.value;
			entries.push({ fileUrl: def.fileUrl, selector: def.selector, prop: name, value, oldValue, timestamp: Date.now() });
			session.appliedState.current.set(stateKey, value);
		});
		session.pushBatch(entries);
		rootVars.apply();
	};

	const handleScssVarsApply = () => {
		lastAction.current = "scss-var";
		const entries: LogEntry[] = [];
		Object.entries(scssVars.pending).forEach(([key, value]) => {
			const sep = key.indexOf("|||");
			const fileUrl = key.slice(0, sep);
			const name = key.slice(sep + 3);
			const def = scssVars.vars.find((v) => v.fileUrl === fileUrl && v.name === name);
			if (!def) return;
			const oldValue = session.appliedState.current.get(key) ?? def.value;
			entries.push({ fileUrl, selector: "$scss-var", prop: name, value, oldValue, isScssVar: true, timestamp: Date.now() });
			session.appliedState.current.set(key, value);
		});
		session.pushBatch(entries);
		scssVars.apply();
	};

	const handleTailwindApply = () => {
		lastAction.current = "css";
		tw.pending.forEach((newCls, oldCls) => {
			send({ type: "patch-tailwind", classes: tw.classes, oldClass: oldCls, newClass: newCls });
		});
		tw.reset();
	};

	const handleUndo = () => {
		session.undoLast();
		editor.setServerError(null);
	};

	return (
		<>
			<div ref={highlightRef} style={{ display: "none", position: "fixed", pointerEvents: "none", outline: "2px solid #3B82F6", background: "rgba(59,130,246,0.08)", zIndex: 9998 }} />
			<div ref={searchHighlightRef} style={{ display: "none", position: "fixed", pointerEvents: "none", outline: "2px solid #10b981", background: "rgba(16,185,129,0.08)", zIndex: 9998 }} />

			{toast && (
				<div style={{ position: "fixed", bottom: 40, right: 20, background: "#065f46", color: "#6ee7b7", border: "1px solid #059669", borderRadius: 6, padding: "4px 10px", fontFamily: "monospace", fontSize: 11, zIndex: 10000, pointerEvents: "none" }}>
					✓ Saved
				</div>
			)}

			<button
				onClick={() => setOpen((v) => !v)}
				title="Toggle LiveStyleSync (Alt+S)"
				style={{ position: "fixed", bottom: 20, right: 20, width: 12, height: 12, borderRadius: "50%", background: open ? "#5B21B6" : "#7C3AED", border: "none", cursor: "pointer", zIndex: 9999, padding: 0 }}
			/>

			{open && (
				<div ref={overlayRootRef} data-testid="lss-overlay" style={{ position: "fixed", left: pos.x, top: pos.y, width, maxHeight: "70vh", overflowY: "auto", background: "#1a1a2e", border: "1px solid #7C3AED", borderRadius: 8, padding: 16, zIndex: 9999, color: "#fff", fontFamily: "monospace", fontSize: 12, boxSizing: "border-box" }}>
					<div onMouseDown={onResizeMouseDown} style={{ position: "absolute", top: 0, right: 0, width: 6, height: "100%", cursor: "ew-resize", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "0 8px 8px 0" }}>
						<div style={{ width: 2, height: 24, background: "#4f46e5", borderRadius: 1, opacity: 0.5 }} />
					</div>

					<div onMouseDown={onDragStart} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, cursor: "grab", userSelect: "none" }}>
						<span style={{ fontSize: 13 }}>LiveStyleSync</span>
						<span title={status} style={{ width: 8, height: 8, borderRadius: "50%", background: status === "connected" ? "#10b981" : status === "reconnecting" ? "#f59e0b" : "#ef4444", flexShrink: 0 }} />
					</div>

					{status !== "connected" && (
						<div style={{
							margin: "0 0 8px",
							padding: "5px 8px",
							background: status === "reconnecting" ? "#451a03" : "#1c1917",
							border: "1px solid " + (status === "reconnecting" ? "#92400e" : "#44403c"),
							borderRadius: 5,
							color: status === "reconnecting" ? "#fbbf24" : "#a8a29e",
							fontSize: 10,
							fontFamily: "monospace",
						}}>
							{status === "reconnecting" ? "⟳ Reconnecting to dev server..." : "✗ Dev server not running"}
						</div>
					)}

					<button
						onClick={() => setPicking((v) => !v)}
						style={{ width: "100%", padding: "8px 0", background: picking ? "#3B82F6" : "#2d2d4e", color: "#fff", border: "1px solid " + (picking ? "#3B82F6" : "#555"), borderRadius: 6, cursor: "pointer", fontFamily: "monospace", fontSize: 12 }}
					>
						{picking ? "⊙ Click on element..." : "↖ Select Element"}
					</button>

					<ViewportSwitcher viewport={viewport} />

					<ElementSearchBar {...elSearch} />

					<CssVarsPanel
						open={varsOpen}
						onToggle={() => { const next = !varsOpen; setVarsOpen(next); if (next) rootVars.load(); }}
						vars={rootVars.vars}
						pending={rootVars.pending}
						hasPending={rootVars.hasPending}
						onChange={rootVars.handleChange}
						onApply={handleVarsApply}
						onReset={rootVars.reset}
					/>

					<ScssVarsPanel
						open={scssVarsOpen}
						onToggle={() => { const next = !scssVarsOpen; setScssVarsOpen(next); if (next) scssVars.load(); }}
						vars={scssVars.vars}
						pending={scssVars.pending}
						hasPending={scssVars.hasPending}
						error={scssVars.error}
						onChange={scssVars.handleChange}
						onApply={handleScssVarsApply}
						onReset={scssVars.reset}
					/>

					{selected && (
						<StyleEditor
							selected={selected}
							setSelected={setSelected}
							editor={editor}
							cr={cr}
							tw={tw}
							forcePseudo={forcePseudo}
							hasBatches={session.hasBatches}
							onApply={handleApply}
							onUndo={handleUndo}
							onTailwindApply={handleTailwindApply}
							editorUrl={editorUrl}
							componentInfo={componentInfo}
						/>
					)}

					<SessionHistory
						batches={session.batches}
						open={historyOpen}
						onToggle={() => setHistoryOpen((v) => !v)}
						onRestore={session.restore}
						onExport={session.exportDiff}
						copied={session.copied}
					/>
				</div>
			)}
		</>
	);
}
