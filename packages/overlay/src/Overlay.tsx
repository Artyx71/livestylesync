import { useState, useEffect, useRef } from "react";
import { useWebSocket } from "./useWebSocket";

const INTERACTIVE_PSEUDOS = [
	":hover", ":focus", ":focus-visible", ":focus-within",
	":active", ":checked", ":disabled", ":visited",
];

function stripInteractivePseudos(selector: string): string {
	let s = selector;
	for (const p of INTERACTIVE_PSEUDOS) {
		s = s.split(p).join("");
	}
	return s.trim();
}

function getPseudoLabel(selector: string): string {
	for (const p of INTERACTIVE_PSEUDOS) {
		if (selector.includes(p)) return p;
	}
	return "base";
}

interface RuleGroup {
	fileUrl: string;
	selector: string;
	label: string;
	styles: Record<string, string>;
}

function* iterateStyleRules(rules: CSSRuleList): Generator<CSSStyleRule> {
	for (const rule of Array.from(rules)) {
		if (rule instanceof CSSStyleRule) {
			yield rule;
			if ((rule as unknown as { cssRules?: CSSRuleList }).cssRules?.length) {
				yield* iterateStyleRules((rule as unknown as { cssRules: CSSRuleList }).cssRules);
			}
		} else if (rule instanceof CSSMediaRule || rule instanceof CSSSupportsRule) {
			yield* iterateStyleRules(rule.cssRules);
		}
	}
}

function findAllSourceStyles(el: Element): RuleGroup[] {
	const groups: RuleGroup[] = [];
	const seenSelectors = new Set<string>();

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

		for (const rule of iterateStyleRules(rules)) {
			if (rule.selectorText === "*") continue;

			const raw = rule.selectorText;
			const stripped = stripInteractivePseudos(raw);
			const isPseudo = stripped !== raw;

			let matches = false;
			try { matches = el.matches(raw); } catch { /* skip */ }

			if (!matches && isPseudo && stripped) {
				try { matches = el.matches(stripped); } catch { /* skip */ }
			}

			if (!matches) continue;
			if (seenSelectors.has(raw)) continue;
			seenSelectors.add(raw);

			const isCssModule = /\.module\.css$/.test(fileUrl);
			const isVue = fileUrl.includes("?vue&type=style");
			const isScoped = /\[data-v-[a-f0-9]+\]/.test(raw);

			let selector = raw.replace(/\[data-v-[a-f0-9]+\]/g, "").trim();

			if (isCssModule) {
				selector = selector.replace(/\._[^.\s,>~+[\]]+/g, (match) => {
					let name = match.slice(2);
					name = name.replace(/_\d+$/, "");
					name = name.replace(/_[a-z0-9]{4,8}$/, "");
					return "." + name;
				});
			}

			const cleanUrl = isVue ? fileUrl.split("?")[0] : fileUrl;

			const styles: Record<string, string> = {};
			for (const decl of rule.style.cssText.split(";")) {
				const colon = decl.indexOf(":");
				if (colon === -1) continue;
				const prop = decl.slice(0, colon).trim();
				const value = decl.slice(colon + 1).trim();
				if (prop && value) styles[prop] = value;
			}
			if (Object.keys(styles).length === 0) continue;

			const label = getPseudoLabel(selector);
			const group = { fileUrl: cleanUrl, selector, label, styles };

			if (isScoped) {
				groups.unshift(group);
			} else {
				groups.push(group);
			}
		}
	}

	// Keep only the base rule with the most properties (most specific)
	const baseGroups = groups.filter((g) => g.label === "base");
	const bestBase = baseGroups.reduce<RuleGroup | null>(
		(best, g) => (!best || Object.keys(g.styles).length > Object.keys(best.styles).length) ? g : best,
		null
	);
	const pseudo = groups.filter((g) => g.label !== "base");
	return bestBase ? [bestBase, ...pseudo] : pseudo;
}

export function Overlay({ port = 3100 }: { port?: number }) {
	const [open, setOpen] = useState(false);
	const [picking, setPicking] = useState(false);
	const [selected, setSelected] = useState<Element | null>(null);
	const highlightRef = useRef<HTMLDivElement>(null);
	const overlayRootRef = useRef<HTMLDivElement>(null);

	const [ruleGroups, setRuleGroups] = useState<RuleGroup[]>([]);
	const [activeIdx, setActiveIdx] = useState(0);
	const [groupStyles, setGroupStyles] = useState<Record<string, Record<string, string>>>({});
	const [allPending, setAllPending] = useState<Record<string, Record<string, string>>>({});

	const [newProp, setNewProp] = useState("");
	const [newValue, setNewValue] = useState("");

	const { send } = useWebSocket(`ws://localhost:${port}`);

	const activeGroup = ruleGroups[activeIdx] ?? null;
	const activeStyles = activeGroup ? (groupStyles[activeGroup.selector] ?? {}) : {};
	const activePending = activeGroup ? (allPending[activeGroup.selector] ?? {}) : {};

	useEffect(() => {
		if (!selected) return;
		const groups = findAllSourceStyles(selected);
		setRuleGroups(groups);
		setActiveIdx(0);
		setGroupStyles(Object.fromEntries(groups.map((g) => [g.selector, g.styles])));
		setAllPending({});
		setNewProp("");
		setNewValue("");
	}, [selected]);

	const handleChange = (prop: string, value: string) => {
		if (!activeGroup) return;
		const sel = activeGroup.selector;
		(selected as HTMLElement)?.style.setProperty(prop, value);
		setGroupStyles((prev) => ({ ...prev, [sel]: { ...prev[sel], [prop]: value } }));
		setAllPending((prev) => ({ ...prev, [sel]: { ...prev[sel], [prop]: value } }));
	};

	const handleAdd = () => {
		const prop = newProp.trim();
		const value = newValue.trim();
		if (!prop || !value || !activeGroup) return;
		const sel = activeGroup.selector;
		(selected as HTMLElement)?.style.setProperty(prop, value);
		setGroupStyles((prev) => ({ ...prev, [sel]: { ...prev[sel], [prop]: value } }));
		setAllPending((prev) => ({ ...prev, [sel]: { ...prev[sel], [prop]: value } }));
		setNewProp("");
		setNewValue("");
	};

	const totalPending = Object.values(allPending).reduce((sum, g) => sum + Object.keys(g).length, 0);
	const hasSource = ruleGroups.length > 0;

	const applyToFile = () => {
		Object.entries(allPending).forEach(([selector, changes]) => {
			const group = ruleGroups.find((g) => g.selector === selector);
			if (!group) return;
			Object.entries(changes).forEach(([prop, value]) => {
				send({ fileUrl: group.fileUrl, selector, prop, value });
			});
		});
		setGroupStyles((prev) => {
			const next = { ...prev };
			Object.entries(allPending).forEach(([sel, changes]) => {
				next[sel] = { ...next[sel], ...changes };
			});
			return next;
		});
		setAllPending({});
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

	const valueInput = (prop: string): React.CSSProperties => ({
		flex: 1,
		background: "#2d2d4e",
		border: "1px solid " + (activePending[prop] !== undefined ? "#f59e0b" : "#555"),
		borderRadius: 4,
		color: "#fff",
		fontFamily: "monospace",
		fontSize: 11,
		padding: "2px 6px",
	});

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
			h.style.top = rect.top + "px";
			h.style.left = rect.left + "px";
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
					position: "fixed",
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
							<p style={{ margin: "8px 0 6px", color: "#7C3AED", fontSize: 11 }}>
								{selected.tagName.toLowerCase()}
								{selected.className ? "." + String(selected.className).split(" ")[0] : ""}
							</p>

							{ruleGroups.length > 1 && (
								<div style={{ display: "flex", gap: 4, marginBottom: 10, flexWrap: "wrap" }}>
									{ruleGroups.map((g, i) => (
										<button
											key={g.selector}
											onClick={() => setActiveIdx(i)}
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
											{g.label}
											{allPending[g.selector] && Object.keys(allPending[g.selector]).length > 0 && (
												<span style={{ color: "#f59e0b", marginLeft: 4 }}>●</span>
											)}
										</button>
									))}
								</div>
							)}

							{activeGroup && Object.keys(activeStyles).length > 0 ? (
								Object.entries(activeStyles).map(([prop, value]) => (
									<div key={prop} style={row}>
										<span style={propLabel} title={prop}>{prop}</span>
										<input
											style={valueInput(prop)}
											value={value}
											onChange={(e) => handleChange(prop, e.target.value)}
										/>
									</div>
								))
							) : (
								<p style={{ color: "#555", fontSize: 11, margin: "8px 0" }}>
									{activeGroup ? "No properties" : "No CSS source found"}
								</p>
							)}

							<div style={{ ...row, marginTop: 10, borderTop: "1px solid #333", paddingTop: 10 }}>
								<input
									placeholder="property"
									value={newProp}
									style={{ ...plainInput, width: 110, flex: "none" }}
									onChange={(e) => setNewProp(e.target.value)}
									onKeyDown={(e) => e.key === "Enter" && handleAdd()}
								/>
								<input
									placeholder="value"
									value={newValue}
									style={plainInput}
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

							{totalPending > 0 && (
								<button
									onClick={applyToFile}
									style={{
										width: "100%",
										padding: "6px 0",
										marginTop: 10,
										background: hasSource ? "#065f46" : "#2d2d4e",
										color: hasSource ? "#6ee7b7" : "#555",
										border: "1px solid " + (hasSource ? "#059669" : "#444"),
										borderRadius: 6,
										cursor: hasSource ? "pointer" : "not-allowed",
										fontFamily: "monospace",
										fontSize: 11,
									}}
								>
									{hasSource
										? `✓ Apply ${totalPending} change${totalPending > 1 ? "s" : ""} to file`
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
