import { readFileSync, writeFileSync } from "fs";
import postcss from "postcss";
import postcssScss from "postcss-scss";
import { camelToKebab } from "./utils";

function resolveRuleSelector(rule: postcss.Rule): string {
	const selectors = rule.selector.split(",").map((s) => s.trim());
	let parent = rule.parent;

	while (parent && "selector" in parent) {
		const parentSelectors = (parent as postcss.Rule).selector.split(",").map((s) => s.trim());
		const resolved: string[] = [];

		for (const ps of parentSelectors) {
			for (const cs of selectors) {
				if (cs.includes("&")) {
					resolved.push(cs.replace(/&/g, ps).trim());
				} else {
					resolved.push(`${ps} ${cs}`.trim());
				}
			}
		}

		selectors.length = 0;
		selectors.push(...resolved);
		parent = (parent as postcss.Rule).parent;
	}

	return selectors.join(", ");
}

export function patchScss(filePath: string, selector: string, prop: string, value: string, mediaQuery?: string): boolean {
	const cssProp = camelToKebab(prop);
	const src = readFileSync(filePath, "utf-8");
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const scssParser = postcssScss as any;
	const root: postcss.Root = scssParser.parse(src);
	const normalizedSelector = selector.replace(/\s+/g, " ").trim();
	const normalizedMedia = mediaQuery?.replace(/\s+/g, " ").trim();

	let found = false;

	const isContainer = normalizedMedia?.startsWith("@container") ?? false;
	const atRuleName = isContainer ? "container" : "media";
	const atRuleParams = isContainer ? normalizedMedia!.slice("@container".length).trim() : normalizedMedia;

	root.walkRules((rule) => {
		if (found) return false;
		const resolved = resolveRuleSelector(rule).replace(/\s+/g, " ").trim();
		if (resolved !== normalizedSelector) return;

		if (normalizedMedia) {
			let inTargetMedia = false;
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			let p: any = rule.parent;
			while (p) {
				if (p.type === "atrule" && p.name === atRuleName) {
					const params: string = p.params.replace(/\s+/g, " ").trim();
					if (params === atRuleParams) { inTargetMedia = true; break; }
				}
				p = p.parent;
			}
			if (!inTargetMedia) return;
		} else {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			let p: any = rule.parent;
			while (p) {
				if (p.type === "atrule" && (p.name === "media" || p.name === "container")) return;
				p = p.parent;
			}
		}

		let propFound = false;
		rule.walkDecls(cssProp, (decl) => {
			decl.value = value;
			propFound = true;
		});
		if (!propFound) {
			rule.append(new postcss.Declaration({ prop: cssProp, value }));
		}
		found = true;
	});

	// SCSS nesting: selector { @media { declarations directly } }
	if (!found && normalizedMedia) {
		root.walkRules((rule) => {
			if (found) return false;
			const resolved = resolveRuleSelector(rule).replace(/\s+/g, " ").trim();
			if (resolved !== normalizedSelector) return;

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			let p: any = rule.parent;
			while (p) {
				if (p.type === "atrule" && (p.name === "media" || p.name === "container")) return;
				p = p.parent;
			}

			rule.each((child) => {
				if (found) return false;
				if (child.type !== "atrule") return;
				const atRule = child as postcss.AtRule;
				if (atRule.name !== atRuleName) return;
				if (atRule.params.replace(/\s+/g, " ").trim() !== atRuleParams) return;

				let propFound = false;
				atRule.walkDecls(cssProp, (decl) => {
					decl.value = value;
					propFound = true;
				});
				if (!propFound) {
					atRule.append(new postcss.Declaration({ prop: cssProp, value }));
				}
				found = true;
			});
		});
	}

	if (!found) {
		console.log("[LSS] selector not found in SCSS");
		return false;
	}

	let output = "";
	scssParser.stringify(root, (str: string) => { output += str; });
	writeFileSync(filePath, output, "utf-8");
	console.log(`[LSS] wrote ${cssProp}: ${value} → ${filePath} (scss)`);
	return true;
}
