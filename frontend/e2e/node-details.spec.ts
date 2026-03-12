import { test, expect } from "@playwright/test";
import { setupApiMocks, connectAndBrowse } from "./helpers";

test.describe("Node details panel", () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
    await connectAndBrowse(page);
  });

  test("shows placeholder when no node selected", async ({ page }) => {
    await expect(page.getByText("Select a node to view details")).toBeVisible();
  });

  test("displays Object node attributes", async ({ page }) => {
    await page.getByText("Plant").click();

    await expect(page.getByRole("heading", { name: "Plant" })).toBeVisible();
    await expect(page.getByText("ns=2;i=1")).toBeVisible();
    await expect(page.getByText("Object")).toBeVisible();
    await expect(page.getByText("2:Plant")).toBeVisible();
  });

  test("displays Variable node attributes with value", async ({ page }) => {
    // Navigate to Level
    const plantRow = page.locator("div").filter({ hasText: /^Plant$/ }).first();
    await plantRow.locator("span").first().click();
    const tankRow = page.locator("div").filter({ hasText: /^Tank$/ }).first();
    await tankRow.locator("span").first().click();

    await page.getByText("Level").click();

    await expect(page.getByRole("heading", { name: "Level" })).toBeVisible();
    await expect(page.getByText("ns=2;i=2006")).toBeVisible();
    await expect(page.getByRole("cell", { name: "Variable" })).toBeVisible();
    await expect(page.getByText("Double")).toBeVisible();
    await expect(page.getByText("50.5")).toBeVisible();
    await expect(page.getByText("Current Value")).toBeVisible();
  });

  test("displays String variable (Machine State)", async ({ page }) => {
    const plantRow = page.locator("div").filter({ hasText: /^Plant$/ }).first();
    await plantRow.locator("span").first().click();
    const machineRow = page.locator("div").filter({ hasText: /^Machine$/ }).first();
    await machineRow.locator("span").first().click();

    await page.getByText("State").click();

    await expect(page.getByRole("heading", { name: "State" })).toBeVisible();
    await expect(page.getByText("String")).toBeVisible();
    await expect(page.getByText("RUNNING")).toBeVisible();
  });

  test("shows data type and access level for Variable nodes", async ({ page }) => {
    const plantRow = page.locator("div").filter({ hasText: /^Plant$/ }).first();
    await plantRow.locator("span").first().click();
    const tankRow = page.locator("div").filter({ hasText: /^Tank$/ }).first();
    await tankRow.locator("span").first().click();

    await page.getByText("Level").click();

    await expect(page.getByText("Data Type")).toBeVisible();
    await expect(page.getByText("Access Level")).toBeVisible();
    await expect(page.getByText("Min Sampling Interval")).toBeVisible();
  });

  test("shows monitor controls for Variable nodes only", async ({ page }) => {
    // Object node should NOT show monitor controls
    await page.getByText("Plant").click();
    await expect(page.getByText("Monitor this value")).toHaveCount(0);

    // Variable node should show monitor controls
    const plantRow = page.locator("div").filter({ hasText: /^Plant$/ }).first();
    await plantRow.locator("span").first().click();
    const tankRow = page.locator("div").filter({ hasText: /^Tank$/ }).first();
    await tankRow.locator("span").first().click();
    await page.getByText("Level").click();

    await expect(page.getByText("Monitor this value")).toBeVisible();
    await expect(page.getByRole("button", { name: "Subscribe" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Poll" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Start Monitoring" })).toBeVisible();
  });

  test("refresh button reloads node attributes", async ({ page }) => {
    const plantRow = page.locator("div").filter({ hasText: /^Plant$/ }).first();
    await plantRow.locator("span").first().click();
    const tankRow = page.locator("div").filter({ hasText: /^Tank$/ }).first();
    await tankRow.locator("span").first().click();
    await page.getByText("Level").click();

    await expect(page.getByText("50.5")).toBeVisible();

    // Click refresh
    await page.getByRole("button", { name: "Refresh" }).click();

    // Should still show the node (api returns same mock data)
    await expect(page.getByRole("heading", { name: "Level" })).toBeVisible();
  });

  test("switching between nodes updates the panel", async ({ page }) => {
    const plantRow = page.locator("div").filter({ hasText: /^Plant$/ }).first();
    await plantRow.locator("span").first().click();

    // Click Plant (Object)
    await page.getByText("Plant").click();
    await expect(page.getByRole("heading", { name: "Plant" })).toBeVisible();

    // Navigate deeper and click a variable
    const bearingRow = page.locator("div").filter({ hasText: /^Bearing$/ }).first();
    await bearingRow.locator("span").first().click();
    await page.getByText("Temperature").click();

    await expect(page.getByRole("heading", { name: "Temperature" })).toBeVisible();
    await expect(page.getByText("54.3586")).toBeVisible();
  });
});
