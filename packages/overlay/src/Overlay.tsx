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

export function Overlay({ port = 3100 }: { port?: number }) {
	const [open, setOpen] = useState(false);
	const overlayRootRef = useRef<HTMLDivElement>(null);

	const { picking, setPicking, selected, setSelected, highlightRef } = useElementPicker(overlayRootRef);
	const { pos, onMouseDown: onDragStart } = useDraggable({ x: window.innerWidth - 320, y: window.innerHeight - 500 });

	const { send, status } = useWebSocket(`ws://localhost:${port}`, (data) => {
		if (!data || typeof data !== "object") return;
		const msg = data as Record<string, unknown>;
		if (msg.type === "error") {
			editor.setServerError((msg as Record<string, string>).message ?? "Unknown error");
		}
		if (msg.type === "files") {
			cr.handleFiles(msg.files as string[]);
		}
	});

	const cr = useCreateRule(selected, send, () => {});
	const editor = useStyleEditor(selected, send);

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
					width: 300,
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
				}}>
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
									onClick={() => editor.applyToFile(editor.groupStyles)}
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
									onClick={editor.undo}
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
				</div>
			)}
		</>
	);
}
