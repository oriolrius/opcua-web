import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { MonitoredItem } from "../types";

interface Props {
  items: Map<string, MonitoredItem>;
  chartNodeIds: Set<string>;
}

export default function ValueChart({ items, chartNodeIds }: Props) {
  const visibleItems = useMemo(() => {
    const result: [string, MonitoredItem][] = [];
    for (const [nodeId, item] of items) {
      if (chartNodeIds.has(nodeId) && item.samples.length > 0) {
        result.push([nodeId, item]);
      }
    }
    return result;
  }, [items, chartNodeIds]);

  const mergedData = useMemo(() => {
    if (visibleItems.length === 0) return [];

    const allPoints = new Map<number, Record<string, number>>();

    for (const [, item] of visibleItems) {
      for (const sample of item.samples) {
        const ts = sample.timestamp;
        if (!allPoints.has(ts)) {
          allPoints.set(ts, { timestamp: ts });
        }
        allPoints.get(ts)![item.displayName] = sample.value;
      }
    }

    return Array.from(allPoints.values()).sort((a, b) => a.timestamp - b.timestamp);
  }, [visibleItems]);

  if (visibleItems.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-slate-500 text-sm">
        Click the chart icon on a monitored item to display it here
      </div>
    );
  }

  const formatTimestamp = (ts: number) => {
    const d = new Date(ts);
    return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}:${d.getSeconds().toString().padStart(2, "0")}`;
  };

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={mergedData} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
        <XAxis
          dataKey="timestamp"
          tickFormatter={formatTimestamp}
          stroke="#64748b"
          tick={{ fontSize: 11 }}
          type="number"
          domain={["dataMin", "dataMax"]}
          scale="time"
        />
        <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
        <Tooltip
          contentStyle={{
            backgroundColor: "#1e293b",
            border: "1px solid #334155",
            borderRadius: "8px",
            fontSize: "12px",
          }}
          labelFormatter={formatTimestamp}
        />
        <Legend wrapperStyle={{ fontSize: "12px" }} />
        {visibleItems.map(([, item]) => (
          <Line
            key={item.displayName}
            type="monotone"
            dataKey={item.displayName}
            stroke={item.color}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
            connectNulls
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
