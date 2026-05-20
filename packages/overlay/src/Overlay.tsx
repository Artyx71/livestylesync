import { useRef, useState } from "react";
import { useWebSocket } from "./useWebSocket";
import { useElementPicker } from "./hooks/useElementPicker";
import { useStyleEditor } from "./hooks/useStyleEditor";
import { BreadcrumbNav } from "./components/BreadcrumbNav";
import { GroupTabs } from "./components/GroupTabs";
import { StyleRows } from "./components/StyleRows";
import { AddPropertyRow } from "./components/AddPropertyRow";
import { useCreateRule } from "./hooks/useCreateRule";
import { useDraggable } from "./hooks/useDraggable";
import { useResizable } from "./hooks/useResizable";
import { useRootVars } from "./hooks/useRootVars";
import { useScssVars } from "./hooks/useScssVars";
import { groupKey } from "./css";

export function Overlay({ port = 3100 }: { port?: number }) {
	const [open, setOpen] = useState(false);
	const [varsOpen, setVarsOpen] = useState(false);
	const [scssVarsOpen, setScssVarsOpen] = useState(false);
	const [historyOpen, setHistoryOpen] = useState(false);
	const [copied, setCopied] = useState(false);

	type LogEntry = { fileUrl: string; selector: string; prop: string; value: string; oldValue: string; mediaQuery?: string; timestamp: number };
	type LogBatch = { id: number; entries: LogEntry[] };
	const [sessionBatches, setSessionBatches] = useState<LogBatch[]>([]);
	const appliedState = useRef(new Map<string, string>());
	const batchId = useRef(0);
	const overlayRootRef = useRef<HTMLDivElement>(null);
	const pendingRefresh = useRef(false);

	const { picking, setPicking, selected, setSelected, highlightRef } = useElementPicker(overlayRootRef);
	const { pos, onMouseDown: onDragStart } = useDraggable({ x: window.innerWidth - 320, y: window.innerHeight - 500 });
	const { width, onResizeMouseDown } = useResizable(300);

	const { send, status } = useWebSocket(`ws://localhost:${port}`, (data) => {
		if (!data || typeof data !== "object") return;
		const msg = data as Record<string, unknown>;
		if (msg.type === "error") {
			editor.setServerError((msg as Record<string, string>).message ?? "Unknown error");
		}
		if (msg.type === "files") {
			cr.handleFiles(msg.files as string[]);
		}
		if (msg.type === "scss-vars") {
			scssVars.handleVars(msg.vars as import("./types").ScssVar[]);
		}
		if (msg.type === "patched" && pendingRefresh.current) {
			pendingRefresh.current = false;
			setTimeout(() => editor.refresh(), 300);
		}
	});

	const cr = useCreateRule(selected, send, () => {});
	const editor = useStyleEditor(selected, send);
	const rootVars = useRootVars(send);
	const scssVars = useScssVars(send);

	const pushBatch = (entries: LogEntry[]) => {
		if (entries.length === 0) return;
		setSessionBatches((prev) => [...prev, { id: ++batchId.current, entries }]);
	};

	const handleApply = () => {
		const entries: LogEntry[] = [];
		Object.entries(editor.allPending).forEach(([key, changes]) => {
			const group = editor.ruleGroups.find((g) => groupKey(g) === key);
			if (!group) return;
			Object.entries(changes).forEach(([prop, value]) => {
				const stateKey = `${group.fileUrl}|||${group.selector}|||${prop}|||${group.mediaQuery ?? ""}`;
				const oldValue = appliedState.current.get(stateKey) ?? group.styles[prop] ?? "";
				entries.push({ fileUrl: group.fileUrl, selector: group.selector, prop, value, oldValue, mediaQuery: group.mediaQuery, timestamp: Date.now() });
				appliedState.current.set(stateKey, value);
			});
		});
		pushBatch(entries);
		editor.applyToFile(editor.groupStyles);
	};

	const handleVarsApply = () => {
		const entries: LogEntry[] = [];
		Object.entries(rootVars.pending).forEach(([name, value]) => {
			const def = rootVars.vars.find((v) => v.name === name);
			if (!def) return;
			const stateKey = `${def.fileUrl}|||${def.selector}|||${name}|||`;
			const oldValue = appliedState.current.get(stateKey) ?? def.value;
			entries.push({ fileUrl: def.fileUrl, selector: def.selector, prop: name, value, oldValue, timestamp: Date.now() });
			appliedState.current.set(stateKey, value);
		});
		pushBatch(entries);
		rootVars.apply();
	};

	const handleUndo = () => {
		setSessionBatches((prev) => {
			const last = prev[prev.length - 1];
			if (last) {
				last.entries.forEach((e) => {
					const stateKey = `${e.fileUrl}|||${e.selector}|||${e.prop}|||${e.mediaQuery ?? ""}`;
					appliedState.current.set(stateKey, e.oldValue);
				});
			}
			return prev.slice(0, -1);
		});
		editor.undo();
	};

	const restoreBatch = (batch: LogBatch) => {
		batch.entries.forEach((e) => {
			send({ fileUrl: e.fileUrl, selector: e.selector, prop: e.prop, value: e.oldValue, mediaQuery: e.mediaQuery });
			const stateKey = `${e.fileUrl}|||${e.selector}|||${e.prop}|||${e.mediaQuery ?? ""}`;
			appliedState.current.set(stateKey, e.oldValue);
			if (selected) {
				try {
					if (selected.matches(e.selector)) {
						(selected as HTMLElement).style.setProperty(e.prop, e.oldValue);
					}
				} catch { /* selector may not match current element */ }
			}
		});
		pushBatch(batch.entries.map((e) => ({ ...e, value: e.oldValue, oldValue: e.value, timestamp: Date.now() })));
		pendingRefresh.current = true;
	};

	const exportDiff = () => {
		const final = new Map<string, LogEntry>();
		sessionBatches.flatMap((b) => b.entries).forEach((e) => final.set(`${e.fileUrl}|||${e.selector}|||${e.prop}`, e));

		const byFile = new Map<string, LogEntry[]>();
		final.forEach((e) => {
			if (!byFile.has(e.fileUrl)) byFile.set(e.fileUrl, []);
			byFile.get(e.fileUrl)!.push(e);
		});

		let text = `/* LiveStyleSync session diff */\n\n`;
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

	const hasSource = editor.ruleGroups.length > 0;

	return (
		<>
			<div
				ref={highlightRef}
				style={{
					display: "none",
					position: "fixed",
					pointerEvents: "none",
					outline: "2px solid #3B82F6",
					background: "rgba(59,130,246,0.08)",
					zIndex: 9998,
				}}
			/>

			<button
				onClick={() => setOpen((v) => !v)}
				style={{
					position: "fixed",
					bottom: 20,
					right: 20,
					width: 12,
					height: 12,
					borderRadius: "50%",
					background: open ? "#5B21B6" : "#7C3AED",
					border: "none",
					cursor: "pointer",
					zIndex: 9999,
					padding: 0,
				}}
			/>

			{open && (
				<div ref={overlayRootRef} style={{
					position: "fixed",
					left: pos.x,
					top: pos.y,
					width,
					maxHeight: "70vh",
					overflowY: "auto",
					background: "#1a1a2e",
					border: "1px solid #7C3AED",
					borderRadius: 8,
					padding: 16,
					zIndex: 9999,
					color: "#fff",
					fontFamily: "monospace",
					fontSize: 12,
					boxSizing: "border-box",
				}}>
					<div
						onMouseDown={onResizeMouseDown}
						style={{
							position: "absolute",
							top: 0,
							right: 0,
							width: 6,
							height: "100%",
							cursor: "ew-resize",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							borderRadius: "0 8px 8px 0",
						}}
					>
						<div style={{
							width: 2,
							height: 24,
							background: "#4f46e5",
							borderRadius: 1,
							opacity: 0.5,
						}} />
					</div>
					<div
						onMouseDown={onDragStart}
						style={{
							display: "flex",
							alignItems: "center",
							justifyContent: "space-between",
							marginBottom: 10,
							cursor: "grab",
							userSelect: "none",
						}}
					>
						<span style={{ fontSize: 13 }}>LiveStyleSync</span>
						<span
							title={status}
							style={{
								width: 8,
								height: 8,
								borderRadius: "50%",
								background: status === "connected" ? "#10b981" : status === "reconnecting" ? "#f59e0b" : "#ef4444",
								flexShrink: 0,
							}}
						/>
					</div>

					<button
						onClick={() => setPicking((v) => !v)}
						style={{
							width: "100%",
							padding: "8px 0",
							background: picking ? "#3B82F6" : "#2d2d4e",
							color: "#fff",
							border: "1px solid " + (picking ? "#3B82F6" : "#555"),
							borderRadius: 6,
							cursor: "pointer",
							fontFamily: "monospace",
							fontSize: 12,
						}}
					>
						{picking ? "⊙ Кликни на элемент..." : "↖ Выбрать элемент"}
					</button>

					<button
						onClick={() => {
							const next = !varsOpen;
							setVarsOpen(next);
							if (next) rootVars.load();
						}}
						style={{
							width: "100%",
							padding: "6px 0",
							marginTop: 6,
							background: varsOpen ? "#1e1b4b" : "#2d2d4e",
							color: varsOpen ? "#a78bfa" : "#888",
							border: "1px solid " + (varsOpen ? "#4f46e5" : "#444"),
							borderRadius: 6,
							cursor: "pointer",
							fontFamily: "monospace",
							fontSize: 11,
						}}
					>
						{varsOpen ? "▾ CSS Variables" : "▸ CSS Variables"}
					</button>

					<button
						onClick={() => {
							const next = !scssVarsOpen;
							setScssVarsOpen(next);
							if (next) scssVars.load();
						}}
						style={{
							width: "100%",
							padding: "6px 0",
							marginTop: 6,
							background: scssVarsOpen ? "#1a1a2e" : "#2d2d4e",
							color: scssVarsOpen ? "#f59e0b" : "#888",
							border: "1px solid " + (scssVarsOpen ? "#d97706" : "#444"),
							borderRadius: 6,
							cursor: "pointer",
							fontFamily: "monospace",
							fontSize: 11,
						}}
					>
						{scssVarsOpen ? "▾ SCSS $variables" : "▸ SCSS $variables"}
					</button>

					{scssVarsOpen && (
						<div style={{ marginTop: 8 }}>
							{scssVars.vars.length === 0 ? (
								<p style={{ color: "#555", fontSize: 11, margin: 0 }}>No SCSS variables found</p>
							) : (
								<>
									{Object.entries(
										scssVars.vars.reduce<Record<string, typeof scssVars.vars>>((acc, v) => {
											const file = v.fileUrl.split("/").pop() ?? v.fileUrl;
											if (!acc[file]) acc[file] = [];
											acc[file].push(v);
											return acc;
										}, {})
									).map(([file, fileVars]) => (
										<div key={file}>
											<div style={{ color: "#555", fontSize: 9, marginBottom: 4, marginTop: 6 }}>{file}</div>
											{fileVars.map((v) => {
												const key = `${v.fileUrl}|||${v.name}`;
												const current = scssVars.pending[key] ?? v.value;
												const changed = key in scssVars.pending;
												return (
													<div key={key} style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 4 }}>
														<span
															title={v.name}
															style={{
																flex: 1,
																color: changed ? "#f59e0b" : "#888",
																fontSize: 10,
																overflow: "hidden",
																textOverflow: "ellipsis",
																whiteSpace: "nowrap",
															}}
														>
															{v.name}
														</span>
														<input
															value={current}
															onChange={(e) => scssVars.handleChange(v.fileUrl, v.name, e.target.value)}
															style={{
																width: 100,
																background: changed ? "#1a1a2e" : "#2d2d4e",
																color: "#fff",
																border: "1px solid " + (changed ? "#d97706" : "#444"),
																borderRadius: 3,
																padding: "2px 4px",
																fontFamily: "monospace",
																fontSize: 10,
															}}
														/>
													</div>
												);
											})}
										</div>
									))}
									{scssVars.hasPending && (
										<div style={{ display: "flex", gap: 4, marginTop: 6 }}>
											<button
												onClick={scssVars.apply}
												style={{
													flex: 1,
													padding: "4px 0",
													background: "#451a03",
													color: "#fcd34d",
													border: "1px solid #d97706",
													borderRadius: 4,
													cursor: "pointer",
													fontFamily: "monospace",
													fontSize: 10,
												}}
											>
												Apply
											</button>
											<button
												onClick={scssVars.reset}
												style={{
													padding: "4px 8px",
													background: "transparent",
													color: "#888",
													border: "1px solid #333",
													borderRadius: 4,
													cursor: "pointer",
													fontFamily: "monospace",
													fontSize: 10,
												}}
											>
												✕
											</button>
										</div>
									)}
								</>
							)}
						</div>
					)}

					{varsOpen && (
						<div style={{ marginTop: 8 }}>
							{rootVars.vars.length === 0 ? (
								<p style={{ color: "#555", fontSize: 11, margin: 0 }}>No :root variables found</p>
							) : (
								<>
									{rootVars.vars.map((v) => {
										const current = rootVars.pending[v.name] ?? v.value;
										const changed = v.name in rootVars.pending;
										return (
											<div key={v.name} style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 4 }}>
												<span
													title={v.name}
													style={{
														flex: 1,
														color: changed ? "#a78bfa" : "#888",
														fontSize: 10,
														overflow: "hidden",
														textOverflow: "ellipsis",
														whiteSpace: "nowrap",
													}}
												>
													{v.name}
												</span>
												<input
													value={current}
													onChange={(e) => rootVars.handleChange(v.name, e.target.value)}
													style={{
														width: 100,
														background: changed ? "#1e1b4b" : "#2d2d4e",
														color: "#fff",
														border: "1px solid " + (changed ? "#4f46e5" : "#444"),
														borderRadius: 3,
														padding: "2px 4px",
														fontFamily: "monospace",
														fontSize: 10,
													}}
												/>
											</div>
										);
									})}
									{rootVars.hasPending && (
										<div style={{ display: "flex", gap: 4, marginTop: 6 }}>
											<button
												onClick={handleVarsApply}
												style={{
													flex: 1,
													padding: "4px 0",
													background: "#065f46",
													color: "#6ee7b7",
													border: "1px solid #059669",
													borderRadius: 4,
													cursor: "pointer",
													fontFamily: "monospace",
													fontSize: 10,
												}}
											>
												Apply
											</button>
											<button
												onClick={rootVars.reset}
												style={{
													padding: "4px 8px",
													background: "transparent",
													color: "#888",
													border: "1px solid #333",
													borderRadius: 4,
													cursor: "pointer",
													fontFamily: "monospace",
													fontSize: 10,
												}}
											>
												✕
											</button>
										</div>
									)}
								</>
							)}
						</div>
					)}

					{selected && (
						<>
							<BreadcrumbNav selected={selected} onSelect={setSelected} />

							<GroupTabs
								groups={editor.ruleGroups}
								activeIdx={editor.activeIdx}
								allPending={editor.allPending}
								onSelect={editor.setActiveIdx}
							/>

							{editor.ruleGroups.some((g) => g.isTailwind) && (
								<p style={{ margin: "6px 0", fontSize: 10, color: "#f59e0b", lineHeight: 1.4 }}>
									⚠ Tailwind — changes won't persist. Edit classes in HTML instead.
								</p>
							)}

							{editor.activeGroup && Object.keys(editor.activeStyles).length > 0 && (
								<StyleRows
									styles={editor.activeStyles}
									pending={editor.activePending}
									onChange={editor.handleChange}
								/>
							)}
							{editor.activeGroup && Object.keys(editor.activeStyles).length === 0 && (
								<p style={{ color: "#555", fontSize: 11, margin: "8px 0" }}>No properties</p>
							)}
							{!hasSource && (
								<div style={{ marginTop: 8 }}>
									<p style={{ color: "#555", fontSize: 11, margin: "0 0 8px" }}>No CSS source found</p>
									{cr.files.length === 0 ? (
										<button
											onClick={cr.requestFiles}
											disabled={cr.loadingFiles}
											style={{
												width: "100%", padding: "6px 0",
												background: "#2d2d4e",
												color: cr.loadingFiles ? "#555" : "#a78bfa",
												border: "1px solid #555", borderRadius: 6,
												cursor: cr.loadingFiles ? "default" : "pointer",
												fontFamily: "monospace", fontSize: 11,
											}}
										>
											{cr.loadingFiles ? "Loading files…" : "+ Create new rule"}
										</button>
									) : (
										<div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
											<select
												value={cr.chosenFile}
												onChange={(e) => cr.setChosenFile(e.target.value)}
												style={{
													width: "100%", background: "#2d2d4e", color: "#fff",
													border: "1px solid #555", borderRadius: 4,
													padding: "4px 6px", fontFamily: "monospace", fontSize: 11,
												}}
											>
												{cr.files.map((f) => (
													<option key={f} value={f}>{f.split("/").pop()}</option>
												))}
											</select>
											<div style={{ color: "#888", fontSize: 10 }}>
												Selector: <code style={{ color: "#a78bfa" }}>{cr.selector}</code>
											</div>
											<input
												placeholder="property (e.g. color)"
												value={cr.prop}
												onChange={(e) => cr.setProp(e.target.value)}
												style={{
													background: "#2d2d4e", color: "#fff",
													border: "1px solid #555", borderRadius: 4,
													padding: "4px 6px", fontFamily: "monospace", fontSize: 11,
												}}
											/>
											<input
												placeholder="value (e.g. red)"
												value={cr.value}
												onChange={(e) => cr.setValue(e.target.value)}
												style={{
													background: "#2d2d4e", color: "#fff",
													border: "1px solid #555", borderRadius: 4,
													padding: "4px 6px", fontFamily: "monospace", fontSize: 11,
												}}
											/>
											<div style={{ display: "flex", gap: 4 }}>
												<button
													onClick={cr.create}
													disabled={!cr.prop.trim() || !cr.value.trim()}
													style={{
														flex: 1, padding: "6px 0",
														background: cr.prop.trim() && cr.value.trim() ? "#065f46" : "#2d2d4e",
														color: cr.prop.trim() && cr.value.trim() ? "#6ee7b7" : "#555",
														border: "1px solid " + (cr.prop.trim() && cr.value.trim() ? "#059669" : "#444"),
														borderRadius: 6,
														cursor: cr.prop.trim() && cr.value.trim() ? "pointer" : "not-allowed",
														fontFamily: "monospace", fontSize: 11,
													}}
												>
													Create
												</button>
												<button
													onClick={cr.reset}
													style={{
														padding: "6px 10px", background: "transparent",
														color: "#888", border: "1px solid #333",
														borderRadius: 6, cursor: "pointer",
														fontFamily: "monospace", fontSize: 11,
													}}
												>
													✕
												</button>
											</div>
										</div>
									)}
								</div>
							)}

							<AddPropertyRow
								propValue={editor.newProp}
								valueValue={editor.newValue}
								onPropChange={editor.setNewProp}
								onValueChange={editor.setNewValue}
								onAdd={editor.handleAdd}
							/>

							{editor.totalPending > 0 && (
								<button
									onClick={handleApply}
									style={{
										width: "100%",
										padding: "6px 0",
										marginTop: 10,
										background: hasSource ? "#065f46" : "#2d2d4e",
										color: hasSource ? "#6ee7b7" : "#555",
										border: "1px solid " + (hasSource ? "#059669" : "#444"),
										borderRadius: 6,
										cursor: hasSource ? "pointer" : "not-allowed",
										fontFamily: "monospace",
										fontSize: 11,
									}}
								>
									{hasSource
										? `✓ Apply ${editor.totalPending} change${editor.totalPending > 1 ? "s" : ""} to file`
										: "✗ No CSS source found"}
								</button>
							)}

							{editor.canUndo && (
								<button
									onClick={handleUndo}
									style={{
										width: "100%",
										padding: "4px 0",
										marginTop: 4,
										background: "transparent",
										color: "#888",
										border: "1px solid #333",
										borderRadius: 6,
										cursor: "pointer",
										fontFamily: "monospace",
										fontSize: 10,
									}}
								>
									↩ Undo last apply
								</button>
							)}

							{editor.serverError && (
								<p style={{ margin: "6px 0 0", fontSize: 10, color: "#f87171", wordBreak: "break-word" }}>
									✗ {editor.serverError}
								</p>
							)}
						</>
					)}

					{sessionBatches.length > 0 && (
						<>
							<button
								onClick={() => setHistoryOpen((v) => !v)}
								style={{
									width: "100%",
									padding: "4px 0",
									marginTop: 8,
									background: "transparent",
									color: "#888",
									border: "1px solid #333",
									borderRadius: 6,
									cursor: "pointer",
									fontFamily: "monospace",
									fontSize: 10,
								}}
							>
								{historyOpen ? "▾" : "▸"} History ({sessionBatches.length} {sessionBatches.length === 1 ? "apply" : "applies"})
							</button>

							{historyOpen && (
								<div style={{ marginTop: 6 }}>
									{[...sessionBatches].reverse().map((batch) => (
										<div key={batch.id} style={{
											marginBottom: 6,
											padding: "5px 6px",
											background: "#0f0f1a",
											borderRadius: 4,
											border: "1px solid #2d2d4e",
										}}>
											<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
												<span style={{ color: "#555", fontSize: 9 }}>
													{new Date(batch.entries[0].timestamp).toLocaleTimeString()}
												</span>
												<button
													onClick={() => restoreBatch(batch)}
													title="Restore all to previous values"
													style={{
														padding: "1px 6px",
														background: "transparent",
														color: "#555",
														border: "1px solid #333",
														borderRadius: 3,
														cursor: "pointer",
														fontFamily: "monospace",
														fontSize: 9,
													}}
												>
													↩ restore
												</button>
											</div>
											{batch.entries.map((e, i) => (
												<div key={i} style={{ marginBottom: i < batch.entries.length - 1 ? 4 : 0 }}>
													<div style={{ color: "#444", fontSize: 9, marginBottom: 1 }}>
														{e.fileUrl.split("/").slice(-2).join("/")} · {e.selector}
													</div>
													<div style={{ fontSize: 10, fontFamily: "monospace" }}>
														<span style={{ color: "#f87171" }}>− {e.prop}: {e.oldValue || "(empty)"}</span>
													</div>
													<div style={{ fontSize: 10, fontFamily: "monospace" }}>
														<span style={{ color: "#6ee7b7" }}>+ {e.prop}: {e.value}</span>
													</div>
												</div>
											))}
										</div>
									))}
									<button
										onClick={exportDiff}
										style={{
											width: "100%",
											padding: "4px 0",
											marginTop: 4,
											background: "transparent",
											color: copied ? "#6ee7b7" : "#555",
											border: "1px solid " + (copied ? "#059669" : "#333"),
											borderRadius: 4,
											cursor: "pointer",
											fontFamily: "monospace",
											fontSize: 10,
										}}
									>
										{copied ? "✓ Copied!" : "📋 Export as CSS"}
									</button>
								</div>
							)}
						</>
					)}
				</div>
			)}
		</>
	);
}
