import { Page } from "@playwright/test";
import {
  MOCK_PLANT_CHILDREN,
  MOCK_PLANT_SUBTREE,
  MOCK_MACHINE_CHILDREN,
  MOCK_TANK_CHILDREN,
  MOCK_BEARING_CHILDREN,
  MOCK_LEVEL_ATTRS,
  MOCK_STATE_ATTRS,
  MOCK_TEMPERATURE_ATTRS,
  MOCK_PLANT_ATTRS,
} from "./fixtures";

const NODE_ATTRS: Record<string, object> = {
  "ns=2;i=1": MOCK_PLANT_ATTRS,
  "ns=2;i=2006": MOCK_LEVEL_ATTRS,
  "ns=2;i=2001": MOCK_STATE_ATTRS,
  "ns=2;i=2008": MOCK_TEMPERATURE_ATTRS,
};

const BROWSE_CHILDREN: Record<string, object[]> = {
  "": MOCK_PLANT_CHILDREN,
  "ns=2;i=1": MOCK_PLANT_SUBTREE,
  "ns=2;i=10": MOCK_MACHINE_CHILDREN,
  "ns=2;i=20": MOCK_TANK_CHILDREN,
  "ns=2;i=30": MOCK_BEARING_CHILDREN,
};

export async function setupApiMocks(page: Page) {
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

  await page.route("**/api/status", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ connected: false, url: null }),
    }),
  );

  await page.route("**/api/browse**", (route) => {
    const url = new URL(route.request().url());
    const nodeId = url.searchParams.get("node_id") || "";
    const children = BROWSE_CHILDREN[nodeId] || [];
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(children),
    });
  });

  await page.route("**/api/node**", (route) => {
    const url = new URL(route.request().url());
    const nodeId = url.searchParams.get("node_id") || "";
    const attrs = NODE_ATTRS[nodeId];
    if (attrs) {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(attrs),
      });
    } else {
      route.fulfill({
        status: 404,
        contentType: "application/json",
        body: JSON.stringify({ detail: "Node not found" }),
      });
    }
  });
}

export async function connectAndBrowse(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Connect" }).click();
  await page.getByRole("button", { name: "Disconnect" }).waitFor();
}
