import { useState, useCallback, useRef, useEffect } from "react";
import { Network, BarChart3, List } from "lucide-react";
import ConnectionBar from "./components/ConnectionBar";
import TreeView from "./components/TreeView";
import NodePanel from "./components/NodePanel";
import SubscriptionPanel from "./components/SubscriptionPanel";
import ValueChart from "./components/ValueChart";
import { connectToServer, disconnectFromServer, browse, getNodeAttributes, createWebSocket } from "./api";
import type { ConnectOptions } from "./api";
import type { TreeNode, NodeAttributes, MonitoredItem, WsResponse } from "./types";

const CHART_COLORS = [
  "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
  "#ec4899", "#06b6d4", "#f97316", "#84cc16", "#6366f1",
];

export default function App() {
  const [connected, setConnected] = useState(false);
  const [serverUrl, setServerUrl] = useState("opc.tcp://localhost:4840");
  const [treeRoots, setTreeRoots] = useState<TreeNode[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [nodeAttrs, setNodeAttrs] = useState<NodeAttributes | null>(null);
  const [nodeLoading, setNodeLoading] = useState(false);
  const [monitoredItems, setMonitoredItems] = useState<Map<string, MonitoredItem>>(new Map());
  const [chartNodeIds, setChartNodeIds] = useState<Set<string>>(new Set());
  const wsRef = useRef<WebSocket | null>(null);
  const colorIndexRef = useRef(0);

  const cleanupWs = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  const setupWs = useCallback(() => {
    cleanupWs();
    const ws = createWebSocket();

    ws.onmessage = (event) => {
      const msg: WsResponse = JSON.parse(event.data);

      if (msg.type === "data_change") {
        const numValue = typeof msg.value === "number" ? msg.value : parseFloat(String(msg.value));
        const timestamp = msg.source_timestamp ? new Date(msg.source_timestamp).getTime() : Date.now();

        setMonitoredItems((prev) => {
          const next = new Map(prev);
          const item = next.get(msg.node_id);
          if (item) {
            const samples = [...item.samples, { timestamp, value: numValue }];
            if (samples.length > item.maxSamples) {
              samples.splice(0, samples.length - item.maxSamples);
            }
            next.set(msg.node_id, { ...item, currentValue: msg.value, samples });
          }
          return next;
        });
      }
    };

    ws.onerror = () => {
      console.error("WebSocket error");
    };

    wsRef.current = ws;
  }, [cleanupWs]);

  useEffect(() => {
    return () => cleanupWs();
  }, [cleanupWs]);

  const handleConnect = async (opts: ConnectOptions) => {
    await connectToServer(opts);
    setServerUrl(opts.url);
    setConnected(true);
    const roots = await browse();
    setTreeRoots(roots);
    setupWs();
  };

  const handleDisconnect = async () => {
    cleanupWs();
    setMonitoredItems(new Map());
    setChartNodeIds(new Set());
    await disconnectFromServer();
    setConnected(false);
    setTreeRoots([]);
    setSelectedNodeId(null);
    setNodeAttrs(null);
  };

  const handleSelectNode = useCallback(async (nodeId: string) => {
    setSelectedNodeId(nodeId);
    setNodeLoading(true);
    try {
      const attrs = await getNodeAttributes(nodeId);
      setNodeAttrs(attrs);
    } catch (e) {
      console.error("Failed to load node attributes:", e);
    } finally {
      setNodeLoading(false);
    }
  }, []);

  const handleRefreshNode = useCallback(async () => {
    if (!selectedNodeId) return;
    setNodeLoading(true);
    try {
      const attrs = await getNodeAttributes(selectedNodeId);
      setNodeAttrs(attrs);
    } catch (e) {
      console.error("Failed to refresh:", e);
    } finally {
      setNodeLoading(false);
    }
  }, [selectedNodeId]);

  const handleSubscribe = useCallback(
    (nodeId: string, displayName: string, mode: "subscribe" | "poll", intervalMs: number, maxSamples: number) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

      const color = CHART_COLORS[colorIndexRef.current % CHART_COLORS.length];
      colorIndexRef.current++;

      const item: MonitoredItem = {
        nodeId,
        displayName,
        mode,
        intervalMs,
        maxSamples,
        samples: [],
        currentValue: null,
        color,
        active: true,
      };

      setMonitoredItems((prev) => {
        const next = new Map(prev);
        next.set(nodeId, item);
        return next;
      });

      setChartNodeIds((prev) => {
        const next = new Set(prev);
        next.add(nodeId);
        return next;
      });

      if (mode === "subscribe") {
        wsRef.current.send(JSON.stringify({ type: "subscribe", node_id: nodeId, interval_ms: intervalMs }));
      } else {
        wsRef.current.send(JSON.stringify({ type: "poll", node_id: nodeId, interval_ms: intervalMs }));
      }
    },
    [],
  );

  const handleRemoveMonitored = useCallback(
    (nodeId: string) => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        const item = monitoredItems.get(nodeId);
        if (item) {
          if (item.mode === "subscribe") {
            wsRef.current.send(JSON.stringify({ type: "unsubscribe", node_id: nodeId }));
          } else {
            wsRef.current.send(JSON.stringify({ type: "stop_poll", node_id: nodeId }));
          }
        }
      }

      setMonitoredItems((prev) => {
        const next = new Map(prev);
        next.delete(nodeId);
        return next;
      });

      setChartNodeIds((prev) => {
        const next = new Set(prev);
        next.delete(nodeId);
        return next;
      });
    },
    [monitoredItems],
  );

  const handleToggleChart = useCallback((nodeId: string) => {
    setChartNodeIds((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }, []);

  return (
    <div className="h-full flex flex-col bg-slate-950">
      <ConnectionBar
        connected={connected}
        serverUrl={serverUrl}
        onConnect={handleConnect}
        onDisconnect={handleDisconnect}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Left: Tree Browser */}
        <div className="w-72 shrink-0 border-r border-slate-700 flex flex-col bg-slate-900/50">
          <div className="px-3 py-2 border-b border-slate-700 flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
            <Network className="w-3.5 h-3.5" />
            Browser
          </div>
          <div className="flex-1 overflow-auto">
            <TreeView
              roots={treeRoots}
              selectedNodeId={selectedNodeId}
              onSelect={handleSelectNode}
              onUpdateRoots={setTreeRoots}
            />
          </div>
        </div>

        {/* Right: Details + Chart */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top: Node Details */}
          <div className="h-[45%] border-b border-slate-700 overflow-auto">
            <NodePanel
              node={nodeAttrs}
              loading={nodeLoading}
              monitoredItems={monitoredItems}
              onRefresh={handleRefreshNode}
              onSubscribe={handleSubscribe}
            />
          </div>

          {/* Bottom: Chart + Subscriptions */}
          <div className="flex-1 flex overflow-hidden">
            {/* Chart */}
            <div className="flex-1 flex flex-col border-r border-slate-700">
              <div className="px-3 py-2 border-b border-slate-700 flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <BarChart3 className="w-3.5 h-3.5" />
                Live Chart
              </div>
              <div className="flex-1 p-2 min-h-0">
                <ValueChart items={monitoredItems} chartNodeIds={chartNodeIds} />
              </div>
            </div>

            {/* Subscriptions List */}
            <div className="w-80 shrink-0 flex flex-col">
              <div className="px-3 py-2 border-b border-slate-700 flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <List className="w-3.5 h-3.5" />
                Monitored ({monitoredItems.size})
              </div>
              <div className="flex-1 overflow-auto">
                <SubscriptionPanel
                  items={monitoredItems}
                  onRemove={handleRemoveMonitored}
                  chartNodeIds={chartNodeIds}
                  onToggleChart={handleToggleChart}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
