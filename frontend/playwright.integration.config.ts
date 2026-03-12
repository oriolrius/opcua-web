import { defineConfig } from "@playwright/test";

// Pin the demo OPC UA server version for reproducible tests
const OPCUA_DEMO_SERVER_VERSION = "v1.2.1";
const OPCUA_DEMO_SERVER_PKG = `git+https://github.com/oriolrius/opc-ua-demo-server@${OPCUA_DEMO_SERVER_VERSION}`;

export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.integration.spec.ts",
  timeout: 60_000,
  use: {
    baseURL: "http://localhost:5173",
    headless: true,
  },
  webServer: [
    {
      command: `uvx --from '${OPCUA_DEMO_SERVER_PKG}' opcua-server`,
      port: 4840,
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
    {
      command: "cd ../backend && uv run uvicorn opcua_web.main:app --host 0.0.0.0 --port 8765",
      port: 8765,
      reuseExistingServer: !process.env.CI,
      timeout: 15_000,
    },
    {
      command: "npm run dev -- --port 5173 --strictPort",
      port: 5173,
      reuseExistingServer: !process.env.CI,
      timeout: 15_000,
    },
  ],
  projects: [
    { name: "chromium", use: { browserName: "chromium" } },
  ],
});
