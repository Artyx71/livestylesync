import { useState } from "react";
import type { DesignToken, TokenGroup } from "../hooks/useDesignTokens";

interface Props {
	open: boolean;
	onToggle: () => void;
	groups: TokenGroup[];
	tokens: DesignToken[];
	pending: Record<string, string>;
	hasPending: boolean;
	onChange: (name: string, value: string) => void;
	onApply: () => void;
	onReset: () => void;
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
	if (/^#[0-9a-f]{3,8}$/i.test(v)) {
		return v.length === 4
			? "#" + v.slice(1).split("").map((c) => c + c).join("")
			: v.slice(0, 7);
	}
	const rgb = /^rgba?\((\d+),\s*(\d+),\s*(\d+)/i.exec(v);
	if (rgb) {
		return "#" + [rgb[1], rgb[2], rgb[3]]
			.map((n) => parseInt(n).toString(16).padStart(2, "0"))
			.join("");
	}
	return "#000000";
}

function TokenRow({ token, currentValue, changed, onChange }: {
	token: DesignToken;
	currentValue: string;
	changed: boolean;
	onChange: (name: string, value: string) => void;
}) {
	const showSwatch = isColorValue(token.name, currentValue);

	return (
		<div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 4 }}>
			<span
				title={token.name}
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
				{token.name}
			</span>
			{showSwatch && (
				<div style={{ width: 12, height: 12, borderRadius: 2, background: currentValue, border: "1px solid #555", flexShrink: 0, position: "relative", overflow: "hidden" }}>
					<input
						type="color"
						value={toHex(currentValue)}
						onChange={(e) => onChange(token.name, e.target.value)}
						style={{ position: "absolute", inset: 0, opacity: 0, width: "100%", height: "100%", cursor: "pointer", padding: 0, border: "none" }}
					/>
				</div>
			)}
			<input
				value={currentValue}
				onChange={(e) => onChange(token.name, e.target.value)}
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
}

function TokenGroupSection({ group, pending, onChange }: {
	group: TokenGroup;
	pending: Record<string, string>;
	onChange: (name: string, value: string) => void;
}) {
	return (
		<details open style={{ marginBottom: 6 }}>
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
				{group.label} <span style={{ opacity: 0.5, fontWeight: 400 }}>({group.tokens.length})</span>
			</summary>
			<div style={{ paddingLeft: 6, marginTop: 4 }}>
				{group.tokens.map((token) => (
					<TokenRow
						key={token.name}
						token={token}
						currentValue={pending[token.name] ?? token.value}
						changed={token.name in pending}
						onChange={onChange}
					/>
				))}
			</div>
		</details>
	);
}

export function DesignTokensPanel({ open, onToggle, groups, tokens, pending, hasPending, onChange, onApply, onReset }: Props) {
	const [query, setQuery] = useState("");

	const q = query.toLowerCase();
	const filteredGroups = q
		? groups.map((g) => ({
			...g,
			tokens: g.tokens.filter(
				(t) => t.name.includes(q) || (pending[t.name] ?? t.value).toLowerCase().includes(q)
			),
		})).filter((g) => g.tokens.length > 0)
		: groups;

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
				{open ? "▾ Design Tokens" : "▸ Design Tokens"}
			</button>

			{open && (
				<div style={{ marginTop: 8 }}>
					{tokens.length === 0 ? (
						<p style={{ color: "#555", fontSize: 11, margin: 0 }}>No CSS custom properties found</p>
					) : (
						<>
							<input
								type="search"
								placeholder="Filter tokens…"
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
							{filteredGroups.length === 0 ? (
								<p style={{ color: "#555", fontSize: 10, margin: 0 }}>No matches</p>
							) : (
								filteredGroups.map((group) => (
									<TokenGroupSection
										key={group.prefix}
										group={group}
										pending={pending}
										onChange={onChange}
									/>
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
