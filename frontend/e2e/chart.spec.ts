import { test, expect } from "@playwright/test";
import { setupApiMocks, connectAndBrowse } from "./helpers";

test.describe("Live chart", () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);

    // Mock WebSocket with data
    await page.addInitScript(() => {
      class MockWebSocket extends EventTarget {
        static CONNECTING = 0;
        static OPEN = 1;
        static CLOSING = 2;
        static CLOSED = 3;
        CONNECTING = 0;
        OPEN = 1;
        CLOSING = 2;
        CLOSED = 3;
        readyState = 1;
        url: string;
        protocol = "";
        bufferedAmount = 0;
        extensions = "";
        binaryType: BinaryType = "blob";
        onopen: ((ev: Event) => void) | null = null;
        onclose: ((ev: CloseEvent) => void) | null = null;
        onmessage: ((ev: MessageEvent) => void) | null = null;
        onerror: ((ev: Event) => void) | null = null;
        private _intervals: number[] = [];

        constructor(url: string) {
          super();
          this.url = url;
          setTimeout(() => {
            const ev = new Event("open");
            this.onopen?.(ev);
            this.dispatchEvent(ev);
          }, 10);
        }

        send(data: string) {
          const msg = JSON.parse(data);
          if (msg.type === "subscribe" || msg.type === "poll") {
            this._respond({
              type: msg.type === "subscribe" ? "subscribed" : "polling",
              node_id: msg.node_id,
              ...(msg.type === "poll" ? { interval_ms: msg.interval_ms } : {}),
            });
            let count = 0;
            const interval = window.setInterval(() => {
              count++;
              this._respond({
                type: "data_change",
                node_id: msg.node_id,
                value: 50 + count,
                source_timestamp: new Date().toISOString(),
                server_timestamp: new Date().toISOString(),
              });
            }, 150);
            this._intervals.push(interval);
          } else if (msg.type === "unsubscribe" || msg.type === "stop_poll") {
            this._respond({
              type: msg.type === "unsubscribe" ? "unsubscribed" : "poll_stopped",
              node_id: msg.node_id,
            });
          }
        }

        close() {
          this.readyState = 3;
          this._intervals.forEach((i) => clearInterval(i));
        }

        _respond(data: object) {
          const ev = new MessageEvent("message", { data: JSON.stringify(data) });
          this.onmessage?.(ev);
          this.dispatchEvent(ev);
        }
      }
      // @ts-ignore
      window.WebSocket = MockWebSocket as any;
    });

    await connectAndBrowse(page);
  });

  test("chart area shows placeholder when no items charted", async ({ page }) => {
    await expect(page.getByText("Click the chart icon on a monitored item to display it here")).toBeVisible();
  });

  test("chart renders after subscribing to a value", async ({ page }) => {
    // Navigate to Level and subscribe
    const plantRow = page.locator("div").filter({ hasText: /^Plant$/ }).first();
    await plantRow.locator("span").first().click();
    const tankRow = page.locator("div").filter({ hasText: /^Tank$/ }).first();
    await tankRow.locator("span").first().click();
    await page.getByText("Level").click();
    await page.getByRole("button", { name: "Start Monitoring" }).click();

    // Wait for data points
    await page.waitForTimeout(500);

    // Chart placeholder should be gone
    await expect(page.getByText("Click the chart icon on a monitored item to display it here")).toHaveCount(0);

    // Recharts renders an SVG — check the legend shows the series name
    await expect(page.locator(".recharts-legend-item-text").getByText("Level")).toBeVisible();
  });

  test("chart shows multiple series with legend", async ({ page }) => {
    const plantRow = page.locator("div").filter({ hasText: /^Plant$/ }).first();
    await plantRow.locator("span").first().click();
    const tankRow = page.locator("div").filter({ hasText: /^Tank$/ }).first();
    await tankRow.locator("span").first().click();

    // Subscribe Level
    await page.getByText("Level").click();
    await page.getByRole("button", { name: "Start Monitoring" }).click();

    // Subscribe Temperature
    const bearingRow = page.locator("div").filter({ hasText: /^Bearing$/ }).first();
    await bearingRow.locator("span").first().click();
    await page.getByText("Temperature").click();
    await page.getByRole("button", { name: "Start Monitoring" }).click();

    await page.waitForTimeout(500);

    // Both series should appear in the legend
    const legendItems = page.locator(".recharts-legend-item-text");
    await expect(legendItems).toHaveCount(2);
  });

  test("hiding a series from chart removes it from legend", async ({ page }) => {
    const plantRow = page.locator("div").filter({ hasText: /^Plant$/ }).first();
    await plantRow.locator("span").first().click();
    const tankRow = page.locator("div").filter({ hasText: /^Tank$/ }).first();
    await tankRow.locator("span").first().click();
    await page.getByText("Level").click();
    await page.getByRole("button", { name: "Start Monitoring" }).click();
    await page.waitForTimeout(400);

    // Should have the chart line
    await expect(page.locator(".recharts-legend-item-text").getByText("Level")).toBeVisible();

    // Toggle chart off
    await page.getByRole("button", { name: "Hide from chart" }).click();

    // Chart should show placeholder again
    await expect(page.getByText("Click the chart icon on a monitored item to display it here")).toBeVisible();
  });

  test("removing monitored item removes it from chart", async ({ page }) => {
    const plantRow = page.locator("div").filter({ hasText: /^Plant$/ }).first();
    await plantRow.locator("span").first().click();
    const tankRow = page.locator("div").filter({ hasText: /^Tank$/ }).first();
    await tankRow.locator("span").first().click();
    await page.getByText("Level").click();
    await page.getByRole("button", { name: "Start Monitoring" }).click();
    await page.waitForTimeout(400);

    await expect(page.locator(".recharts-legend-item-text").getByText("Level")).toBeVisible();

    // Remove the item
    await page.getByRole("button", { name: "Remove" }).click();

    // Chart should be empty
    await expect(page.getByText("Click the chart icon on a monitored item to display it here")).toBeVisible();
  });
});
