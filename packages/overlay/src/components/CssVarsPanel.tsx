import { useState } from "react";
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

const GROUP_CONFIG: Array<{ prefix: string; label: string }> = [
	{ prefix: "color", label: "Colors" },
	{ prefix: "spacing", label: "Spacing" },
	{ prefix: "font", label: "Typography" },
	{ prefix: "radius", label: "Radius" },
	{ prefix: "shadow", label: "Shadows" },
	{ prefix: "size", label: "Sizes" },
	{ prefix: "border", label: "Borders" },
	{ prefix: "transition", label: "Transitions" },
];

const KNOWN_PREFIXES = new Set(GROUP_CONFIG.map((g) => g.prefix));

function getPrefix(name: string): string {
	const first = name.replace(/^--/, "").split("-")[0];
	return KNOWN_PREFIXES.has(first) ? first : "other";
}

function groupVars(vars: RootVar[]): Array<{ prefix: string; label: string; vars: RootVar[] }> {
	const map = new Map<string, RootVar[]>();
	for (const v of vars) {
		const p = getPrefix(v.name);
		if (!map.has(p)) map.set(p, []);
		map.get(p)!.push(v);
	}
	const groups = GROUP_CONFIG
		.filter((c) => map.has(c.prefix))
		.map((c) => ({ prefix: c.prefix, label: c.label, vars: map.get(c.prefix)! }));
	if (map.has("other")) groups.push({ prefix: "other", label: "Other", vars: map.get("other")! });
	return groups;
}

function isColorValue(name: string, value: string): boolean {
	if (value.startsWith("var(")) return false;
	return (
		name.includes("color") ||
		/^#[0-9a-f]{3,8}$/i.test(value) ||
		/^rgba?\(/i.test(value) ||
		/^hsla?\(/i.test(value)
	);
}

function toHex(value: string): string {
	const v = value.trim();
	if (/^#[0-9a-f]{3,8}$/i.test(v))
		return v.length === 4 ? "#" + v.slice(1).split("").map((c) => c + c).join("") : v.slice(0, 7);
	const rgb = /^rgba?\((\d+),\s*(\d+),\s*(\d+)/i.exec(v);
	if (rgb)
		return "#" + [rgb[1], rgb[2], rgb[3]].map((n) => parseInt(n).toString(16).padStart(2, "0")).join("");
	return "#000000";
}

export function CssVarsPanel({ open, onToggle, vars, pending, hasPending, onChange, onApply, onReset }: CssVarsPanelProps) {
	const [query, setQuery] = useState("");

	const q = query.toLowerCase();
	const filtered = q ? vars.filter((v) => v.name.includes(q) || (pending[v.name] ?? v.value).toLowerCase().includes(q)) : vars;
	const groups = groupVars(filtered);

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
							<input
								type="search"
								placeholder="Filter variables…"
								value={query}
								onChange={(e) => setQuery(e.target.value)}
								style={{
									width: "100%",
									boxSizing: "border-box",
									background: "#2d2d4e",
									border: "1px solid #444",
									borderRadius: 4,
									color: "#fff",
									fontFamily: "monospace",
									fontSize: 10,
									padding: "3px 6px",
									marginBottom: 8,
								}}
							/>
							{groups.length === 0 ? (
								<p style={{ color: "#555", fontSize: 10, margin: 0 }}>No matches</p>
							) : (
								groups.map((group) => (
									<details key={group.prefix} open style={{ marginBottom: 6 }}>
										<summary style={{
											cursor: "pointer",
											color: "#888",
											fontSize: 10,
											fontWeight: 600,
											letterSpacing: "0.05em",
											textTransform: "uppercase",
											padding: "2px 0",
											userSelect: "none",
											listStyle: "none",
											display: "flex",
											alignItems: "center",
											gap: 4,
										}}>
											<span style={{ fontSize: 9, opacity: 0.6 }}>▸</span>
											{group.label} <span style={{ opacity: 0.5, fontWeight: 400 }}>({group.vars.length})</span>
										</summary>
										<div style={{ paddingLeft: 6, marginTop: 4 }}>
											{group.vars.map((v) => {
												const current = pending[v.name] ?? v.value;
												const changed = v.name in pending;
												const showSwatch = isColorValue(v.name, current);
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
																fontFamily: "monospace",
															}}
														>
															{v.name}
														</span>
														{showSwatch && (
															<div style={{ width: 12, height: 12, borderRadius: 2, background: current, border: "1px solid #555", flexShrink: 0, position: "relative", overflow: "hidden" }}>
																<input
																	type="color"
																	value={toHex(current)}
																	onChange={(e) => onChange(v.name, e.target.value)}
																	style={{ position: "absolute", inset: 0, opacity: 0, width: "100%", height: "100%", cursor: "pointer", padding: 0, border: "none" }}
																/>
															</div>
														)}
														<input
															value={current}
															onChange={(e) => onChange(v.name, e.target.value)}
															style={{
																width: 90,
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
										</div>
									</details>
								))
							)}
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
