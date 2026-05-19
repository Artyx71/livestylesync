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

export function StyleRows({ styles, pending, onChange }: Props) {
	if (Object.keys(styles).length === 0) return null;

	return (
		<>
			{Object.entries(styles).map(([prop, value]) => (
				<div key={prop} style={row}>
					<span style={propLabel} title={prop}>{prop}</span>
					<input
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
					/>
				</div>
			))}
		</>
	);
}
