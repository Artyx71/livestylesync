import { useState, useEffect, useRef } from "react";
import { useWebSocket } from "./useWebSocket";

function findSourceStyle(el: Element): { fileUrl: string; selector: string; styles: Record<string, string> } | null {
	const matches: { fileUrl: string; selector: string; scoped: boolean; styles: Record<string, string> }[] = [];

	for (const sheet of Array.from(document.styleSheets)) {
		let fileUrl: string | null = sheet.href;

		if (!fileUrl && sheet.ownerNode instanceof HTMLElement) {
			fileUrl = sheet.ownerNode.getAttribute("data-vite-dev-id");
		}

		if (!fileUrl) continue;

		let rules: CSSRuleList;
		try {
			rules = sheet.cssRules;
		} catch {
			continue;
		}

		for (const rule of Array.from(rules)) {
			if (!(rule instanceof CSSStyleRule)) continue;
			if (rule.selectorText === "*") continue;
			try {
				if (el.matches(rule.selectorText)) {
					const isScoped = /\[data-v-[a-f0-9]+\]/.test(rule.selectorText);
					const isCssModule = /\.module\.css$/.test(fileUrl);
					let selector = rule.selectorText.replace(/\[data-v-[a-f0-9]+\]/g, "").trim();
					if (isCssModule) {
						selector = selector.replace(/\._[^.\s,>~+[\]]+/g, (match) => {
							let name = match.slice(2); // strip ._
							name = name.replace(/_\d+$/, ""); // strip _17
							name = name.replace(/_[a-z0-9]{4,8}$/, ""); // strip _lhkgo
							return "." + name;
						});
					}
					const cleanUrl = fileUrl.includes("?vue&type=style")
						? fileUrl.split("?")[0]
						: fileUrl;

					const styles: Record<string, string> = {};
					for (let i = 0; i < rule.style.length; i++) {
						const prop = rule.style[i];
						styles[prop] = rule.style.getPropertyValue(prop).trim();
					}

					matches.push({ fileUrl: cleanUrl, selector, scoped: isScoped, styles });
				}
			} catch {
				continue;
			}
		}
	}

	const scoped = matches.find((m) => m.scoped);
	const match = scoped ?? matches[0] ?? null;
	if (!match) return null;
	return { fileUrl: match.fileUrl, selector: match.selector, styles: match.styles };
}

export function Overlay({ port = 3100 }: { port?: number }) {
	const [open, setOpen] = useState(false);
	const [picking, setPicking] = useState(false);
	const [selected, setSelected] = useState<Element | null>(null);
	const highlightRef = useRef<HTMLDivElement>(null);
	const overlayRootRef = useRef<HTMLDivElement>(null);

	const [source, setSource] = useState<{ fileUrl: string; selector: string } | null>(null);
	const [styles, setStyles] = useState<Record<string, string>>({});
	const [origStyles, setOrigStyles] = useState<Record<string, string>>({});
	const [pendingChanges, setPendingChanges] = useState<Record<string, string>>({});

	const [newProp, setNewProp] = useState("");
	const [newValue, setNewValue] = useState("");

	const { send } = useWebSocket(`ws://localhost:${port}`);

	useEffect(() => {
		if (!selected) return;
		const result = findSourceStyle(selected);
		setSource(result ? { fileUrl: result.fileUrl, selector: result.selector } : null);
		setStyles(result?.styles ?? {});
		setOrigStyles(result?.styles ?? {});
		setPendingChanges({});
		setNewProp("");
		setNewValue("");
	}, [selected]);

	const applyStyle = (prop: string, value: string) => {
		if (!selected) return;
		(selected as HTMLElement).style.setProperty(prop, value);
	};

	const handleChange = (prop: string, value: string) => {
		setStyles((prev) => ({ ...prev, [prop]: value }));
		applyStyle(prop, value);
		setPendingChanges((prev) => ({ ...prev, [prop]: value }));
	};

	const handleAdd = () => {
		const prop = newProp.trim();
		const value = newValue.trim();
		if (!prop || !value) return;
		setStyles((prev) => ({ ...prev, [prop]: value }));
		applyStyle(prop, value);
		setPendingChanges((prev) => ({ ...prev, [prop]: value }));
		setNewProp("");
		setNewValue("");
	};

	const applyToFile = () => {
		if (!source) return;
		Object.entries(pendingChanges).forEach(([prop, value]) => {
			send({ ...source, prop, value });
		});
		setOrigStyles((prev) => ({ ...prev, ...pendingChanges }));
		setPendingChanges({});
	};

	const panel: React.CSSProperties = {
		position: "fixed",
		bottom: 44,
		right: 20,
		width: 300,
		maxHeight: "70vh",
		overflowY: "auto",
		background: "#1a1a2e",
		border: "1px solid #7C3AED",
		borderRadius: 8,
		padding: 16,
		zIndex: 9999,
		color: "#fff",
		fontFamily: "monospace",
		fontSize: 12,
	};

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

	const valueInput: React.CSSProperties = {
		flex: 1,
		background: "#2d2d4e",
		border: "1px solid #555",
		borderRadius: 4,
		color: "#fff",
		fontFamily: "monospace",
		fontSize: 11,
		padding: "2px 6px",
	};

	const pendingInput = (prop: string): React.CSSProperties => ({
		...valueInput,
		borderColor: pendingChanges[prop] !== undefined ? "#f59e0b" : "#555",
	});

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
				<div ref={overlayRootRef} style={panel}>
					<p style={{ margin: "0 0 10px", fontSize: 13 }}>LiveStyleSync</p>

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
							<p style={{ margin: "8px 0 10px", color: "#7C3AED", fontSize: 11 }}>
								{selected.tagName.toLowerCase()}
								{selected.className ? "." + String(selected.className).split(" ")[0] : ""}
								{source ? "" : " — CSS source not found"}
							</p>

							{Object.keys(styles).length > 0 ? (
								<>
									{Object.entries(styles).map(([prop, value]) => (
										<div key={prop} style={row}>
											<span style={propLabel} title={prop}>{prop}</span>
											<input
												style={pendingInput(prop)}
												value={value}
												onChange={(e) => handleChange(prop, e.target.value)}
											/>
										</div>
									))}
								</>
							) : (
								<p style={{ color: "#555", fontSize: 11, margin: "8px 0" }}>
									No CSS rules found for this element
								</p>
							)}

							<div style={{ ...row, marginTop: 10, borderTop: "1px solid #333", paddingTop: 10 }}>
								<input
									placeholder="property"
									value={newProp}
									style={{ ...valueInput, width: 110, flex: "none" }}
									onChange={(e) => setNewProp(e.target.value)}
									onKeyDown={(e) => e.key === "Enter" && handleAdd()}
								/>
								<input
									placeholder="value"
									value={newValue}
									style={valueInput}
									onChange={(e) => setNewValue(e.target.value)}
									onKeyDown={(e) => e.key === "Enter" && handleAdd()}
								/>
								<button
									onClick={handleAdd}
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

							{Object.keys(pendingChanges).length > 0 && (
								<button
									onClick={applyToFile}
									style={{
										width: "100%",
										padding: "6px 0",
										marginTop: 10,
										background: source ? "#065f46" : "#2d2d4e",
										color: source ? "#6ee7b7" : "#555",
										border: "1px solid " + (source ? "#059669" : "#444"),
										borderRadius: 6,
										cursor: source ? "pointer" : "not-allowed",
										fontFamily: "monospace",
										fontSize: 11,
									}}
								>
									{source
										? `✓ Apply ${Object.keys(pendingChanges).length} change${Object.keys(pendingChanges).length > 1 ? "s" : ""} to file`
										: "✗ No CSS source found"}
								</button>
							)}
						</>
					)}
				</div>
			)}
		</>
	);
}
