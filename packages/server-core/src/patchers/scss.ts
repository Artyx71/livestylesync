import { readFileSync, writeFileSync } from "fs";
import postcss from "postcss";
import postcssScss from "postcss-scss";
import { camelToKebab, resolveRuleSelector } from "./utils";

export function patchScss(filePath: string, selector: string, prop: string, value: string, mediaQuery?: string): { patched: boolean; line?: number } {
	const cssProp = camelToKebab(prop);
	const src = readFileSync(filePath, "utf-8");
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const scssParser = postcssScss as any;
	const root: postcss.Root = scssParser.parse(src);
	const normalizedSelector = selector.replace(/\s+/g, " ").trim();
	const normalizedMedia = mediaQuery?.replace(/\s+/g, " ").trim();

	let found = false;
	let foundLine: number | undefined;

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
		foundLine = rule.source?.start?.line;
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
				foundLine = rule.source?.start?.line;
				found = true;
			});
		});
	}

	if (!found) {
		console.log("[LSS] selector not found in SCSS");
		return { patched: false };
	}

	let output = "";
	scssParser.stringify(root, (str: string) => { output += str; });
	writeFileSync(filePath, output, "utf-8");
	console.log(`[LSS] wrote ${cssProp}: ${value} → ${filePath} (scss)`);
	return { patched: true, line: foundLine };
}
