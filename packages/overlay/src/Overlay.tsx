import { useState, useEffect, useRef } from "react";

function rgbToHex(rgb: string): string {
	if (!rgb || rgb === "transparent") return "#ffffff";
	const match = rgb.match(/\d+/g);
	if (!match || match.length < 3) return "#000000";
	return (
		"#" +
		match
			.slice(0, 3)
			.map((n) => parseInt(n).toString(16).padStart(2, "0"))
			.join("")
	);
}

function getComputed(el: Element, prop: string): string {
	return window.getComputedStyle(el).getPropertyValue(prop).trim();
}

export function Overlay() {
	const [open, setOpen] = useState(false);
	const [picking, setPicking] = useState(false);
	const [selected, setSelected] = useState<Element | null>(null);
	const highlightRef = useRef<HTMLDivElement>(null);
	const overlayRootRef = useRef<HTMLDivElement>(null);
	const [padding, setPadding] = useState("0");
	const [margin, setMargin] = useState("0");
	const [color, setColor] = useState("#000000");
	const [bg, setBg] = useState("#ffffff");

	useEffect(() => {
		if (!selected) return;
		setPadding(getComputed(selected, "padding-top").replace("px", ""));
		setMargin(getComputed(selected, "margin-top").replace("px", ""));
		setColor(rgbToHex(getComputed(selected, "color")));
		setBg(rgbToHex(getComputed(selected, "background-color")));
	}, [selected]);

	const apply = (prop: string, value: string) => {
		if (!selected) return;
		(selected as HTMLElement).style[prop as any] = value;
	};

	const row: React.CSSProperties = {
		display: "flex",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: 8,
		fontSize: 11,
		color: "#aaa",
	};

	const numInput: React.CSSProperties = {
		background: "#2d2d4e",
		border: "1px solid #555",
		borderRadius: 4,
		color: "#fff",
		fontFamily: "monospace",
		fontSize: 11,
		padding: "2px 6px",
		width: 60,
		textAlign: "right",
	};

	useEffect(() => {
		if (!picking) {
			if (highlightRef.current) highlightRef.current.style.display = "none";
			return;
		}

		document.body.style.cursor = "crosshair";

		const handleMouseOver = (e: MouseEvent) => {
			const target = e.target as Element;
			if (overlayRootRef.current?.contains(target)) return;

			const rect = target.getBoundingClientRect();
			const h = highlightRef.current;
			if (!h) return;
			h.style.display = "block";
			h.style.top = rect.top + window.scrollY + "px";
			h.style.left = rect.left + window.scrollX + "px";
			h.style.width = rect.width + "px";
			h.style.height = rect.height + "px";
		};

		const handleClick = (e: MouseEvent) => {
			const target = e.target as Element;
			if (overlayRootRef.current?.contains(target)) return;

			e.preventDefault();
			e.stopPropagation();
			setSelected(target);
			setPicking(false);
		};

		document.addEventListener("mouseover", handleMouseOver);
		document.addEventListener("click", handleClick, true);

		return () => {
			document.body.style.cursor = "";
			document.removeEventListener("mouseover", handleMouseOver);
			document.removeEventListener("click", handleClick, true);
		};
	}, [picking]);

	return (
		<>
			<div
				ref={highlightRef}
				style={{
					display: "none",
					position: "absolute",
					pointerEvents: "none",
					outline: "2px solid #3B82F6",
					background: "rgba(59,130,246,0.08)",
					zIndex: 9998,
				}}
			/>

			<button
				onClick={() => setOpen((v) => !v)}
				style={{
					position: "fixed",
					bottom: 20,
					right: 20,
					width: 12,
					height: 12,
					borderRadius: "50%",
					background: open ? "#5B21B6" : "#7C3AED",
					border: "none",
					cursor: "pointer",
					zIndex: 9999,
					padding: 0,
				}}
			/>

			{open && (
				<div
					ref={overlayRootRef}
					style={{
						position: "fixed",
						bottom: 44,
						right: 20,
						width: 280,
						background: "#1a1a2e",
						border: "1px solid #7C3AED",
						borderRadius: 8,
						padding: 16,
						zIndex: 9999,
						color: "#fff",
						fontFamily: "monospace",
						fontSize: 13,
					}}
				>
					<p style={{ margin: "0 0 12px" }}>LiveStyleSync</p>

					<button
						onClick={() => setPicking((v) => !v)}
						style={{
							width: "100%",
							padding: "8px 0",
							background: picking ? "#3B82F6" : "#2d2d4e",
							color: "#fff",
							border: "1px solid " + (picking ? "#3B82F6" : "#555"),
							borderRadius: 6,
							cursor: "pointer",
							fontFamily: "monospace",
							fontSize: 12,
						}}
					>
						{picking ? "⊙ Кликни на элемент..." : "↖ Выбрать элемент"}
					</button>

					{selected && (
						<>
							<p style={{ margin: "8px 0 4px", color: "#7C3AED", fontSize: 11 }}>
								{selected.tagName.toLowerCase()}
								{selected.className
									? "." + String(selected.className).split(" ")[0]
									: ""}
							</p>

							<p style={{ margin: "12px 0 6px", color: "#555", fontSize: 10, textTransform: "uppercase", letterSpacing: 1 }}>
								Spacing
							</p>

							<div style={row}>
								<span>Padding</span>
								<div style={{ display: "flex", alignItems: "center", gap: 4 }}>
									<input
										type="number"
										value={padding}
										style={numInput}
										onChange={(e) => {
											setPadding(e.target.value);
											apply("padding", e.target.value + "px");
										}}
									/>
									<span style={{ fontSize: 10, color: "#555" }}>px</span>
								</div>
							</div>

							<div style={row}>
								<span>Margin</span>
								<div style={{ display: "flex", alignItems: "center", gap: 4 }}>
									<input
										type="number"
										value={margin}
										style={numInput}
										onChange={(e) => {
											setMargin(e.target.value);
											apply("margin", e.target.value + "px");
										}}
									/>
									<span style={{ fontSize: 10, color: "#555" }}>px</span>
								</div>
							</div>

							<p style={{ margin: "12px 0 6px", color: "#555", fontSize: 10, textTransform: "uppercase", letterSpacing: 1 }}>
								Colors
							</p>

							<div style={row}>
								<span>Color</span>
								<input
									type="color"
									value={color}
									style={{ ...numInput, width: 40, padding: 2, cursor: "pointer" }}
									onChange={(e) => {
										setColor(e.target.value);
										apply("color", e.target.value);
									}}
								/>
							</div>

							<div style={row}>
								<span>Background</span>
								<input
									type="color"
									value={bg}
									style={{ ...numInput, width: 40, padding: 2, cursor: "pointer" }}
									onChange={(e) => {
										setBg(e.target.value);
										apply("backgroundColor", e.target.value);
									}}
								/>
							</div>
						</>
					)}
				</div>
			)}
		</>
	);
}
