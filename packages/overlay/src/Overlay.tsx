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

function shortMedia(mq: string): string {
	const maxW = /max-width:\s*(\d+\w*)/.exec(mq);
	const minW = /min-width:\s*(\d+\w*)/.exec(mq);
	if (maxW) return `≤${maxW[1]}`;
	if (minW) return `≥${minW[1]}`;
	return "@media";
}

function groupTabLabel(g: RuleGroup): string {
	if (g.mediaQuery) {
		const mq = shortMedia(g.mediaQuery);
		return g.label !== "base" ? `${mq} ${g.label}` : mq;
	}
	return g.label;
}

function getAncestorPath(el: Element): Element[] {
	const path: Element[] = [];
	let cur: Element | null = el;
	while (cur && cur.tagName !== "BODY" && cur.tagName !== "HTML") {
		path.unshift(cur);
		cur = cur.parentElement;
	}
	return path;
}

function elLabel(el: Element): string {
	const tag = el.tagName.toLowerCase();
	const id = el.id ? `#${el.id}` : "";
	const cls = el.classList[0] ? `.${el.classList[0]}` : "";
	return `${tag}${id || cls}`;
}

interface RuleGroup {
	fileUrl: string;
	selector: string;
	label: string;
	styles: Record<string, string>;
	mediaQuery?: string;
}

interface RawRule {
	selectorText: string;
	parentSelectors: string[];
	mediaQuery?: string;
	style: CSSStyleDeclaration;
}

function resolveRawSelector(sel: string, parentSelectors: string[]): string {
	if (!sel.includes("&")) return sel;
	const parent = parentSelectors[parentSelectors.length - 1] ?? "";
	return sel.replace(/&/g, parent).trim();
}

function collectRawRules(
	rules: CSSRuleList,
	parentSelectors: string[] = [],
	mediaQuery?: string,
	result: RawRule[] = [],
): RawRule[] {
	for (const rule of Array.from(rules)) {
		if (rule instanceof CSSStyleRule) {
			result.push({ selectorText: rule.selectorText, parentSelectors, mediaQuery, style: rule.style });
			const mySel = resolveRawSelector(rule.selectorText, parentSelectors);
			if ((rule as unknown as { cssRules?: CSSRuleList }).cssRules?.length) {
				collectRawRules(
					(rule as unknown as { cssRules: CSSRuleList }).cssRules,
					[...parentSelectors, mySel],
					mediaQuery,
					result,
				);
			}
		} else if (rule instanceof CSSMediaRule) {
			collectRawRules(rule.cssRules, parentSelectors, rule.conditionText, result);
		} else if (rule instanceof CSSSupportsRule) {
			collectRawRules(rule.cssRules, parentSelectors, mediaQuery, result);
		} else if ("style" in rule) {
			// CSSNestedDeclarations (Chrome 130+) — no selectorText, inherits parent
			result.push({
				selectorText: "&",
				parentSelectors,
				mediaQuery,
				style: (rule as unknown as { style: CSSStyleDeclaration }).style,
			});
		}
	}
	return result;
}

function findAllSourceStyles(el: Element): RuleGroup[] {
	const groups: RuleGroup[] = [];
	const seenKeys = new Set<string>();

	for (const sheet of Array.from(document.styleSheets)) {
		let fileUrl: string | null = sheet.href;

		if (!fileUrl && sheet.ownerNode instanceof HTMLElement) {
			fileUrl = sheet.ownerNode.getAttribute("data-vite-dev-id");
		}

		if (!fileUrl) continue;

		let sheetRules: CSSRuleList;
		try {
			sheetRules = sheet.cssRules;
		} catch {
			continue;
		}

		// Pass 1: collect all rules with full parent selector context
		const rawRules = collectRawRules(sheetRules);

		// Pass 2: match each rule against the element
		for (const raw of rawRules) {
			const effectiveRaw = resolveRawSelector(raw.selectorText, raw.parentSelectors);
			const { mediaQuery } = raw;

			if (!effectiveRaw || effectiveRaw === "*" || effectiveRaw === "&") continue;

			const stripped = stripInteractivePseudos(effectiveRaw);
			const isPseudo = stripped !== effectiveRaw;

			let matches = false;
			try { matches = el.matches(effectiveRaw); } catch { /* skip */ }

			if (!matches && isPseudo && stripped) {
				try { matches = el.matches(stripped); } catch { /* skip */ }
			}

			if (!matches) continue;

			const seenKey = `${effectiveRaw}|||${mediaQuery ?? ""}`;
			if (seenKeys.has(seenKey)) continue;
			seenKeys.add(seenKey);

			const isCssModule = /\.module\.css$/.test(fileUrl);
			const isVue = fileUrl.includes("?vue&type=style");
			const isScoped = /\[data-v-[a-f0-9]+\]/.test(effectiveRaw);

			let selector = effectiveRaw.replace(/\[data-v-[a-f0-9]+\]/g, "").trim();

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
			for (const decl of raw.style.cssText.split(";")) {
				const colon = decl.indexOf(":");
				if (colon === -1) continue;
				const prop = decl.slice(0, colon).trim();
				const value = decl.slice(colon + 1).trim();
				if (prop && value) styles[prop] = value;
			}
			if (Object.keys(styles).length === 0) continue;

			const label = getPseudoLabel(selector);
			const group: RuleGroup = { fileUrl: cleanUrl, selector, label, styles, mediaQuery };

			if (isScoped) {
				groups.unshift(group);
			} else {
				groups.push(group);
			}
		}
	}

	const baseGroups = groups.filter((g) => g.label === "base" && !g.mediaQuery);
	const bestBase = baseGroups.reduce<RuleGroup | null>(
		(best, g) => (!best || Object.keys(g.styles).length > Object.keys(best.styles).length) ? g : best,
		null
	);
	const rest = groups.filter((g) => g.label !== "base" || g.mediaQuery);
	return bestBase ? [bestBase, ...rest] : rest;
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
	const activeStyles = activeGroup ? (groupStyles[activeGroup.selector + (activeGroup.mediaQuery ?? "")] ?? {}) : {};
	const activePending = activeGroup ? (allPending[activeGroup.selector + (activeGroup.mediaQuery ?? "")] ?? {}) : {};

	useEffect(() => {
		if (!selected) return;
		const groups = findAllSourceStyles(selected);
		setRuleGroups(groups);
		setActiveIdx(0);
		setGroupStyles(Object.fromEntries(groups.map((g) => [g.selector + (g.mediaQuery ?? ""), g.styles])));
		setAllPending({});
		setNewProp("");
		setNewValue("");
	}, [selected]);

	const groupKey = (g: RuleGroup) => g.selector + (g.mediaQuery ?? "");

	const handleChange = (prop: string, value: string) => {
		if (!activeGroup) return;
		const key = groupKey(activeGroup);
		(selected as HTMLElement)?.style.setProperty(prop, value);
		setGroupStyles((prev) => ({ ...prev, [key]: { ...prev[key], [prop]: value } }));
		setAllPending((prev) => ({ ...prev, [key]: { ...prev[key], [prop]: value } }));
	};

	const handleAdd = () => {
		const prop = newProp.trim();
		const value = newValue.trim();
		if (!prop || !value || !activeGroup) return;
		const key = groupKey(activeGroup);
		(selected as HTMLElement)?.style.setProperty(prop, value);
		setGroupStyles((prev) => ({ ...prev, [key]: { ...prev[key], [prop]: value } }));
		setAllPending((prev) => ({ ...prev, [key]: { ...prev[key], [prop]: value } }));
		setNewProp("");
		setNewValue("");
	};

	const totalPending = Object.values(allPending).reduce((sum, g) => sum + Object.keys(g).length, 0);
	const hasSource = ruleGroups.length > 0;

	const applyToFile = () => {
		Object.entries(allPending).forEach(([key, changes]) => {
			const group = ruleGroups.find((g) => groupKey(g) === key);
			if (!group) return;
			Object.entries(changes).forEach(([prop, value]) => {
				send({
					fileUrl: group.fileUrl,
					selector: group.selector,
					prop,
					value,
					mediaQuery: group.mediaQuery,
				});
			});
		});
		setGroupStyles((prev) => {
			const next = { ...prev };
			Object.entries(allPending).forEach(([key, changes]) => {
				next[key] = { ...next[key], ...changes };
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
							<div style={{ display: "flex", flexWrap: "wrap", gap: 2, margin: "8px 0 6px", alignItems: "center" }}>
								{getAncestorPath(selected).map((ancestor, i, arr) => (
									<span key={i} style={{ display: "flex", alignItems: "center", gap: 2 }}>
										<button
											onClick={() => setSelected(ancestor)}
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

							{ruleGroups.length > 1 && (
								<div style={{ display: "flex", gap: 4, marginBottom: 10, flexWrap: "wrap" }}>
									{ruleGroups.map((g, i) => (
										<button
											key={groupKey(g)}
											onClick={() => setActiveIdx(i)}
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
