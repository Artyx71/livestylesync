import { readFileSync, writeFileSync } from "fs";
import postcssScss from "postcss-scss";

export interface ScssVarDef {
	name: string;
	value: string;
	fileUrl: string;
}

export function scanScssVars(filePath: string): ScssVarDef[] {
	try {
		const src = readFileSync(filePath, "utf-8");
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const root = (postcssScss as any).parse(src);
		const vars: ScssVarDef[] = [];
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		root.walkDecls((decl: any) => {
			if (decl.prop.startsWith("$")) {
				vars.push({ name: decl.prop, value: decl.value, fileUrl: filePath });
			}
		});
		return vars;
	} catch {
		return [];
	}
}

export function patchScssVar(filePath: string, name: string, value: string): boolean {
	const src = readFileSync(filePath, "utf-8");
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const scssParser = postcssScss as any;
	const root = scssParser.parse(src);
	let found = false;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	root.walkDecls((decl: any) => {
		if (found) return false;
		if (decl.prop === name) {
			decl.value = value;
			found = true;
		}
	});
	if (!found) return false;
	let output = "";
	scssParser.stringify(root, (str: string) => { output += str; });
	writeFileSync(filePath, output, "utf-8");
	console.log(`[LSS] wrote SCSS var ${name}: ${value} → ${filePath}`);
	return true;
}
