import { useState } from "react";
import { Plug, Unplug, Loader2, ShieldOff, ShieldCheck } from "lucide-react";
import type { ConnectOptions } from "../api";

interface Props {
  connected: boolean;
  serverUrl: string;
  onConnect: (opts: ConnectOptions) => Promise<void>;
  onDisconnect: () => Promise<void>;
}

export default function ConnectionBar({ connected, serverUrl, onConnect, onDisconnect }: Props) {
  const [url, setUrl] = useState(serverUrl);
  const [securityMode, setSecurityMode] = useState<"none" | "username">("none");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async () => {
    setLoading(true);
    setError(null);
    try {
      await onConnect({
        url,
        security_mode: securityMode,
        ...(securityMode === "username" ? { username, password } : {}),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Connection failed");
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setLoading(true);
    setError(null);
    try {
      await onDisconnect();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Disconnect failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="px-4 py-3 bg-slate-900 border-b border-slate-700 space-y-2">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-blue-400 font-semibold text-lg shrink-0">
          <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
          </svg>
          OPC UA Web
        </div>

        <div className="flex-1 flex items-center gap-2">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !connected && handleConnect()}
            placeholder="opc.tcp://localhost:4840"
            disabled={connected || loading}
            className="flex-1 max-w-lg px-3 py-1.5 bg-slate-800 border border-slate-600 rounded-md text-sm
                       text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500
                       disabled:opacity-50 disabled:cursor-not-allowed"
          />

          <select
            value={securityMode}
            onChange={(e) => setSecurityMode(e.target.value as "none" | "username")}
            disabled={connected || loading}
            className="px-2 py-1.5 bg-slate-800 border border-slate-600 rounded-md text-sm
                       text-slate-200 focus:outline-none focus:border-blue-500
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="none">Anonymous</option>
            <option value="username">Username / Password</option>
          </select>

          {!connected ? (
            <button
              onClick={handleConnect}
              disabled={loading || !url.trim()}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-500
                         rounded-md text-sm font-medium transition-colors
                         disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plug className="w-4 h-4" />}
              Connect
            </button>
          ) : (
            <button
              onClick={handleDisconnect}
              disabled={loading}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-red-600 hover:bg-red-500
                         rounded-md text-sm font-medium transition-colors
                         disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Unplug className="w-4 h-4" />}
              Disconnect
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {connected ? (
            securityMode === "none"
              ? <span title="Anonymous (no security)"><ShieldOff className="w-4 h-4 text-amber-400" /></span>
              : <span title="Authenticated"><ShieldCheck className="w-4 h-4 text-green-400" /></span>
          ) : null}
          <div className={`w-2.5 h-2.5 rounded-full ${connected ? "bg-green-500 shadow-[0_0_6px_rgb(34,197,94)]" : "bg-slate-500"}`} />
          <span className={`text-sm ${connected ? "text-green-400" : "text-slate-400"}`}>
            {connected ? "Connected" : "Disconnected"}
          </span>
        </div>

        {error && (
          <span className="text-xs text-red-400 ml-2">{error}</span>
        )}
      </div>

      {securityMode === "username" && !connected && (
        <div className="flex items-center gap-2 ml-[140px]">
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Username"
            disabled={loading}
            autoComplete="off"
            className="w-48 px-3 py-1.5 bg-slate-800 border border-slate-600 rounded-md text-sm
                       text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500
                       disabled:opacity-50"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleConnect()}
            placeholder="Password"
            disabled={loading}
            autoComplete="new-password"
            className="w-48 px-3 py-1.5 bg-slate-800 border border-slate-600 rounded-md text-sm
                       text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500
                       disabled:opacity-50"
          />
        </div>
      )}
    </div>
  );
}
