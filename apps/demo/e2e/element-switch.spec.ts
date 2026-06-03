import { test, expect } from "@playwright/test";
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { openOverlay, waitForConnected, selectElement } from "./helpers";

const __dirname = dirname(fileURLToPath(import.meta.url));
const APP_CSS = join(__dirname, "../src/App.css");

test.describe("element switch resets pending edits", () => {
	let originalCss: string;

	test.beforeEach(() => {
		originalCss = readFileSync(APP_CSS, "utf-8");
	});

	test.afterEach(() => {
		writeFileSync(APP_CSS, originalCss, "utf-8");
	});

	test("pending changes cleared when switching to another element", async ({ page }) => {
		await page.goto("/");
		const overlay = await openOverlay(page);
		await waitForConnected(page, overlay);

		// Select first element and make a pending change
		await selectElement(page, overlay, "button.counter");
		await expect(overlay.locator("[data-prop='font-size']")).toBeVisible();

		const fontSizeInput = overlay.locator("[data-prop='font-size']");
		await fontSizeInput.fill("99px");
		await fontSizeInput.press("Tab");

		// Apply button should appear
		await expect(overlay.getByRole("button", { name: /Apply.*change/ })).toBeVisible();

		// Switch to a different element
		await selectElement(page, overlay, ".hero-heading");

		// Apply button for old element's pending should be gone
		await expect(overlay.getByRole("button", { name: /Apply.*change/ })).not.toBeVisible({ timeout: 3_000 });

		// File must NOT have been modified
		expect(readFileSync(APP_CSS, "utf-8")).toBe(originalCss);
	});

	test("undo after element switch does not affect new element's file", async ({ page }) => {
		await page.goto("/");
		const overlay = await openOverlay(page);
		await waitForConnected(page, overlay);

		// Select element A, apply a change
		await selectElement(page, overlay, "button.counter");
		await expect(overlay.locator("[data-prop='font-size']")).toBeVisible();
		await overlay.locator("[data-prop='font-size']").fill("20px");
		await overlay.locator("[data-prop='font-size']").press("Enter");
		await overlay.getByRole("button", { name: /Apply.*change/ }).click();
		await expect(page.getByText("✓ Saved")).toBeVisible();

		// Switch to element B
		await selectElement(page, overlay, ".hero-heading");
		await expect(overlay.locator("text=.hero-heading")).toBeVisible();

		// Undo should target element A's change, not B
		await expect(page.getByText("✓ Saved")).not.toBeVisible({ timeout: 5_000 });
		await overlay.getByRole("button", { name: /Undo last apply/ }).click();
		await expect(page.getByText("✓ Saved")).toBeVisible({ timeout: 8_000 });

		await page.waitForTimeout(300);
		const css = readFileSync(APP_CSS, "utf-8");
		// Undo reverted element A's change
		expect(css).toContain("font-size: 16px");
		expect(css).not.toContain("font-size: 20px");
	});
});
