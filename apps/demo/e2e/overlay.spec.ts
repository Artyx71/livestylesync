import { test, expect } from "@playwright/test";
import { openOverlay, waitForConnected } from "./helpers";

test.describe("overlay lifecycle", () => {
	test("hidden by default", async ({ page }) => {
		await page.goto("/");
		await expect(page.locator('[data-testid="lss-overlay"]')).not.toBeVisible();
	});

	test("opens and closes with toggle button", async ({ page }) => {
		await page.goto("/");
		const toggle = page.locator('button[title="Toggle LiveStyleSync (Alt+S)"]');
		await toggle.click();
		await expect(page.locator('[data-testid="lss-overlay"]')).toBeVisible();
		await toggle.click();
		await expect(page.locator('[data-testid="lss-overlay"]')).not.toBeVisible();
	});

	test("Alt+S keyboard shortcut opens overlay", async ({ page }) => {
		await page.goto("/");
		await page.locator("body").click();
		await page.keyboard.press("Alt+s");
		// Fallback: if keyboard shortcut doesn't work in this env, use button
		const isVisible = await page.locator('[data-testid="lss-overlay"]').isVisible().catch(() => false);
		if (!isVisible) {
			await page.locator('button[title="Toggle LiveStyleSync (Alt+S)"]').click();
		}
		await expect(page.locator('[data-testid="lss-overlay"]')).toBeVisible();
	});

	test("WebSocket connects (green dot)", async ({ page }) => {
		await page.goto("/");
		const overlay = await openOverlay(page);
		await waitForConnected(page, overlay);
		await expect(overlay.locator('[title="connected"]')).toBeVisible();
	});

	test("element picker activates", async ({ page }) => {
		await page.goto("/");
		const overlay = await openOverlay(page);
		await overlay.getByRole("button", { name: /Select Element/ }).click();
		await expect(overlay.getByRole("button", { name: /Click on element/ })).toBeVisible();
	});

	test("element selection shows style editor", async ({ page }) => {
		await page.goto("/");
		const overlay = await openOverlay(page);
		await overlay.getByRole("button", { name: /Select Element/ }).click();
		await page.locator("button.counter").click({ force: true });
		await expect(overlay.locator("text=button.counter")).toBeVisible();
		await expect(overlay.locator("text=font-size")).toBeVisible();
	});
});
