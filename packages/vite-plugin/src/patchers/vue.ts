import { readFileSync, writeFileSync } from "fs";
import { camelToKebab, selectorToRegex, findBlock, findMediaBlock, patchBlockContent } from "./utils";

export function patchVue(filePath: string, selector: string, prop: string, value: string, mediaQuery?: string): boolean {
	const cssProp = camelToKebab(prop);
	const src = readFileSync(filePath, "utf-8");

	const styleMatch = /<style[^>]*scoped[^>]*>([\s\S]*?)<\/style>/m.exec(src);
	if (!styleMatch) {
		console.log("[LSS] no <style scoped> block found");
		return false;
	}

	const styleStart = styleMatch.index + styleMatch[0].indexOf(">") + 1;
	const css = styleMatch[1];
	const selRegex = selectorToRegex(selector);

	let newCss: string | null = null;

	if (mediaQuery) {
		// Try: @media { selector { } }
		const mediaBlock = findMediaBlock(css, mediaQuery);
		if (mediaBlock) {
			const inner = css.slice(mediaBlock.start + 1, mediaBlock.end);
			const block = findBlock(inner, selRegex);
			if (block) {
				const content = inner.slice(block.start + 1, block.end);
				const patched = patchBlockContent(content, cssProp, value, "    ");
				const newInner = inner.slice(0, block.start + 1) + patched + inner.slice(block.end);
				newCss = css.slice(0, mediaBlock.start + 1) + newInner + css.slice(mediaBlock.end);
			}
		}

		// Try: selector { @media { } }
		if (!newCss) {
			const outerBlock = findBlock(css, selRegex);
			if (outerBlock) {
				const inner = css.slice(outerBlock.start + 1, outerBlock.end);
				const innerMedia = findMediaBlock(inner, mediaQuery);
				if (innerMedia) {
					const content = inner.slice(innerMedia.start + 1, innerMedia.end);
					const patched = patchBlockContent(content, cssProp, value, "    ");
					const newInner = inner.slice(0, innerMedia.start + 1) + patched + inner.slice(innerMedia.end);
					newCss = css.slice(0, outerBlock.start + 1) + newInner + css.slice(outerBlock.end);
				}
			}
		}
	} else {
		const block = findBlock(css, selRegex);
		if (block) {
			const content = css.slice(block.start + 1, block.end);
			const patched = patchBlockContent(content, cssProp, value, "  ");
			newCss = css.slice(0, block.start + 1) + patched + css.slice(block.end);
		}
	}

	if (!newCss) {
		console.log("[LSS] selector not found in <style scoped>");
		return false;
	}

	const updated = src.slice(0, styleStart) + newCss + src.slice(styleStart + css.length);
	writeFileSync(filePath, updated, "utf-8");
	console.log(`[LSS] wrote ${cssProp}: ${value} → ${filePath} (vue scoped)`);
	return true;
}
