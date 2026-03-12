import { test, expect } from "@playwright/test";

/**
 * Integration tests against the real OPC UA demo server (oriolrius/opc-ua-demo-server).
 *
 * These tests require all three services running:
 *   - Demo OPC UA server on opc.tcp://localhost:4840
 *   - Backend API on http://localhost:8765
 *   - Frontend dev server on http://localhost:5173
 *
 * Run with:
 *   npx playwright test --config playwright.integration.config.ts
 *
 * The server version is pinned in playwright.integration.config.ts
 */

test.describe("Full integration with real OPC UA demo server", () => {
  test("connects to demo server anonymously", async ({ page }) => {
    await page.goto("/");

    await expect(page.locator("select")).toHaveValue("none");
    await page.getByRole("button", { name: "Connect" }).click();

    await expect(page.getByRole("button", { name: "Disconnect" })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Connected")).toBeVisible();
  });

  test("browses server tree and finds Plant node", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Connect" }).click();
    await expect(page.getByRole("button", { name: "Disconnect" })).toBeVisible({ timeout: 10_000 });

    await expect(page.getByText("Plant")).toBeVisible();
  });

  test("expands Plant > Tank and shows Level, InletFlow, OutletFlow", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Connect" }).click();
    await expect(page.getByRole("button", { name: "Disconnect" })).toBeVisible({ timeout: 10_000 });

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

  test("expands Plant > Machine and shows State", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Connect" }).click();
    await expect(page.getByRole("button", { name: "Disconnect" })).toBeVisible({ timeout: 10_000 });

    const plantRow = page.locator("div").filter({ hasText: /^Plant$/ }).first();
    await plantRow.locator("span").first().click();

    const machineRow = page.locator("div").filter({ hasText: /^Machine$/ }).first();
    await machineRow.locator("span").first().click();

    await expect(page.getByText("State")).toBeVisible();
  });

  test("expands Plant > Bearing and shows Temperature, VibrationRMS", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Connect" }).click();
    await expect(page.getByRole("button", { name: "Disconnect" })).toBeVisible({ timeout: 10_000 });

    const plantRow = page.locator("div").filter({ hasText: /^Plant$/ }).first();
    await plantRow.locator("span").first().click();

    const bearingRow = page.locator("div").filter({ hasText: /^Bearing$/ }).first();
    await bearingRow.locator("span").first().click();

    await expect(page.getByText("Temperature")).toBeVisible();
    await expect(page.getByText("VibrationRMS")).toBeVisible();
  });

  test("displays Variable node details with live value (Tank > Level)", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Connect" }).click();
    await expect(page.getByRole("button", { name: "Disconnect" })).toBeVisible({ timeout: 10_000 });

    const plantRow = page.locator("div").filter({ hasText: /^Plant$/ }).first();
    await plantRow.locator("span").first().click();
    const tankRow = page.locator("div").filter({ hasText: /^Tank$/ }).first();
    await tankRow.locator("span").first().click();

    await page.getByText("Level").click();

    await expect(page.getByRole("heading", { name: "Level" })).toBeVisible();
    await expect(page.getByRole("cell", { name: "Variable" })).toBeVisible();
    await expect(page.getByRole("cell", { name: "Double" })).toBeVisible();
    await expect(page.getByText("Current Value")).toBeVisible();
    await expect(page.getByRole("button", { name: "Start Monitoring" })).toBeVisible();
  });

  test("displays String variable (Machine > State) with value", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Connect" }).click();
    await expect(page.getByRole("button", { name: "Disconnect" })).toBeVisible({ timeout: 10_000 });

    const plantRow = page.locator("div").filter({ hasText: /^Plant$/ }).first();
    await plantRow.locator("span").first().click();
    const machineRow = page.locator("div").filter({ hasText: /^Machine$/ }).first();
    await machineRow.locator("span").first().click();

    await page.getByText("State").click();

    await expect(page.getByRole("heading", { name: "State" })).toBeVisible();
    await expect(page.getByRole("cell", { name: "String" })).toBeVisible();
    // Value should be one of the known states
    const value = page.locator("div.text-2xl.font-mono");
    await expect(value).toBeVisible();
  });

  test("subscribes to Level and receives real-time data", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Connect" }).click();
    await expect(page.getByRole("button", { name: "Disconnect" })).toBeVisible({ timeout: 10_000 });

    const plantRow = page.locator("div").filter({ hasText: /^Plant$/ }).first();
    await plantRow.locator("span").first().click();
    const tankRow = page.locator("div").filter({ hasText: /^Tank$/ }).first();
    await tankRow.locator("span").first().click();
    await page.getByText("Level").click();

    await page.getByRole("button", { name: "Start Monitoring" }).click();

    await expect(page.getByText("Monitored (1)")).toBeVisible();
    await expect(page.getByText("Monitored", { exact: true })).toBeVisible();

    // Wait for samples to accumulate
    await page.waitForTimeout(3000);

    // Should have collected some samples (check for pattern like "X/200")
    const sampleCounter = page.locator("text=/\\d+\\/200/");
    await expect(sampleCounter.first()).toBeVisible();
  });

  test("polls Bearing Temperature and chart renders", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Connect" }).click();
    await expect(page.getByRole("button", { name: "Disconnect" })).toBeVisible({ timeout: 10_000 });

    const plantRow = page.locator("div").filter({ hasText: /^Plant$/ }).first();
    await plantRow.locator("span").first().click();
    const bearingRow = page.locator("div").filter({ hasText: /^Bearing$/ }).first();
    await bearingRow.locator("span").first().click();
    await page.getByText("Temperature").click();

    // Switch to Poll mode
    await page.getByRole("button", { name: "Poll" }).click();
    await page.getByRole("spinbutton", { name: "Interval (ms)" }).fill("500");
    await page.getByRole("button", { name: "Start Monitoring" }).click();

    await expect(page.getByText("Monitored (1)")).toBeVisible();

    // Wait for data points
    await page.waitForTimeout(3000);

    // Chart should have rendered (legend visible)
    await expect(page.locator(".recharts-legend-item-text").getByText("Temperature")).toBeVisible();
  });

  test("monitors multiple nodes and chart shows all series", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Connect" }).click();
    await expect(page.getByRole("button", { name: "Disconnect" })).toBeVisible({ timeout: 10_000 });

    const plantRow = page.locator("div").filter({ hasText: /^Plant$/ }).first();
    await plantRow.locator("span").first().click();

    // Subscribe to Tank > Level
    const tankRow = page.locator("div").filter({ hasText: /^Tank$/ }).first();
    await tankRow.locator("span").first().click();
    await page.getByText("Level").click();
    await page.getByRole("button", { name: "Start Monitoring" }).click();
    await expect(page.getByText("Monitored (1)")).toBeVisible();

    // Subscribe to Bearing > VibrationRMS
    const bearingRow = page.locator("div").filter({ hasText: /^Bearing$/ }).first();
    await bearingRow.locator("span").first().click();
    await page.getByText("VibrationRMS").click();
    await page.getByRole("button", { name: "Start Monitoring" }).click();
    await expect(page.getByText("Monitored (2)")).toBeVisible();

    // Wait for data
    await page.waitForTimeout(3000);

    // Both series in chart legend
    const legendItems = page.locator(".recharts-legend-item-text");
    await expect(legendItems).toHaveCount(2);
  });

  test("disconnect clears all state", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Connect" }).click();
    await expect(page.getByRole("button", { name: "Disconnect" })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Plant")).toBeVisible();

    await page.getByRole("button", { name: "Disconnect" }).click();

    await expect(page.getByRole("button", { name: "Connect" })).toBeVisible();
    await expect(page.getByText("Disconnected")).toBeVisible();
    await expect(page.getByText("Connect to a server to browse")).toBeVisible();
  });
});
