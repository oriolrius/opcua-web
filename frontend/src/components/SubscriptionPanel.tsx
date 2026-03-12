import { X, Eye, Timer, TrendingUp } from "lucide-react";
import type { MonitoredItem } from "../types";

interface Props {
  items: Map<string, MonitoredItem>;
  onRemove: (nodeId: string) => void;
  chartNodeIds: Set<string>;
  onToggleChart: (nodeId: string) => void;
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "--";
  if (typeof value === "number") return Number.isInteger(value) ? value.toString() : value.toFixed(4);
  return String(value);
}

export default function SubscriptionPanel({ items, onRemove, chartNodeIds, onToggleChart }: Props) {
  if (items.size === 0) {
    return (
      <div className="flex items-center justify-center h-full text-slate-500 text-sm py-8">
        No monitored values. Select a variable node and start monitoring.
      </div>
    );
  }

  return (
    <div className="space-y-1 p-2">
      {Array.from(items.entries()).map(([nodeId, item]) => (
        <div
          key={nodeId}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800/50 border border-slate-700 hover:border-slate-600 transition-colors"
        >
          <div
            className="w-3 h-3 rounded-full shrink-0"
            style={{ backgroundColor: item.color }}
          />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-medium text-slate-200 truncate">{item.displayName}</span>
              {item.mode === "subscribe" ? (
                <Eye className="w-3 h-3 text-blue-400 shrink-0" />
              ) : (
                <Timer className="w-3 h-3 text-amber-400 shrink-0" />
              )}
            </div>
            <div className="text-xs text-slate-500 truncate font-mono">{nodeId}</div>
          </div>

          <div className="text-right shrink-0">
            <div className="text-sm font-mono font-bold text-slate-100">
              {formatValue(item.currentValue)}
            </div>
            <div className="text-xs text-slate-500">
              {item.samples.length}/{item.maxSamples}
            </div>
          </div>

          <button
            onClick={() => onToggleChart(nodeId)}
            className={`p-1 rounded transition-colors shrink-0 ${
              chartNodeIds.has(nodeId)
                ? "text-emerald-400 bg-emerald-900/30"
                : "text-slate-500 hover:text-slate-300 hover:bg-slate-700"
            }`}
            title={chartNodeIds.has(nodeId) ? "Hide from chart" : "Show in chart"}
          >
            <TrendingUp className="w-4 h-4" />
          </button>

          <button
            onClick={() => onRemove(nodeId)}
            className="p-1 rounded text-slate-500 hover:text-red-400 hover:bg-red-900/20 transition-colors shrink-0"
            title="Remove"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
