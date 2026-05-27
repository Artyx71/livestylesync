import type { ComponentInfo } from "../hooks/useComponentInfo";

export function ComponentInfoPanel({ info }: { info: ComponentInfo | null }) {
	if (!info) return null;
	const entries = Object.entries(info.props);

	return (
		<div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid #2d2d4e" }}>
			<div style={{ fontSize: 10, color: "#475569", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>component</div>
			<div style={{ fontSize: 11, color: "#a78bfa", fontFamily: "monospace", marginBottom: entries.length ? 6 : 0 }}>
				&lt;{info.name}&gt;
			</div>
			{entries.map(([k, v]) => (
				<div key={k} style={{ display: "flex", gap: 8, fontSize: 11, fontFamily: "monospace", marginBottom: 2 }}>
					<span style={{ color: "#475569", minWidth: 80, flexShrink: 0 }}>{k}</span>
					<span style={{ color: "#e2e8f0" }}>{String(v)}</span>
				</div>
			))}
		</div>
	);
}
