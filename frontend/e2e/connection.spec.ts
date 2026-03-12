import { test, expect } from "@playwright/test";

test.describe("Connection bar - security mode", () => {
  test.beforeEach(async ({ page }) => {
    // Mock all backend API calls so tests don't depend on backend
    await page.route("**/api/connect", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ status: "connected", url: "opc.tcp://localhost:4840", security_mode: "none" }),
      }),
    );
    await page.route("**/api/disconnect", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ status: "disconnected" }),
      }),
    );
    await page.route("**/api/browse**", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      }),
    );
    await page.route("**/api/status", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ connected: false, url: null }),
      }),
    );

    await page.goto("/");
  });

  test("Anonymous mode selected by default, no credential fields visible", async ({ page }) => {
    const dropdown = page.locator("select");
    await expect(dropdown).toHaveValue("none");

    // Credential fields must NOT exist in the DOM at all
    await expect(page.getByPlaceholder("Username")).toHaveCount(0);
    await expect(page.getByPlaceholder("Password")).toHaveCount(0);
  });

  test("clicking Connect with Anonymous does not show credential fields", async ({ page }) => {
    // Verify Anonymous is selected
    await expect(page.locator("select")).toHaveValue("none");

    // Click Connect
    await page.getByRole("button", { name: "Connect" }).click();

    // Wait for connection to complete (button changes to Disconnect)
    await expect(page.getByRole("button", { name: "Disconnect" })).toBeVisible();

    // Credential fields must still NOT exist
    await expect(page.getByPlaceholder("Username")).toHaveCount(0);
    await expect(page.getByPlaceholder("Password")).toHaveCount(0);
  });

  test("no browser auth dialog triggered on Anonymous connect", async ({ page }) => {
    let authDialogTriggered = false;

    // Listen for any dialog (alert, confirm, prompt, beforeunload)
    page.on("dialog", () => {
      authDialogTriggered = true;
    });

    // Intercept connect and ensure response has no WWW-Authenticate header
    await page.route("**/api/connect", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ status: "connected", url: "opc.tcp://localhost:4840", security_mode: "none" }),
      }),
    );

    await page.getByRole("button", { name: "Connect" }).click();
    await expect(page.getByRole("button", { name: "Disconnect" })).toBeVisible();

    expect(authDialogTriggered).toBe(false);
  });

  test("switching to Username/Password shows credential fields", async ({ page }) => {
    await page.locator("select").selectOption("username");

    await expect(page.getByPlaceholder("Username")).toBeVisible();
    await expect(page.getByPlaceholder("Password")).toBeVisible();
  });

  test("no type=password inputs exist in the DOM (prevents browser credential popup)", async ({ page }) => {
    // Even in Username/Password mode, we use type=text with CSS masking
    // to prevent the browser's password manager from triggering a popup
    await page.locator("select").selectOption("username");
    await expect(page.getByPlaceholder("Password")).toBeVisible();

    const passwordInput = page.getByPlaceholder("Password");
    await expect(passwordInput).toHaveAttribute("type", "text");
  });

  test("switching back to Anonymous hides credential fields", async ({ page }) => {
    // Switch to Username/Password first
    await page.locator("select").selectOption("username");
    await expect(page.getByPlaceholder("Username")).toBeVisible();

    // Switch back to Anonymous
    await page.locator("select").selectOption("none");

    await expect(page.getByPlaceholder("Username")).toHaveCount(0);
    await expect(page.getByPlaceholder("Password")).toHaveCount(0);
  });

  test("credential fields not present after failed Anonymous connect", async ({ page }) => {
    // Override the connect mock to return an error
    await page.route("**/api/connect", (route) =>
      route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({ detail: "Connection refused" }),
      }),
    );

    await page.getByRole("button", { name: "Connect" }).click();

    // Wait for error to appear
    await expect(page.getByText("Connection refused")).toBeVisible();

    // Credential fields must NOT appear even after failure
    await expect(page.getByPlaceholder("Username")).toHaveCount(0);
    await expect(page.getByPlaceholder("Password")).toHaveCount(0);
  });

  test("credential fields not present after disconnect from Anonymous session", async ({ page }) => {
    // Connect anonymously
    await page.getByRole("button", { name: "Connect" }).click();
    await expect(page.getByRole("button", { name: "Disconnect" })).toBeVisible();

    // Disconnect
    await page.getByRole("button", { name: "Disconnect" }).click();
    await expect(page.getByRole("button", { name: "Connect" })).toBeVisible();

    // Dropdown should still be Anonymous, no credential fields
    await expect(page.locator("select")).toHaveValue("none");
    await expect(page.getByPlaceholder("Username")).toHaveCount(0);
    await expect(page.getByPlaceholder("Password")).toHaveCount(0);
  });
});
