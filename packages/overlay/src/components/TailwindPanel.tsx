import { useState } from "react";
import type { TailwindEditorState } from "../hooks/useTailwindEditor";

interface Props {
	tw: TailwindEditorState;
	onApply: () => void;
}

export function TailwindPanel({ tw, onApply }: Props) {
	const [editing, setEditing] = useState<string | null>(null);
	const [editVal, setEditVal] = useState("");

	if (tw.classes.length === 0) return null;

	const commit = (oldCls: string) => {
		if (editVal.trim() && editVal.trim() !== oldCls) tw.handleSwap(oldCls, editVal.trim());
		setEditing(null);
	};

	return (
		<div style={{ marginTop: 8 }}>
			<p style={{ margin: "0 0 6px", fontSize: 10, color: "#a78bfa", fontFamily: "monospace" }}>
				▸ Tailwind classes
			</p>
			<div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
				{tw.classes.map((cls) => {
					const newVal = tw.pending.get(cls);
					const isRemoved = newVal === "";
					const isChanged = newVal !== undefined && newVal !== "";
					const displayCls = isChanged ? newVal! : cls;

					if (editing === cls) {
						return (
							<div key={cls} style={{ display: "flex", gap: 2 }}>
								<input
									autoFocus
									value={editVal}
									onChange={(e) => setEditVal(e.target.value)}
									onKeyDown={(e) => {
										if (e.key === "Enter") commit(cls);
										if (e.key === "Escape") setEditing(null);
									}}
									style={{
										background: "#2d2d4e", color: "#fff",
										border: "1px solid #a78bfa", borderRadius: 4,
										padding: "2px 6px", fontFamily: "monospace", fontSize: 11, width: 130,
									}}
								/>
								<button
									onClick={() => commit(cls)}
									style={{ background: "#065f46", color: "#6ee7b7", border: "none", borderRadius: 4, padding: "2px 6px", cursor: "pointer", fontSize: 10 }}
								>✓</button>
								<button
									onClick={() => setEditing(null)}
									style={{ background: "transparent", color: "#888", border: "1px solid #333", borderRadius: 4, padding: "2px 4px", cursor: "pointer", fontSize: 10 }}
								>✕</button>
							</div>
						);
					}

					return (
						<div key={cls} style={{ display: "flex", alignItems: "center", gap: 1 }}>
							<span
								onClick={() => { setEditing(cls); setEditVal(isChanged ? newVal! : cls); }}
								title="Click to edit"
								style={{
									background: isRemoved ? "#2d1515" : isChanged ? "#1a2d1a" : "#2d2d4e",
									color: isRemoved ? "#f87171" : isChanged ? "#6ee7b7" : "#c4b5fd",
									border: `1px solid ${isRemoved ? "#7f1d1d" : isChanged ? "#065f46" : "#4c1d95"}`,
									borderRadius: 4, padding: "2px 8px",
									fontFamily: "monospace", fontSize: 11, cursor: "pointer",
									textDecoration: isRemoved ? "line-through" : "none",
								}}
							>
								{displayCls}
							</span>
							{!isRemoved && (
								<button
									onClick={() => tw.handleRemove(cls)}
									title="Remove class"
									style={{ background: "transparent", color: "#555", border: "none", cursor: "pointer", fontSize: 12, lineHeight: 1, padding: "0 2px" }}
								>×</button>
							)}
						</div>
					);
				})}
			</div>

			{tw.hasPending && (
				<button
					onClick={onApply}
					style={{
						width: "100%", padding: "5px 0", marginTop: 6,
						background: "#1e1a4e",
						color: "#a78bfa",
						border: "1px solid #4c1d95",
						borderRadius: 6,
						cursor: "pointer",
						fontFamily: "monospace", fontSize: 11,
					}}
				>
					✓ Apply {tw.pending.size} class change{tw.pending.size > 1 ? "s" : ""}
				</button>
			)}
		</div>
	);
}
