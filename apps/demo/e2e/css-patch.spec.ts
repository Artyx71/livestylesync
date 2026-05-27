import { test, expect } from "@playwright/test";
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { openOverlay, waitForConnected, selectElement } from "./helpers";

const __dirname = dirname(fileURLToPath(import.meta.url));
const APP_CSS = join(__dirname, "../src/App.css");

async function openAndSelectCounter(page: import("@playwright/test").Page) {
	await page.goto("/");
	const overlay = await openOverlay(page);
	await waitForConnected(page, overlay);
	await selectElement(page, overlay, "button.counter");
	await expect(overlay.locator("text=font-size")).toBeVisible();
	return overlay;
}

test.describe("CSS patch flow", () => {
	let originalCss: string;

	test.beforeEach(() => {
		originalCss = readFileSync(APP_CSS, "utf-8");
	});

	test.afterEach(() => {
		writeFileSync(APP_CSS, originalCss, "utf-8");
	});

	test("patches CSS property and shows toast", async ({ page }) => {
		const overlay = await openAndSelectCounter(page);

		const fontSizeInput = overlay.locator("[data-prop='font-size']");
		await fontSizeInput.fill("20px");
		await fontSizeInput.press("Enter");

		await overlay.getByRole("button", { name: /Apply.*change/ }).click();

		await expect(page.getByText("✓ Saved")).toBeVisible();

		const css = readFileSync(APP_CSS, "utf-8");
		expect(css).toContain("font-size: 20px");
	});

	test("undo reverts file to original", async ({ page }) => {
		const overlay = await openAndSelectCounter(page);

		const fontSizeInput = overlay.locator("[data-prop='font-size']");
		await fontSizeInput.fill("20px");
		await fontSizeInput.press("Enter");
		await overlay.getByRole("button", { name: /Apply.*change/ }).click();
		await expect(page.getByText("✓ Saved")).toBeVisible();

		expect(readFileSync(APP_CSS, "utf-8")).toContain("font-size: 20px");

		// Wait for Apply toast to disappear before undoing (avoids false positive on stale toast)
		await expect(page.getByText("✓ Saved")).not.toBeVisible({ timeout: 5_000 });
		await overlay.getByRole("button", { name: /Undo last apply/ }).click();
		await expect(page.getByText("✓ Saved")).toBeVisible({ timeout: 8_000 });
		await page.waitForTimeout(300); // ensure writeFileSync has flushed

		const css = readFileSync(APP_CSS, "utf-8");
		expect(css).toContain("font-size: 16px");
		expect(css).not.toContain("font-size: 20px");
	});

	test("patches to different value", async ({ page }) => {
		const overlay = await openAndSelectCounter(page);

		const fontSizeInput = overlay.locator("[data-prop='font-size']");
		await fontSizeInput.fill("18px");
		await fontSizeInput.press("Tab");

		await overlay.getByRole("button", { name: /Apply.*change/ }).click();
		await expect(page.getByText("✓ Saved")).toBeVisible();

		expect(readFileSync(APP_CSS, "utf-8")).toContain("font-size: 18px");
	});
});
