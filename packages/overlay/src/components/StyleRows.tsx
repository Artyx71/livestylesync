interface Props {
	styles: Record<string, string>;
	pending: Record<string, string>;
	onChange: (prop: string, value: string) => void;
}

const row: React.CSSProperties = {
	display: "flex",
	alignItems: "center",
	gap: 6,
	marginBottom: 4,
};

const propLabel: React.CSSProperties = {
	color: "#888",
	width: 120,
	flexShrink: 0,
	overflow: "hidden",
	textOverflow: "ellipsis",
	whiteSpace: "nowrap",
};

function nudgeNumber(value: string, delta: number, cursorPos: number): string {
	const numRegex = /-?\d*\.?\d+/g;
	let match: RegExpExecArray | null;
	let target: RegExpExecArray | null = null;

	while ((match = numRegex.exec(value)) !== null) {
		if (cursorPos >= match.index && cursorPos <= match.index + match[0].length) {
			target = match;
			break;
		}
	}

	if (!target) {
		numRegex.lastIndex = 0;
		while ((match = numRegex.exec(value)) !== null) target = match;
	}

	if (!target) return value;

	const num = parseFloat(target[0]);
	if (isNaN(num)) return value;

	const currentDecimals = (target[0].split(".")[1] ?? "").length;
	const deltaDecimals = delta % 1 !== 0 ? (String(Math.abs(delta)).split(".")[1]?.length ?? 1) : 0;
	const precision = Math.max(currentDecimals, deltaDecimals);
	const newNum = parseFloat((num + delta).toFixed(precision));

	return value.slice(0, target.index) + newNum + value.slice(target.index + target[0].length);
}

function isColorProp(prop: string): boolean {
	return prop === "color" || prop === "background" || prop.endsWith("-color") ||
		prop === "fill" || prop === "stroke" || prop === "caret-color";
}

function toHex(value: string): string {
	const v = value.trim();
	if (/^#[0-9a-f]{3,8}$/i.test(v)) return v.length === 4 ? expandShortHex(v) : v.slice(0, 7);
	const rgb = /^rgba?\((\d+),\s*(\d+),\s*(\d+)/i.exec(v);
	if (rgb) {
		return "#" + [rgb[1], rgb[2], rgb[3]]
			.map((n) => parseInt(n).toString(16).padStart(2, "0"))
			.join("");
	}
	return "#000000";
}

function expandShortHex(hex: string): string {
	return "#" + hex.slice(1).split("").map((c) => c + c).join("");
}

export function StyleRows({ styles, pending, onChange }: Props) {
	if (Object.keys(styles).length === 0) return null;

	return (
		<>
			{Object.entries(styles).map(([prop, value]) => (
				<div key={prop} style={row}>
					<span style={propLabel} title={prop}>{prop}</span>
					{isColorProp(prop) && (
						<div style={{ position: "relative", width: 16, height: 16, flexShrink: 0, borderRadius: 2, overflow: "hidden", border: "1px solid #555" }}>
							<div style={{ width: "100%", height: "100%", background: value }} />
							<input
								type="color"
								value={toHex(value)}
								onChange={(e) => onChange(prop, e.target.value)}
								style={{
									position: "absolute",
									inset: 0,
									opacity: 0,
									width: "100%",
									height: "100%",
									cursor: "pointer",
									padding: 0,
									border: "none",
								}}
							/>
						</div>
					)}
					<input
						data-prop={prop}
						style={{
							flex: 1,
							background: "#2d2d4e",
							border: "1px solid " + (pending[prop] !== undefined ? "#f59e0b" : "#555"),
							borderRadius: 4,
							color: "#fff",
							fontFamily: "monospace",
							fontSize: 11,
							padding: "2px 6px",
						}}
						value={value}
						onChange={(e) => onChange(prop, e.target.value)}
						onKeyDown={(e) => {
							if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
							e.preventDefault();
							const dir = e.key === "ArrowUp" ? 1 : -1;
							const delta = e.shiftKey ? 10 * dir : e.altKey ? 0.1 * dir : dir;
							const cursor = (e.target as HTMLInputElement).selectionStart ?? value.length;
							const next = nudgeNumber(value, delta, cursor);
							if (next !== value) onChange(prop, next);
						}}
					/>
				</div>
			))}
		</>
	);
}
