import { test, expect } from "@playwright/test";
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { openOverlay, waitForConnected } from "./helpers";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEST_SCSS = join(__dirname, "../src/test.scss");

test.describe("SCSS variable patch", () => {
	let originalScss: string;

	test.beforeEach(() => {
		originalScss = readFileSync(TEST_SCSS, "utf-8");
	});

	test.afterEach(() => {
		writeFileSync(TEST_SCSS, originalScss, "utf-8");
	});

	test("patches SCSS variable and shows toast", async ({ page }) => {
		await page.goto("/");
		const overlay = await openOverlay(page);
		await waitForConnected(page, overlay);

		await overlay.getByRole("button", { name: /SCSS \$variables/ }).click();

		// wait for vars to load
		await expect(overlay.locator('[title="$card-accent"]')).toBeVisible({ timeout: 8_000 });

		// find the input sibling of the $card-accent span
		const input = overlay.locator('xpath=//span[@title="$card-accent"]/following-sibling::input');
		await input.fill("#ff0000");
		await input.press("Tab");

		// Apply button appears when there's a pending change
		await overlay.getByRole("button", { name: "Apply" }).click();

		await expect(page.getByText("✓ Saved")).toBeVisible();

		const scss = readFileSync(TEST_SCSS, "utf-8");
		expect(scss).toContain("$card-accent: #ff0000");
	});

	test("preserves other SCSS variables after patch", async ({ page }) => {
		await page.goto("/");
		const overlay = await openOverlay(page);
		await waitForConnected(page, overlay);

		await overlay.getByRole("button", { name: /SCSS \$variables/ }).click();
		await expect(overlay.locator('[title="$card-bg"]')).toBeVisible({ timeout: 8_000 });

		const bgInput = overlay.locator('xpath=//span[@title="$card-bg"]/following-sibling::input');
		await bgInput.fill("#000000");
		await bgInput.press("Tab");
		await overlay.getByRole("button", { name: "Apply" }).click();
		await expect(page.getByText("✓ Saved")).toBeVisible();

		const scss = readFileSync(TEST_SCSS, "utf-8");
		expect(scss).toContain("$card-bg: #000000");
		// other variables untouched
		expect(scss).toContain("$card-radius: 15px");
		expect(scss).toContain("$card-accent:");
	});

	test("reset button clears pending without patching", async ({ page }) => {
		await page.goto("/");
		const overlay = await openOverlay(page);
		await waitForConnected(page, overlay);

		await overlay.getByRole("button", { name: /SCSS \$variables/ }).click();
		await expect(overlay.locator('[title="$card-accent"]')).toBeVisible({ timeout: 8_000 });

		const input = overlay.locator('xpath=//span[@title="$card-accent"]/following-sibling::input');
		await input.fill("#123456");
		await input.press("Tab");

		// Apply button should appear
		await expect(overlay.getByRole("button", { name: "Apply" })).toBeVisible();

		// Click reset (✕)
		await overlay.getByRole("button", { name: "✕" }).click();

		// Apply button should disappear
		await expect(overlay.getByRole("button", { name: "Apply" })).not.toBeVisible();

		// File should be unchanged
		expect(readFileSync(TEST_SCSS, "utf-8")).toBe(originalScss);
	});
});
