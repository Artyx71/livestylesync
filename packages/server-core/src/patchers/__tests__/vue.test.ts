import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { writeFileSync, mkdtempSync, rmSync, readFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { patchVue } from "../vue";

let dir: string;
let file: string;

function write(content: string) {
	writeFileSync(file, content, "utf-8");
}

function read() {
	return readFileSync(file, "utf-8");
}

const TEMPLATE = (css: string) =>
	`<template><div class="btn">hello</div></template>\n<style scoped>\n${css}\n</style>`;

beforeEach(() => {
	dir = mkdtempSync(join(tmpdir(), "lss-vue-"));
	file = join(dir, "test.vue");
});

afterEach(() => {
	rmSync(dir, { recursive: true });
});

describe("patchVue — top-level rule", () => {
	it("updates existing property", () => {
		write(TEMPLATE(".btn { color: red; }"));
		patchVue(file, ".btn", "color", "blue");
		expect(read()).toContain("color: blue");
		expect(read()).not.toContain("color: red");
	});

	it("adds missing property", () => {
		write(TEMPLATE(".btn { font-size: 14px; }"));
		patchVue(file, ".btn", "color", "blue");
		expect(read()).toContain("color: blue");
	});

	it("does not touch template or script", () => {
		write(TEMPLATE(".btn { color: red; }"));
		patchVue(file, ".btn", "color", "blue");
		const result = read();
		expect(result).toContain('<div class="btn">hello</div>');
	});
});

describe("patchVue — @media support", () => {
	it("@media { selector } format", () => {
		write(TEMPLATE("@media (max-width: 768px) {\n  .btn { color: red; }\n}"));
		patchVue(file, ".btn", "color", "blue", "(max-width: 768px)");
		expect(read()).toContain("color: blue");
	});

	it("selector { @media { } } format", () => {
		write(TEMPLATE(".btn {\n  color: red;\n  @media (max-width: 768px) {\n    color: pink;\n  }\n}"));
		patchVue(file, ".btn", "color", "blue", "(max-width: 768px)");
		expect(read()).toContain("color: blue");
	});
});

describe("patchVue — no style scoped block", () => {
	it("does not throw when no <style scoped>", () => {
		write("<template><div>hello</div></template>");
		expect(() => patchVue(file, ".btn", "color", "blue")).not.toThrow();
	});
});

describe("patchVue — no match", () => {
	it("does not modify file when selector not found", () => {
		const original = TEMPLATE(".other { color: red; }");
		write(original);
		patchVue(file, ".btn", "color", "blue");
		expect(read()).toBe(original);
	});
});
