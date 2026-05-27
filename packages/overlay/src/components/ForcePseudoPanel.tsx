import { PSEUDO_STATES, type PseudoState } from "../hooks/useForcePseudo";

interface Props {
	active: Set<PseudoState>;
	onToggle: (pseudo: PseudoState) => void;
}

export function ForcePseudoPanel({ active, onToggle }: Props) {
	return (
		<div style={{ display: "flex", gap: 4, margin: "6px 0" }}>
			{PSEUDO_STATES.map((pseudo) => {
				const on = active.has(pseudo);
				return (
					<button
						key={pseudo}
						onClick={() => onToggle(pseudo)}
						title={`Force ${pseudo} state`}
						style={{
							flex: 1,
							padding: "3px 0",
							background: on ? "#1e1b4b" : "#2d2d4e",
							color: on ? "#a78bfa" : "#666",
							border: "1px solid " + (on ? "#4f46e5" : "#444"),
							borderRadius: 4,
							cursor: "pointer",
							fontFamily: "monospace",
							fontSize: 10,
						}}
					>
						{pseudo}
					</button>
				);
			})}
		</div>
	);
}
