export interface TreeNode {
  node_id: string;
  browse_name: string;
  display_name: string;
  node_class: number;
  has_children: boolean;
  children?: TreeNode[];
  loaded?: boolean;
}

export interface NodeAttributes {
  node_id: string;
  browse_name: string;
  display_name: string;
  node_class: string;
  value: unknown;
  data_type: string | null;
  description: string | null;
  writable: boolean;
  historizing: boolean;
  access_level: number | null;
  minimum_sampling_interval: number | null;
}

export interface Sample {
  timestamp: number;
  value: number;
}

export interface MonitoredItem {
  nodeId: string;
  displayName: string;
  mode: "subscribe" | "poll";
  intervalMs: number;
  maxSamples: number;
  samples: Sample[];
  currentValue: unknown;
  color: string;
  active: boolean;
}

export type WsMessage =
  | { type: "subscribe"; node_id: string; interval_ms?: number }
  | { type: "unsubscribe"; node_id: string }
  | { type: "poll"; node_id: string; interval_ms: number }
  | { type: "stop_poll"; node_id: string };

export type WsResponse =
  | { type: "data_change"; node_id: string; value: unknown; source_timestamp: string | null; server_timestamp: string | null }
  | { type: "subscribed"; node_id: string }
  | { type: "unsubscribed"; node_id: string }
  | { type: "polling"; node_id: string; interval_ms: number }
  | { type: "poll_stopped"; node_id: string }
  | { type: "error"; message: string; node_id?: string };

// OPC UA node classes
export const NODE_CLASS = {
  Object: 1,
  Variable: 2,
  Method: 4,
  ObjectType: 8,
  VariableType: 16,
  ReferenceType: 32,
  DataType: 64,
  View: 128,
} as const;
