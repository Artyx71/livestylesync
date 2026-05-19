import { groupKey, groupTabLabel } from "../css";
import type { RuleGroup } from "../types";

interface Props {
	groups: RuleGroup[];
	activeIdx: number;
	allPending: Record<string, Record<string, string>>;
	onSelect: (i: number) => void;
}

export function GroupTabs({ groups, activeIdx, allPending, onSelect }: Props) {
	if (groups.length <= 1) return null;

	return (
		<div style={{ display: "flex", gap: 4, marginBottom: 10, flexWrap: "wrap" }}>
			{groups.map((g, i) => (
				<button
					key={groupKey(g)}
					onClick={() => onSelect(i)}
					title={g.mediaQuery ?? ""}
					style={{
						padding: "2px 8px",
						background: i === activeIdx ? "#7C3AED" : "#2d2d4e",
						color: i === activeIdx ? "#fff" : "#888",
						border: "1px solid " + (i === activeIdx ? "#7C3AED" : "#555"),
						borderRadius: 4,
						cursor: "pointer",
						fontFamily: "monospace",
						fontSize: 10,
					}}
				>
					{groupTabLabel(g)}
					{allPending[groupKey(g)] && Object.keys(allPending[groupKey(g)]).length > 0 && (
						<span style={{ color: "#f59e0b", marginLeft: 4 }}>●</span>
					)}
				</button>
			))}
		</div>
	);
}
