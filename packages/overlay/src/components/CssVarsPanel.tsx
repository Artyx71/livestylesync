import type { RootVar } from "../types";

interface CssVarsPanelProps {
	open: boolean;
	onToggle: () => void;
	vars: RootVar[];
	pending: Record<string, string>;
	hasPending: boolean;
	onChange: (name: string, value: string) => void;
	onApply: () => void;
	onReset: () => void;
}

export function CssVarsPanel({ open, onToggle, vars, pending, hasPending, onChange, onApply, onReset }: CssVarsPanelProps) {
	return (
		<>
			<button
				onClick={onToggle}
				style={{
					width: "100%",
					padding: "6px 0",
					marginTop: 6,
					background: open ? "#1e1b4b" : "#2d2d4e",
					color: open ? "#a78bfa" : "#888",
					border: "1px solid " + (open ? "#4f46e5" : "#444"),
					borderRadius: 6,
					cursor: "pointer",
					fontFamily: "monospace",
					fontSize: 11,
				}}
			>
				{open ? "▾ CSS Variables" : "▸ CSS Variables"}
			</button>

			{open && (
				<div style={{ marginTop: 8 }}>
					{vars.length === 0 ? (
						<p style={{ color: "#555", fontSize: 11, margin: 0 }}>No :root variables found</p>
					) : (
						<>
							{vars.map((v) => {
								const current = pending[v.name] ?? v.value;
								const changed = v.name in pending;
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
											onChange={(e) => onChange(v.name, e.target.value)}
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
							{hasPending && (
								<div style={{ display: "flex", gap: 4, marginTop: 6 }}>
									<button
										onClick={onApply}
										style={{
											flex: 1, padding: "4px 0",
											background: "#065f46", color: "#6ee7b7",
											border: "1px solid #059669", borderRadius: 4,
											cursor: "pointer", fontFamily: "monospace", fontSize: 10,
										}}
									>Apply</button>
									<button
										onClick={onReset}
										style={{
											padding: "4px 8px", background: "transparent",
											color: "#888", border: "1px solid #333",
											borderRadius: 4, cursor: "pointer",
											fontFamily: "monospace", fontSize: 10,
										}}
									>✕</button>
								</div>
							)}
						</>
					)}
				</div>
			)}
		</>
	);
}
