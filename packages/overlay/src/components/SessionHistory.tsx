import type { LogBatch } from "../types";

interface SessionHistoryProps {
	batches: LogBatch[];
	open: boolean;
	onToggle: () => void;
	onRestore: (batch: LogBatch) => void;
	onExport: () => void;
	onClear: () => void;
	copied: boolean;
}

export function SessionHistory({ batches, open, onToggle, onRestore, onExport, onClear, copied }: SessionHistoryProps) {
	if (batches.length === 0) return null;

	return (
		<>
			<button
				onClick={onToggle}
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
				{open ? "▾" : "▸"} History ({batches.length} {batches.length === 1 ? "apply" : "applies"})
			</button>

			{open && (
				<div style={{ marginTop: 6 }}>
					{[...batches].reverse().map((batch) => (
						<div
							key={batch.id}
							style={{
								marginBottom: 6,
								padding: "5px 6px",
								background: "#0f0f1a",
								borderRadius: 4,
								border: "1px solid #2d2d4e",
							}}
						>
							<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
								<span style={{ color: "#555", fontSize: 9 }}>
									{new Date(batch.entries[0].timestamp).toLocaleTimeString()}
								</span>
								<button
									onClick={() => onRestore(batch)}
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
					<div style={{ display: "flex", gap: 4, marginTop: 4 }}>
						<button
							onClick={onExport}
							style={{
								flex: 1,
								padding: "4px 0",
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
						<button
							onClick={onClear}
							title="Clear session history"
							style={{
								padding: "4px 8px",
								background: "transparent",
								color: "#555",
								border: "1px solid #333",
								borderRadius: 4,
								cursor: "pointer",
								fontFamily: "monospace",
								fontSize: 10,
							}}
						>
							✕ Clear
						</button>
					</div>
				</div>
			)}
		</>
	);
}
