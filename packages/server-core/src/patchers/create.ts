import { readFileSync, writeFileSync } from "fs";
import { camelToKebab } from "./utils";

export function createRule(
	filePath: string,
	selector: string,
	prop: string,
	value: string,
) {
	const cssProp = camelToKebab(prop);
	const src = readFileSync(filePath, "utf-8");
	const block = `\n${selector} {\n  ${cssProp}: ${value};\n}\n`;
	writeFileSync(filePath, src + block, "utf-8");
	console.log(`[LSS] created ${selector} { ${cssProp}: ${value} } → ${filePath}`);
}
