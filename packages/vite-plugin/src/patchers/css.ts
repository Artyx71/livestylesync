import { readFileSync, writeFileSync } from "fs";
import postcss from "postcss";
import { camelToKebab } from "./utils";

export function patchCss(filePath: string, selector: string, prop: string, value: string, mediaQuery?: string) {
	const cssProp = camelToKebab(prop);
	const src = readFileSync(filePath, "utf-8");
	const root = postcss.parse(src);
	const normalizedSelector = selector.replace(/\s+/g, " ").trim();
	const normalizedMedia = mediaQuery?.replace(/\s+/g, " ").trim();

	let found = false;

	root.walkRules((rule) => {
		if (found) return false;
		if (rule.selector.replace(/\s+/g, " ").trim() !== normalizedSelector) return;

		if (normalizedMedia) {
			let inTargetMedia = false;
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			let p: any = rule.parent;
			while (p) {
				if (p.type === "atrule" && p.name === "media") {
					if (p.params.replace(/\s+/g, " ").trim() === normalizedMedia) {
						inTargetMedia = true;
						break;
					}
				}
				p = p.parent;
			}
			if (!inTargetMedia) return;
		} else {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			let p: any = rule.parent;
			while (p) {
				if (p.type === "atrule" && p.name === "media") return;
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

	// CSS nesting: selector { @media { declarations directly, no inner rule } }
	if (!found && normalizedMedia) {
		root.walkRules((rule) => {
			if (found) return false;
			if (rule.selector.replace(/\s+/g, " ").trim() !== normalizedSelector) return;

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			let p: any = rule.parent;
			while (p) {
				if (p.type === "atrule" && p.name === "media") return;
				p = p.parent;
			}

			rule.each((child) => {
				if (found) return false;
				if (child.type !== "atrule") return;
				const atRule = child as postcss.AtRule;
				if (atRule.name !== "media") return;
				if (atRule.params.replace(/\s+/g, " ").trim() !== normalizedMedia) return;

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
		console.log("[LSS] selector not found in CSS, skipping");
		return;
	}

	writeFileSync(filePath, root.toString(), "utf-8");
	console.log(`[LSS] wrote ${cssProp}: ${value} → ${filePath}`);
}
