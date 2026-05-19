interface Props {
	propValue: string;
	valueValue: string;
	onPropChange: (v: string) => void;
	onValueChange: (v: string) => void;
	onAdd: () => void;
}

const plainInput: React.CSSProperties = {
	flex: 1,
	background: "#2d2d4e",
	border: "1px solid #555",
	borderRadius: 4,
	color: "#fff",
	fontFamily: "monospace",
	fontSize: 11,
	padding: "2px 6px",
};

export function AddPropertyRow({ propValue, valueValue, onPropChange, onValueChange, onAdd }: Props) {
	return (
		<div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10, borderTop: "1px solid #333", paddingTop: 10 }}>
			<input
				placeholder="property"
				value={propValue}
				style={{ ...plainInput, width: 110, flex: "none" }}
				onChange={(e) => onPropChange(e.target.value)}
				onKeyDown={(e) => e.key === "Enter" && onAdd()}
			/>
			<input
				placeholder="value"
				value={valueValue}
				style={plainInput}
				onChange={(e) => onValueChange(e.target.value)}
				onKeyDown={(e) => e.key === "Enter" && onAdd()}
			/>
			<button
				onClick={onAdd}
				style={{
					background: "#2d2d4e",
					border: "1px solid #555",
					borderRadius: 4,
					color: "#aaa",
					cursor: "pointer",
					padding: "2px 8px",
					fontFamily: "monospace",
					fontSize: 13,
					flexShrink: 0,
				}}
			>
				+
			</button>
		</div>
	);
}
