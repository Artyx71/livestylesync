import type { ScssVar } from "../types";

interface ScssVarsPanelProps {
	open: boolean;
	onToggle: () => void;
	vars: ScssVar[];
	pending: Record<string, string>;
	hasPending: boolean;
	error: string | null;
	onChange: (fileUrl: string, name: string, value: string) => void;
	onApply: () => void;
	onReset: () => void;
}

export function ScssVarsPanel({ open, onToggle, vars, pending, hasPending, error, onChange, onApply, onReset }: ScssVarsPanelProps) {
	return (
		<>
			<button
				onClick={onToggle}
				style={{
					width: "100%",
					padding: "6px 0",
					marginTop: 6,
					background: open ? "#1a1a2e" : "#2d2d4e",
					color: open ? "#f59e0b" : "#888",
					border: "1px solid " + (open ? "#d97706" : "#444"),
					borderRadius: 6,
					cursor: "pointer",
					fontFamily: "monospace",
					fontSize: 11,
				}}
			>
				{open ? "▾ SCSS $variables" : "▸ SCSS $variables"}
			</button>

			{open && (
				<div style={{ marginTop: 8 }}>
					{vars.length === 0 ? (
						<p style={{ color: "#555", fontSize: 11, margin: 0 }}>No SCSS variables found</p>
					) : (
						<>
							{Object.entries(
								vars.reduce<Record<string, ScssVar[]>>((acc, v) => {
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
										const current = pending[key] ?? v.value;
										const changed = key in pending;
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
													onChange={(e) => onChange(v.fileUrl, v.name, e.target.value)}
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
							{hasPending && (
								<div style={{ display: "flex", gap: 4, marginTop: 6 }}>
									<button
										onClick={onApply}
										style={{
											flex: 1, padding: "4px 0",
											background: "#451a03", color: "#fcd34d",
											border: "1px solid #d97706", borderRadius: 4,
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
							{error && (
								<p style={{ margin: "6px 0 0", fontSize: 10, color: "#f87171", wordBreak: "break-word" }}>
									✗ {error}
								</p>
							)}
						</>
					)}
				</div>
			)}
		</>
	);
}
