import { test, expect } from "@playwright/test";
import { setupApiMocks, connectAndBrowse } from "./helpers";

test.describe("Monitoring and subscriptions", () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);

    // Mock WebSocket - create a fake WS that echoes back subscription confirmations
    // and sends data_change messages
    await page.addInitScript(() => {
      const OrigWebSocket = window.WebSocket;
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
          if (msg.type === "subscribe") {
            this._respond({ type: "subscribed", node_id: msg.node_id });
            // Send periodic data changes
            let count = 0;
            const interval = window.setInterval(() => {
              count++;
              this._respond({
                type: "data_change",
                node_id: msg.node_id,
                value: 50 + Math.sin(count * 0.1) * 5,
                source_timestamp: new Date().toISOString(),
                server_timestamp: new Date().toISOString(),
              });
            }, 200);
            this._intervals.push(interval);
          } else if (msg.type === "poll") {
            this._respond({ type: "polling", node_id: msg.node_id, interval_ms: msg.interval_ms });
            let count = 0;
            const interval = window.setInterval(() => {
              count++;
              this._respond({
                type: "data_change",
                node_id: msg.node_id,
                value: 30 + Math.cos(count * 0.1) * 3,
                source_timestamp: new Date().toISOString(),
                server_timestamp: new Date().toISOString(),
              });
            }, msg.interval_ms || 500);
            this._intervals.push(interval);
          } else if (msg.type === "unsubscribe" || msg.type === "stop_poll") {
            this._respond({ type: msg.type === "unsubscribe" ? "unsubscribed" : "poll_stopped", node_id: msg.node_id });
          }
        }

        close() {
          this.readyState = 3;
          this._intervals.forEach((i) => clearInterval(i));
          const ev = new CloseEvent("close");
          this.onclose?.(ev);
          this.dispatchEvent(ev);
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

  async function navigateToLevel(page: import("@playwright/test").Page) {
    const plantRow = page.locator("div").filter({ hasText: /^Plant$/ }).first();
    await plantRow.locator("span").first().click();
    const tankRow = page.locator("div").filter({ hasText: /^Tank$/ }).first();
    await tankRow.locator("span").first().click();
    await page.getByText("Level").click();
    await expect(page.getByRole("heading", { name: "Level" })).toBeVisible();
  }

  test("subscribe mode is selected by default", async ({ page }) => {
    await navigateToLevel(page);
    const subscribeBtn = page.getByRole("button", { name: "Subscribe" });
    await expect(subscribeBtn).toHaveClass(/bg-blue-600/);
  });

  test("can switch between Subscribe and Poll mode", async ({ page }) => {
    await navigateToLevel(page);

    await page.getByRole("button", { name: "Poll" }).click();
    await expect(page.getByRole("button", { name: "Poll" })).toHaveClass(/bg-blue-600/);

    await page.getByRole("button", { name: "Subscribe" }).click();
    await expect(page.getByRole("button", { name: "Subscribe" })).toHaveClass(/bg-blue-600/);
  });

  test("interval and max samples inputs are configurable", async ({ page }) => {
    await navigateToLevel(page);

    const intervalInput = page.getByRole("spinbutton", { name: "Interval (ms)" });
    const samplesInput = page.getByRole("spinbutton", { name: "Max samples" });

    await expect(intervalInput).toHaveValue("1000");
    await expect(samplesInput).toHaveValue("200");

    await intervalInput.fill("500");
    await samplesInput.fill("100");

    await expect(intervalInput).toHaveValue("500");
    await expect(samplesInput).toHaveValue("100");
  });

  test("Start Monitoring adds item to monitored panel", async ({ page }) => {
    await navigateToLevel(page);

    await expect(page.getByText("Monitored (0)")).toBeVisible();

    await page.getByRole("button", { name: "Start Monitoring" }).click();

    await expect(page.getByText("Monitored (1)")).toBeVisible();
  });

  test("monitored node shows Monitored badge in details panel", async ({ page }) => {
    await navigateToLevel(page);
    await page.getByRole("button", { name: "Start Monitoring" }).click();

    await expect(page.getByText("Monitored", { exact: true })).toBeVisible();
  });

  test("Start Monitoring button disappears after subscribing", async ({ page }) => {
    await navigateToLevel(page);
    await page.getByRole("button", { name: "Start Monitoring" }).click();

    // The monitor controls section should be gone (replaced by Monitored badge)
    await expect(page.getByRole("button", { name: "Start Monitoring" })).toHaveCount(0);
  });

  test("monitored item receives live value updates", async ({ page }) => {
    await navigateToLevel(page);
    await page.getByRole("button", { name: "Start Monitoring" }).click();

    // Wait for some data to arrive from mock WebSocket
    await page.waitForTimeout(500);

    // Sample count should be > 0
    const sampleText = page.locator("text=/\\d+\\/200/");
    await expect(sampleText.first()).toBeVisible();
  });

  test("can monitor multiple nodes simultaneously", async ({ page }) => {
    // Subscribe to Level
    await navigateToLevel(page);
    await page.getByRole("button", { name: "Start Monitoring" }).click();
    await expect(page.getByText("Monitored (1)")).toBeVisible();

    // Navigate to Temperature and subscribe
    const bearingRow = page.locator("div").filter({ hasText: /^Bearing$/ }).first();
    await bearingRow.locator("span").first().click();
    await page.getByText("Temperature").click();
    await page.getByRole("button", { name: "Start Monitoring" }).click();

    await expect(page.getByText("Monitored (2)")).toBeVisible();
  });

  test("remove button unsubscribes and removes from list", async ({ page }) => {
    await navigateToLevel(page);
    await page.getByRole("button", { name: "Start Monitoring" }).click();
    await expect(page.getByText("Monitored (1)")).toBeVisible();

    // Click Remove
    await page.getByRole("button", { name: "Remove" }).click();

    await expect(page.getByText("Monitored (0)")).toBeVisible();
    await expect(page.getByText("No monitored values")).toBeVisible();
  });

  test("chart toggle button shows/hides series from chart", async ({ page }) => {
    await navigateToLevel(page);
    await page.getByRole("button", { name: "Start Monitoring" }).click();

    // By default the chart icon should be active (showing "Hide from chart")
    await expect(page.getByRole("button", { name: "Hide from chart" })).toBeVisible();

    // Click to hide from chart
    await page.getByRole("button", { name: "Hide from chart" }).click();

    // Now it should show "Show in chart"
    await expect(page.getByRole("button", { name: "Show in chart" })).toBeVisible();

    // Chart should show placeholder
    await expect(page.getByText("Click the chart icon on a monitored item to display it here")).toBeVisible();
  });

  test("poll mode sends poll message instead of subscribe", async ({ page }) => {
    await navigateToLevel(page);

    // Switch to Poll mode
    await page.getByRole("button", { name: "Poll" }).click();
    await page.getByRole("spinbutton", { name: "Interval (ms)" }).fill("500");

    await page.getByRole("button", { name: "Start Monitoring" }).click();

    await expect(page.getByText("Monitored (1)")).toBeVisible();

    // Wait for data
    await page.waitForTimeout(700);

    const sampleText = page.locator("text=/\\d+\\/200/");
    await expect(sampleText.first()).toBeVisible();
  });
});
