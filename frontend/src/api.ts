import type { NodeAttributes, TreeNode } from "./types";

const BASE = "";

export interface ConnectOptions {
  url: string;
  security_mode: "none" | "username";
  username?: string;
  password?: string;
}

export async function connectToServer(opts: ConnectOptions): Promise<{ status: string; url: string }> {
  const res = await fetch(`${BASE}/api/connect`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(opts),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Connection failed");
  }
  return res.json();
}

export async function disconnectFromServer(): Promise<void> {
  await fetch(`${BASE}/api/disconnect`, { method: "POST" });
}

export async function getStatus(): Promise<{ connected: boolean; url: string | null }> {
  const res = await fetch(`${BASE}/api/status`);
  return res.json();
}

export async function browse(nodeId?: string): Promise<TreeNode[]> {
  const params = nodeId ? `?node_id=${encodeURIComponent(nodeId)}` : "";
  const res = await fetch(`${BASE}/api/browse${params}`);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Browse failed");
  }
  return res.json();
}

export async function getNodeAttributes(nodeId: string): Promise<NodeAttributes> {
  const res = await fetch(`${BASE}/api/node?node_id=${encodeURIComponent(nodeId)}`);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Failed to get node attributes");
  }
  return res.json();
}

export async function readValue(nodeId: string): Promise<{
  node_id: string;
  value: unknown;
  status: string | null;
  source_timestamp: string | null;
  server_timestamp: string | null;
}> {
  const res = await fetch(`${BASE}/api/read?node_id=${encodeURIComponent(nodeId)}`);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Failed to read value");
  }
  return res.json();
}

export function createWebSocket(): WebSocket {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return new WebSocket(`${protocol}//${window.location.host}/ws`);
}
