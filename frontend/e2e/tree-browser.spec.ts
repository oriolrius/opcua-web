import { test, expect } from "@playwright/test";
import { setupApiMocks, connectAndBrowse } from "./helpers";

test.describe("Tree browser", () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
    await connectAndBrowse(page);
  });

  test("shows root nodes after connecting", async ({ page }) => {
    await expect(page.getByText("Plant")).toBeVisible();
  });

  test("empty tree shows placeholder before connecting", async ({ page }) => {
    // Disconnect to see placeholder
    await page.getByRole("button", { name: "Disconnect" }).click();
    await expect(page.getByText("Connect to a server to browse")).toBeVisible();
  });

  test("expands Plant to show children", async ({ page }) => {
    // Click the expand chevron on Plant
    const plantRow = page.locator("div").filter({ hasText: /^Plant$/ }).first();
    await plantRow.locator("span").first().click();

    await expect(page.getByText("Machine")).toBeVisible();
    await expect(page.getByText("Tank")).toBeVisible();
    await expect(page.getByText("Bearing")).toBeVisible();
  });

  test("expands nested nodes (Plant > Tank)", async ({ page }) => {
    // Expand Plant
    const plantRow = page.locator("div").filter({ hasText: /^Plant$/ }).first();
    await plantRow.locator("span").first().click();
    await expect(page.getByText("Tank")).toBeVisible();

    // Expand Tank
    const tankRow = page.locator("div").filter({ hasText: /^Tank$/ }).first();
    await tankRow.locator("span").first().click();

    await expect(page.getByText("Level")).toBeVisible();
    await expect(page.getByText("InletFlow")).toBeVisible();
    await expect(page.getByText("OutletFlow")).toBeVisible();
  });

  test("expands Machine to show State", async ({ page }) => {
    const plantRow = page.locator("div").filter({ hasText: /^Plant$/ }).first();
    await plantRow.locator("span").first().click();

    const machineRow = page.locator("div").filter({ hasText: /^Machine$/ }).first();
    await machineRow.locator("span").first().click();

    await expect(page.getByText("State")).toBeVisible();
  });

  test("expands Bearing to show Temperature and VibrationRMS", async ({ page }) => {
    const plantRow = page.locator("div").filter({ hasText: /^Plant$/ }).first();
    await plantRow.locator("span").first().click();

    const bearingRow = page.locator("div").filter({ hasText: /^Bearing$/ }).first();
    await bearingRow.locator("span").first().click();

    await expect(page.getByText("Temperature")).toBeVisible();
    await expect(page.getByText("VibrationRMS")).toBeVisible();
  });

  test("collapses expanded node on second click", async ({ page }) => {
    const plantRow = page.locator("div").filter({ hasText: /^Plant$/ }).first();
    await plantRow.locator("span").first().click();
    await expect(page.getByText("Machine")).toBeVisible();

    // Collapse
    await plantRow.locator("span").first().click();
    await expect(page.getByText("Machine")).toHaveCount(0);
  });

  test("highlights selected node", async ({ page }) => {
    await page.getByText("Plant").click();
    // The clickable row element has the highlight class
    const plantRow = page.locator(".bg-blue-900\\/40");
    await expect(plantRow).toBeVisible();
    await expect(plantRow).toContainText("Plant");
  });
});
