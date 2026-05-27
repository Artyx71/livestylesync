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
	await overlay.getByRole("button", { name: /Click on element/ }).waitFor({ state: "visible" });
	await page.locator(selector).click({ force: true });
}
