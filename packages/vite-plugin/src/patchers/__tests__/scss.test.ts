import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { writeFileSync, mkdtempSync, rmSync, readFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { patchScss } from "../scss";

let dir: string;
let file: string;

function write(content: string) {
	writeFileSync(file, content, "utf-8");
}

function read() {
	return readFileSync(file, "utf-8");
}

beforeEach(() => {
	dir = mkdtempSync(join(tmpdir(), "lss-scss-"));
	file = join(dir, "test.scss");
});

afterEach(() => {
	rmSync(dir, { recursive: true });
});

describe("patchScss — top-level rule", () => {
	it("updates existing property", () => {
		write(".btn { color: red; }");
		patchScss(file, ".btn", "color", "blue");
		expect(read()).toContain("color: blue");
	});

	it("adds missing property", () => {
		write(".btn { font-size: 14px; }");
		patchScss(file, ".btn", "color", "blue");
		expect(read()).toContain("color: blue");
	});

	it("handles nested selector with &", () => {
		write(".nav {\n  &__item { color: red; }\n}");
		patchScss(file, ".nav__item", "color", "blue");
		expect(read()).toContain("color: blue");
	});
});

describe("patchScss — inside @media", () => {
	it("@media { selector } format", () => {
		write("@media (max-width: 768px) { .btn { color: red; } }");
		patchScss(file, ".btn", "color", "blue", "(max-width: 768px)");
		expect(read()).toContain("color: blue");
	});

	it("selector { @media { } } format", () => {
		write(".btn {\n  color: red;\n  @media (max-width: 768px) {\n    color: pink;\n  }\n}");
		patchScss(file, ".btn", "color", "blue", "(max-width: 768px)");
		expect(read()).toContain("color: blue");
	});

	it("selector { @media { } } adds missing property", () => {
		write(".btn {\n  color: red;\n  @media (max-width: 768px) {\n    font-size: 12px;\n  }\n}");
		patchScss(file, ".btn", "padding", "8px", "(max-width: 768px)");
		expect(read()).toContain("padding: 8px");
	});
});

describe("patchScss — no match", () => {
	it("does not modify file when selector not found", () => {
		const original = ".other { color: red; }";
		write(original);
		patchScss(file, ".btn", "color", "blue");
		expect(read()).toBe(original);
	});
});
