import { BreadcrumbNav } from "./BreadcrumbNav";
import { GroupTabs } from "./GroupTabs";
import { StyleRows } from "./StyleRows";
import { AddPropertyRow } from "./AddPropertyRow";
import { ComponentInfoPanel } from "./ComponentInfoPanel";
import type { useStyleEditor } from "../hooks/useStyleEditor";
import type { useCreateRule } from "../hooks/useCreateRule";
import type { ComponentInfo } from "../hooks/useComponentInfo";

interface StyleEditorProps {
	selected: Element;
	setSelected: (el: Element) => void;
	editor: ReturnType<typeof useStyleEditor>;
	cr: ReturnType<typeof useCreateRule>;
	hasBatches: boolean;
	onApply: () => void;
	onUndo: () => void;
	editorUrl?: string | null;
	componentInfo?: ComponentInfo | null;
}

export function StyleEditor({ selected, setSelected, editor, cr, hasBatches, onApply, onUndo, editorUrl, componentInfo }: StyleEditorProps) {
	const hasSource = editor.ruleGroups.length > 0;

	return (
		<>
			<BreadcrumbNav selected={selected} onSelect={setSelected} />
			<ComponentInfoPanel info={componentInfo ?? null} />

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
								>Create</button>
								<button
									onClick={cr.reset}
									style={{
										padding: "6px 10px", background: "transparent",
										color: "#888", border: "1px solid #333",
										borderRadius: 6, cursor: "pointer",
										fontFamily: "monospace", fontSize: 11,
									}}
								>✕</button>
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
					onClick={onApply}
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

			{hasBatches && (
				<button
					onClick={onUndo}
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

			{editorUrl && (
				<a
					href={editorUrl}
					style={{ display: "block", marginTop: 6, fontSize: 10, color: "#a78bfa", textDecoration: "none", fontFamily: "monospace" }}
				>
					↗ Open in editor
				</a>
			)}
		</>
	);
}
