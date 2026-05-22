import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { writeFileSync, mkdtempSync, rmSync, readFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { scanScssVars, patchScssVar } from "../scss-vars";

let dir: string;
let file: string;

function write(content: string) {
	writeFileSync(file, content, "utf-8");
}

function read() {
	return readFileSync(file, "utf-8");
}

beforeEach(() => {
	dir = mkdtempSync(join(tmpdir(), "lss-scss-vars-"));
	file = join(dir, "test.scss");
});

afterEach(() => {
	rmSync(dir, { recursive: true });
});

describe("scanScssVars", () => {
	it("finds top-level variables", () => {
		write("$primary: #fff;\n$size: 16px;\n");
		const vars = scanScssVars(file);
		expect(vars).toHaveLength(2);
		expect(vars[0]).toMatchObject({ name: "$primary", value: "#fff", fileUrl: file });
		expect(vars[1]).toMatchObject({ name: "$size", value: "16px", fileUrl: file });
	});

	it("returns empty array for file with no variables", () => {
		write(".card { color: red; }");
		expect(scanScssVars(file)).toHaveLength(0);
	});

	it("returns empty array for non-existent file", () => {
		expect(scanScssVars("/does/not/exist.scss")).toHaveLength(0);
	});

	it("finds variables mixed with rules", () => {
		write("$gap: 8px;\n.card { padding: $gap; }\n$color: blue;\n");
		const vars = scanScssVars(file);
		expect(vars.map((v) => v.name)).toContain("$gap");
		expect(vars.map((v) => v.name)).toContain("$color");
	});
});

describe("patchScssVar", () => {
	it("updates variable value and returns true", () => {
		write("$primary: #fff;\n");
		const result = patchScssVar(file, "$primary", "#000");
		expect(result).toBe(true);
		expect(read()).toContain("$primary: #000");
	});

	it("returns false when variable not found", () => {
		write("$other: red;\n");
		const result = patchScssVar(file, "$missing", "blue");
		expect(result).toBe(false);
		expect(read()).toContain("$other: red");
	});

	it("preserves other variables", () => {
		write("$a: 1px;\n$b: 2px;\n$c: 3px;\n");
		patchScssVar(file, "$b", "99px");
		const out = read();
		expect(out).toContain("$a: 1px");
		expect(out).toContain("$b: 99px");
		expect(out).toContain("$c: 3px");
	});

	it("preserves surrounding CSS rules", () => {
		write("$size: 16px;\n\n.card {\n  font-size: $size;\n}\n");
		patchScssVar(file, "$size", "20px");
		const out = read();
		expect(out).toContain("$size: 20px");
		expect(out).toContain(".card");
		expect(out).toContain("font-size: $size");
	});

	it("patches only the first occurrence when variable declared multiple times", () => {
		write("$color: red;\n\n.dark {\n  $color: blue;\n  color: $color;\n}\n");
		patchScssVar(file, "$color", "green");
		expect(read()).toContain("$color: green");
	});

	it("accepts empty string as valid value", () => {
		write('$content: "hello";\n');
		const result = patchScssVar(file, "$content", '""');
		expect(result).toBe(true);
	});

	it("accepts 0 as valid value", () => {
		write("$gap: 8px;\n");
		const result = patchScssVar(file, "$gap", "0");
		expect(result).toBe(true);
		expect(read()).toContain("$gap: 0");
	});
});
