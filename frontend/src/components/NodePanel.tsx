import { useState } from "react";
import { RefreshCw, Eye, Timer, Loader2 } from "lucide-react";
import type { NodeAttributes, MonitoredItem } from "../types";

interface Props {
  node: NodeAttributes | null;
  loading: boolean;
  monitoredItems: Map<string, MonitoredItem>;
  onRefresh: () => void;
  onSubscribe: (nodeId: string, displayName: string, mode: "subscribe" | "poll", intervalMs: number, maxSamples: number) => void;
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "N/A";
  if (typeof value === "number") return Number.isInteger(value) ? value.toString() : value.toFixed(4);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return `[${value.length} items]`;
  return JSON.stringify(value);
}

export default function NodePanel({ node, loading, monitoredItems, onRefresh, onSubscribe }: Props) {
  const [mode, setMode] = useState<"subscribe" | "poll">("subscribe");
  const [interval, setInterval] = useState(1000);
  const [maxSamples, setMaxSamples] = useState(200);

  if (!node) {
    return (
      <div className="flex items-center justify-center h-full text-slate-500 text-sm">
        Select a node to view details
      </div>
    );
  }

  const isMonitored = monitoredItems.has(node.node_id);
  const isVariable = node.node_class === "Variable";

  const handleMonitor = () => {
    onSubscribe(node.node_id, node.display_name, mode, interval, maxSamples);
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-100">{node.display_name}</h2>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="p-1.5 rounded-md hover:bg-slate-700 transition-colors text-slate-400 hover:text-slate-200"
          title="Refresh"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
        </button>
      </div>

      <div className="rounded-lg bg-slate-800/50 border border-slate-700 overflow-hidden">
        <table className="w-full text-sm">
          <tbody>
            {[
              ["Node ID", node.node_id],
              ["Browse Name", node.browse_name],
              ["Node Class", node.node_class],
              ...(node.data_type ? [["Data Type", node.data_type]] : []),
              ...(node.description ? [["Description", node.description]] : []),
              ...(node.access_level !== null ? [["Access Level", node.access_level]] : []),
              ["Writable", node.writable ? "Yes" : "No"],
              ["Historizing", node.historizing ? "Yes" : "No"],
              ...(node.minimum_sampling_interval !== null ? [["Min Sampling Interval", `${node.minimum_sampling_interval} ms`]] : []),
            ].map(([label, value], i) => (
              <tr key={label as string} className={i % 2 === 0 ? "bg-slate-800/30" : ""}>
                <td className="px-3 py-1.5 text-slate-400 font-medium w-44">{label as string}</td>
                <td className="px-3 py-1.5 text-slate-200 font-mono text-xs break-all">{String(value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isVariable && (
        <div className="rounded-lg bg-slate-800/50 border border-slate-700 p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-300">Current Value</span>
            {isMonitored && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-green-900/50 text-green-400 border border-green-800">
                Monitored
              </span>
            )}
          </div>
          <div className="text-2xl font-mono font-bold text-blue-300">
            {formatValue(node.value)}
          </div>
        </div>
      )}

      {isVariable && !isMonitored && (
        <div className="rounded-lg bg-slate-800/50 border border-slate-700 p-3 space-y-3">
          <span className="text-sm font-medium text-slate-300">Monitor this value</span>

          <div className="flex gap-2">
            <button
              onClick={() => setMode("subscribe")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors
                ${mode === "subscribe" ? "bg-blue-600 text-white" : "bg-slate-700 text-slate-300 hover:bg-slate-600"}`}
            >
              <Eye className="w-3.5 h-3.5" />
              Subscribe
            </button>
            <button
              onClick={() => setMode("poll")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors
                ${mode === "poll" ? "bg-blue-600 text-white" : "bg-slate-700 text-slate-300 hover:bg-slate-600"}`}
            >
              <Timer className="w-3.5 h-3.5" />
              Poll
            </button>
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-xs text-slate-400">
              Interval (ms)
              <input
                type="number"
                value={interval}
                onChange={(e) => setInterval(Number(e.target.value))}
                min={100}
                step={100}
                className="w-20 px-2 py-1 bg-slate-700 border border-slate-600 rounded text-xs text-slate-200"
              />
            </label>
            <label className="flex items-center gap-2 text-xs text-slate-400">
              Max samples
              <input
                type="number"
                value={maxSamples}
                onChange={(e) => setMaxSamples(Number(e.target.value))}
                min={10}
                step={10}
                className="w-20 px-2 py-1 bg-slate-700 border border-slate-600 rounded text-xs text-slate-200"
              />
            </label>
          </div>

          <button
            onClick={handleMonitor}
            className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 rounded-md text-sm font-medium transition-colors"
          >
            Start Monitoring
          </button>
        </div>
      )}
    </div>
  );
}
