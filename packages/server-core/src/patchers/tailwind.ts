import { readFileSync, writeFileSync, readdirSync, statSync } from "fs";
import { join } from "path";

const SOURCE_EXTS = new Set([".tsx", ".jsx", ".ts", ".js", ".vue", ".html", ".svelte"]);
const IGNORE_DIRS = new Set(["node_modules", ".git", "dist", ".nuxt", ".next", "out", ".vite"]);

function findSourceFiles(root: string, files: string[] = []): string[] {
	try {
		for (const entry of readdirSync(root)) {
			if (IGNORE_DIRS.has(entry)) continue;
			const full = join(root, entry);
			const stat = statSync(full);
			if (stat.isDirectory()) {
				findSourceFiles(full, files);
			} else {
				const ext = entry.slice(entry.lastIndexOf("."));
				if (SOURCE_EXTS.has(ext)) files.push(full);
			}
		}
	} catch { /* skip unreadable */ }
	return files;
}

function replaceInLine(line: string, oldCls: string, newCls: string): string | null {
	const attrRegex = /(\bclass(?:Name)?\s*=\s*["'`])([^"'`]*)(?=["'`])/g;
	let changed = false;
	const updated = line.replace(attrRegex, (match, prefix, value: string) => {
		const classes = value.split(/\s+/).filter(Boolean);
		const idx = classes.indexOf(oldCls);
		if (idx === -1) return match;
		changed = true;
		if (newCls) {
			classes[idx] = newCls;
		} else {
			classes.splice(idx, 1);
		}
		return prefix + classes.join(" ");
	});
	return changed ? updated : null;
}

export function patchTailwindClass(
	root: string,
	allClasses: string[],
	oldClass: string,
	newClass: string,
): { patched: boolean } {
	const files = findSourceFiles(root);
	// Require at least min(3, total) classes to match the same line for uniqueness
	const minMatch = Math.min(3, allClasses.length);

	for (const file of files) {
		let src: string;
		try {
			src = readFileSync(file, "utf-8");
		} catch {
			continue;
		}
		const lines = src.split("\n");
		for (let i = 0; i < lines.length; i++) {
			if (!lines[i].includes(oldClass)) continue;
			const matchCount = allClasses.filter((c) => lines[i].includes(c)).length;
			if (matchCount < minMatch) continue;
			const updated = replaceInLine(lines[i], oldClass, newClass);
			if (updated === null) continue;
			lines[i] = updated;
			writeFileSync(file, lines.join("\n"), "utf-8");
			console.log(`[LSS] Tailwind: ${oldClass} → ${newClass || "(removed)"} in ${file}:${i + 1}`);
			return { patched: true };
		}
	}

	console.log(`[LSS] Tailwind: class "${oldClass}" not found in source files`);
	return { patched: false };
}
