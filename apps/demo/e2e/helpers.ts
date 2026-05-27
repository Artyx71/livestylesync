import type { Page, Locator } from "@playwright/test";

export async function openOverlay(page: Page): Promise<Locator> {
	await page.locator('button[title="Toggle LiveStyleSync (Alt+S)"]').click();
	const overlay = page.locator('[data-testid="lss-overlay"]');
	await overlay.waitFor({ state: "visible" });
	return overlay;
}

export async function waitForConnected(page: Page, overlay: Locator): Promise<void> {
	await overlay.locator('[title="connected"]').waitFor({ state: "visible", timeout: 10_000 });
}

export async function selectElement(page: Page, overlay: Locator, selector: string): Promise<void> {
	await overlay.getByRole("button", { name: /Select Element/ }).click();
	await page.waitForFunction(() => document.body.style.cursor === "crosshair");
	await page.locator(selector).click({ force: true });
}
