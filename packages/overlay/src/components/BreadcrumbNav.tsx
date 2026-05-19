import { getAncestorPath, elLabel } from "../css";

interface Props {
	selected: Element;
	onSelect: (el: Element) => void;
}

export function BreadcrumbNav({ selected, onSelect }: Props) {
	return (
		<div style={{ display: "flex", flexWrap: "wrap", gap: 2, margin: "8px 0 6px", alignItems: "center" }}>
			{getAncestorPath(selected).map((ancestor, i, arr) => (
				<span key={i} style={{ display: "flex", alignItems: "center", gap: 2 }}>
					<button
						onClick={() => onSelect(ancestor)}
						style={{
							background: ancestor === selected ? "#2d2d4e" : "transparent",
							border: `1px solid ${ancestor === selected ? "#7C3AED" : "transparent"}`,
							borderRadius: 3,
							color: ancestor === selected ? "#7C3AED" : "#555",
							cursor: "pointer",
							fontFamily: "monospace",
							fontSize: 10,
							padding: "1px 4px",
						}}
					>
						{elLabel(ancestor)}
					</button>
					{i < arr.length - 1 && <span style={{ color: "#333", fontSize: 10 }}>›</span>}
				</span>
			))}
		</div>
	);
}
