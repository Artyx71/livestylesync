import { useState } from "react";
import { BREAKPOINTS, type useViewport } from "../hooks/useViewport";

interface Props {
	viewport: ReturnType<typeof useViewport>;
}

export function ViewportSwitcher({ viewport }: Props) {
	const [custom, setCustom] = useState("");

	const applyCustom = () => {
		const n = parseInt(custom);
		if (n > 0) viewport.setWidth(n);
	};

	const isCustomActive = viewport.active !== null && !BREAKPOINTS.some(b => b.width === viewport.active);

	return (
		<div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 6 }}>
			<div style={{ display: "flex", gap: 4 }}>
				{BREAKPOINTS.map(({ label, width }) => {
					const on = viewport.active === width;
					return (
						<button
							key={width}
							onClick={() => viewport.toggle(width)}
							title={`Simulate ${width}px viewport`}
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
							{label}
						</button>
					);
				})}
				{viewport.active !== null && (
					<button
						onClick={viewport.reset}
						title="Reset to full width"
						style={{
							padding: "3px 8px",
							background: "transparent",
							color: "#888",
							border: "1px solid #444",
							borderRadius: 4,
							cursor: "pointer",
							fontFamily: "monospace",
							fontSize: 10,
						}}
					>
						✕
					</button>
				)}
			</div>
			<div style={{ display: "flex", gap: 4 }}>
				<input
					type="number"
					min={320}
					max={3840}
					placeholder="custom px"
					value={custom}
					onChange={(e) => setCustom(e.target.value)}
					onKeyDown={(e) => { if (e.key === "Enter") applyCustom(); }}
					style={{
						flex: 1,
						background: isCustomActive ? "#1e1b4b" : "#2d2d4e",
						border: "1px solid " + (isCustomActive ? "#4f46e5" : "#444"),
						borderRadius: 4,
						color: "#fff",
						fontFamily: "monospace",
						fontSize: 10,
						padding: "3px 6px",
					}}
				/>
				<button
					onClick={applyCustom}
					title="Apply custom width"
					style={{
						padding: "3px 8px",
						background: custom ? "#2d2d4e" : "transparent",
						color: custom ? "#a78bfa" : "#555",
						border: "1px solid " + (custom ? "#4f46e5" : "#444"),
						borderRadius: 4,
						cursor: custom ? "pointer" : "default",
						fontFamily: "monospace",
						fontSize: 10,
					}}
				>
					→
				</button>
			</div>
		</div>
	);
}
