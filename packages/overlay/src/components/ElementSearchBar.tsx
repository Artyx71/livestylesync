interface ElementSearchBarProps {
	query: string;
	matches: Element[];
	focusIdx: number;
	search: (q: string) => void;
	next: () => void;
	prev: () => void;
	select: () => void;
	clear: () => void;
}

export function ElementSearchBar({ query, matches, focusIdx, search, next, prev, select, clear }: ElementSearchBarProps) {
	return (
		<>
			<div style={{ position: "relative", marginTop: 6 }}>
				<input
					value={query}
					placeholder="Search .class, #id, or selector"
					onChange={(e) => search(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === "Enter") select();
						if (e.key === "ArrowDown") { e.preventDefault(); next(); }
						if (e.key === "ArrowUp") { e.preventDefault(); prev(); }
						if (e.key === "Escape") clear();
					}}
					style={{
						width: "100%",
						boxSizing: "border-box",
						padding: "5px 8px",
						paddingRight: matches.length > 0 ? 64 : 8,
						background: "#2d2d4e",
						color: "#fff",
						border: "1px solid " + (matches.length > 0 ? "#10b981" : "#444"),
						borderRadius: 6,
						fontFamily: "monospace",
						fontSize: 11,
						outline: "none",
					}}
				/>
				{matches.length > 0 && (
					<div style={{ position: "absolute", right: 4, top: "50%", transform: "translateY(-50%)", display: "flex", alignItems: "center", gap: 2 }}>
						<span style={{ color: "#10b981", fontSize: 10, fontFamily: "monospace" }}>
							{focusIdx + 1}/{matches.length}
						</span>
						<button onClick={prev} style={{ background: "none", border: "none", color: "#888", cursor: "pointer", padding: "0 2px", fontSize: 10 }}>↑</button>
						<button onClick={next} style={{ background: "none", border: "none", color: "#888", cursor: "pointer", padding: "0 2px", fontSize: 10 }}>↓</button>
					</div>
				)}
			</div>
			{matches.length > 0 && (
				<button
					onClick={select}
					style={{
						width: "100%",
						padding: "4px 0",
						marginTop: 4,
						background: "#064e3b",
						color: "#10b981",
						border: "1px solid #10b981",
						borderRadius: 6,
						cursor: "pointer",
						fontFamily: "monospace",
						fontSize: 11,
					}}
				>
					Select highlighted element
				</button>
			)}
		</>
	);
}
