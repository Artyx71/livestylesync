import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { writeFileSync, mkdtempSync, rmSync } from "fs";
import { readFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { patchCss } from "../css";

let dir: string;
let file: string;

function write(content: string) {
	writeFileSync(file, content, "utf-8");
}

function read() {
	return readFileSync(file, "utf-8");
}

beforeEach(() => {
	dir = mkdtempSync(join(tmpdir(), "lss-css-"));
	file = join(dir, "test.css");
});

afterEach(() => {
	rmSync(dir, { recursive: true });
});

describe("patchCss — top-level rule", () => {
	it("updates existing property", () => {
		write(".btn { color: red; font-size: 14px; }");
		patchCss(file, ".btn", "color", "blue");
		expect(read()).toContain("color: blue");
		expect(read()).not.toContain("color: red");
	});

	it("adds missing property", () => {
		write(".btn { font-size: 14px; }");
		patchCss(file, ".btn", "color", "blue");
		expect(read()).toContain("color: blue");
	});

	it("converts camelCase prop to kebab-case", () => {
		write(".box { background-color: red; }");
		patchCss(file, ".box", "backgroundColor", "blue");
		expect(read()).toContain("background-color: blue");
	});

	it("does not touch unrelated rules", () => {
		write(".btn { color: red; } .other { margin: 0; }");
		patchCss(file, ".btn", "color", "blue");
		const result = read();
		expect(result).toContain("color: blue");
		expect(result).toContain(".other { margin: 0; }");
	});
});

describe("patchCss — inside @media", () => {
	it("updates property inside matching @media", () => {
		write("@media (max-width: 768px) { .btn { color: red; } }");
		patchCss(file, ".btn", "color", "blue", "(max-width: 768px)");
		expect(read()).toContain("color: blue");
	});

	it("does not touch rule outside @media when mediaQuery given", () => {
		write(".btn { color: red; } @media (max-width: 768px) { .btn { color: pink; } }");
		patchCss(file, ".btn", "color", "blue", "(max-width: 768px)");
		const result = read();
		// top-level rule unchanged
		expect(result).toMatch(/\.btn \{ color: red;/);
		// @media rule updated
		expect(result).toContain("color: blue");
	});

	it("adds missing property inside @media", () => {
		write("@media (max-width: 768px) { .btn { font-size: 12px; } }");
		patchCss(file, ".btn", "color", "blue", "(max-width: 768px)");
		expect(read()).toContain("color: blue");
	});
});

describe("patchCss — CSS nesting selector { @media { } }", () => {
	it("updates property in nested @media with no inner rule", () => {
		write(".btn {\n  color: red;\n  @media (max-width: 768px) {\n    color: pink;\n  }\n}");
		patchCss(file, ".btn", "color", "blue", "(max-width: 768px)");
		expect(read()).toContain("color: blue");
	});
});

describe("patchCss — no match", () => {
	it("does not modify file when selector not found", () => {
		const original = ".other { color: red; }";
		write(original);
		patchCss(file, ".btn", "color", "blue");
		expect(read()).toBe(original);
	});
});
