"use client";

import React, { useState } from "react";
import { Monitor, CheckHistoryItem } from "@/types/monitor";
import { 
  Play, 
  Pause, 
  RotateCw, 
  Trash2, 
  Edit3, 
  Clock, 
  Database, 
  Globe, 
  Server, 
  Network, 
  Activity,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Radio
} from "lucide-react";

interface MonitorCardProps {
  monitor: Monitor;
  onCheck: (id: string) => Promise<void>;
  onEdit: (monitor: Monitor) => void;
  onDelete: (id: string) => Promise<void>;
  onToggleActive: (id: string, active: boolean) => Promise<void>;
}

export function MonitorCard({
  monitor,
  onCheck,
  onEdit,
  onDelete,
  onToggleActive,
}: MonitorCardProps) {
  const [checking, setChecking] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const handleManualCheck = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setChecking(true);
    try {
      await onCheck(monitor.id);
    } finally {
      setChecking(false);
    }
  };

  const getCategoryIcon = (category: string, type: string) => {
    if (type === "database") return <Database className="w-4 h-4 text-[#0c519d]" />;
    switch (category) {
      case "web":
        return <Globe className="w-4 h-4 text-[#0c519d]" />;
      case "api":
        return <Activity className="w-4 h-4 text-cyan-600" />;
      case "database":
        return <Database className="w-4 h-4 text-purple-600" />;
      case "network":
        return <Network className="w-4 h-4 text-emerald-600" />;
      default:
        return <Server className="w-4 h-4 text-amber-600" />;
    }
  };

  const getStatusBadge = () => {
    if (!monitor.active) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-slate-100 text-slate-500 border border-slate-300 uppercase tracking-wider">
          <span className="w-2 h-2 rounded-full bg-slate-400"></span>
          PAUSED
        </span>
      );
    }

    switch (monitor.status) {
      case "operational":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-black bg-emerald-50 text-emerald-700 border border-emerald-300 uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            OPERATIONAL
          </span>
        );
      case "degraded":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-black bg-amber-50 text-amber-800 border border-amber-300 uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
            DEGRADED
          </span>
        );
      case "down":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-black bg-[#fb2c36]/10 text-[#fb2c36] border border-[#fb2c36]/40 animate-pulse uppercase tracking-wider shadow-xs">
            <span className="w-2 h-2 rounded-full bg-[#fb2c36]"></span>
            CRITICAL DOWN
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200 uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-slate-400"></span>
            STANDBY
          </span>
        );
    }
  };

  const formatLastChecked = (iso?: string) => {
    if (!iso) return "Belum pernah dicek";
    const date = new Date(iso);
    const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diffSec < 10) return "Baru saja";
    if (diffSec < 60) return `${diffSec} dtk lalu`;
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)} mnt lalu`;
    return date.toLocaleTimeString();
  };

  const getTargetDisplay = () => {
    if (monitor.type === "database") {
      return `${monitor.dbType?.toUpperCase() || "DB"}://${monitor.target}:${monitor.port || 3306}`;
    }
    if (monitor.type === "tcp") {
      return `TCP://${monitor.target}:${monitor.port}`;
    }
    if (monitor.type === "ping") {
      return `DNS-PING://${monitor.target}`;
    }
    return `${monitor.method || "GET"} ${monitor.target}`;
  };

  // Render 24 history bars
  const historyBars = Array.from({ length: 24 }).map((_, i) => {
    const historyList = monitor.history || [];
    const item: CheckHistoryItem | undefined = historyList[historyList.length - 24 + i];
    if (!item) {
      return (
        <div
          key={i}
          className="h-8 flex-1 rounded-[2px] bg-slate-200 hover:bg-slate-300 transition-colors"
          title="Belum ada data"
        />
      );
    }

    let bg = "bg-emerald-500 hover:bg-emerald-600";
    if (item.status === "degraded") bg = "bg-amber-500 hover:bg-amber-600";
    if (item.status === "down") bg = "bg-[#fb2c36] hover:bg-[#fb2c36]/90";

    const time = new Date(item.timestamp).toLocaleTimeString();
    const tooltip = `${item.status.toUpperCase()} (${item.latency}ms) - ${time}${item.error ? ` [${item.error}]` : ""}`;

    return (
      <div
        key={i}
        className={`h-8 flex-1 rounded-[2px] ${bg} transition-all cursor-pointer hover:scale-y-110`}
        title={tooltip}
      />
    );
  });

  return (
    <div
      className={`relative rounded-xl border bg-white transition-all duration-200 overflow-hidden shadow-xs hover:shadow-md ${
        monitor.status === "down"
          ? "border-[#fb2c36] ring-1 ring-[#fb2c36]/20"
          : monitor.status === "degraded"
          ? "border-amber-400"
          : "border-slate-200 hover:border-[#0c519d]/40"
      }`}
    >
      {/* Accent Strip */}
      <div
        className={`h-1.5 w-full ${
          monitor.status === "down"
            ? "bg-[#fb2c36]"
            : monitor.status === "degraded"
            ? "bg-amber-500"
            : !monitor.active
            ? "bg-slate-400"
            : "bg-[#0c519d]"
        }`}
      />

      <div className="p-5 sm:p-6">
        {/* Top Header Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 shrink-0 mt-0.5">
              {getCategoryIcon(monitor.category, monitor.type)}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-slate-900 text-base tracking-tight hover:text-[#0c519d] transition-colors">
                  {monitor.name}
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-black bg-[#0c519d]/10 text-[#0c519d] border border-[#0c519d]/30 uppercase tracking-wider">
                  {monitor.type === "database" ? monitor.dbType || "DB" : monitor.type}
                </span>
                {monitor.checkSource === "agent" && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black bg-amber-50 text-amber-800 border border-amber-300 shadow-2xs" title="Dipantau oleh Agent Intranet KWSG">
                    <Radio className="w-2.5 h-2.5 text-amber-600 animate-pulse" />
                    AGENT INTRANET
                  </span>
                )}
                <span className="text-[11px] font-bold text-slate-400 capitalize">
                  • {monitor.category}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-mono mt-1 flex items-center gap-1 truncate max-w-sm sm:max-w-md">
                {getTargetDisplay()}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            {getStatusBadge()}
          </div>
        </div>

        {/* Corporate Metric Grid (White Card) */}
        <div className="grid grid-cols-3 gap-2.5 my-4">
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
            <span className="text-[10px] text-slate-500 font-black uppercase tracking-wider">Latency RTT</span>
            <p className={`text-base font-black font-mono mt-0.5 ${
              monitor.status === "down"
                ? "text-[#fb2c36]"
                : monitor.latency > 1500
                ? "text-amber-600"
                : monitor.latency === 0
                ? "text-slate-400"
                : "text-emerald-600"
            }`}>
              {monitor.status === "down" ? "0 ms (OFF)" : `${monitor.latency} ms`}
            </p>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
            <span className="text-[10px] text-slate-500 font-black uppercase tracking-wider">SLA Availability</span>
            <p className="text-base font-black font-mono text-slate-800 mt-0.5">
              {monitor.uptimePercentage !== undefined ? `${monitor.uptimePercentage}%` : "100%"}
            </p>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
            <span className="text-[10px] text-slate-500 font-black uppercase tracking-wider">Last Polled</span>
            <p className="text-xs font-bold text-slate-700 mt-1 truncate" title={monitor.lastChecked}>
              {formatLastChecked(monitor.lastChecked)}
            </p>
          </div>
        </div>

        {/* Failure Diagnosis Banner if Down */}
        {monitor.status === "down" && monitor.lastError && (
          <div className="mb-4 p-3 rounded-lg bg-[#fb2c36]/10 border border-[#fb2c36]/40 text-slate-800 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-[#fb2c36] mt-0.5" />
            <div className="overflow-hidden">
              <span className="font-bold text-[#fb2c36] uppercase tracking-wider block text-[10px]">
                Failure Diagnosis:
              </span>
              <span className="font-mono text-slate-800 text-xs break-all font-medium">{monitor.lastError}</span>
            </div>
          </div>
        )}

        {/* 24-Hour Uptime Sparkline */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            <span>24 Polling History</span>
            <span className="text-slate-400 font-mono">Real-Time &rarr;</span>
          </div>
          <div className="flex items-center gap-1 w-full bg-slate-100 p-1.5 rounded-lg border border-slate-200">
            {historyBars}
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <button
              onClick={handleManualCheck}
              disabled={checking || !monitor.active}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-[#0c519d] hover:bg-[#0c519d]/90 text-white transition-all shadow-xs disabled:opacity-50 cursor-pointer"
              title="Periksa kesehatan sekarang"
            >
              <RotateCw className={`w-3.5 h-3.5 ${checking ? "animate-spin text-white" : ""}`} />
              <span>{checking ? "Checking..." : "Re-Check"}</span>
            </button>

            <button
              onClick={() => onToggleActive(monitor.id, !monitor.active)}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer border ${
                monitor.active
                  ? "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300"
                  : "bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300"
              }`}
              title={monitor.active ? "Jeda pemantauan" : "Lanjutkan pemantauan"}
            >
              {monitor.active ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{monitor.active ? "Pause" : "Resume"}</span>
            </button>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              title="Detail konfigurasi"
            >
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            <button
              onClick={() => onEdit(monitor)}
              className="p-1.5 text-slate-500 hover:text-[#0c519d] rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              title="Edit konfigurasi target"
            >
              <Edit3 className="w-4 h-4" />
            </button>

            <button
              onClick={() => onDelete(monitor.id)}
              className="p-1.5 text-slate-500 hover:text-[#fb2c36] rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              title="Hapus monitor"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Collapsible Inspection Details */}
        {expanded && (
          <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-700 space-y-2 bg-slate-50 p-3.5 rounded-lg border border-slate-200 font-mono">
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-sans font-bold">Target URI / Host:</span>
                <p className="text-slate-900 font-bold truncate">{monitor.target}</p>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-sans font-bold">Port Number:</span>
                <p className="text-slate-900 font-bold">{monitor.port || "Default"}</p>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-sans font-bold">Network Timeout:</span>
                <p className="text-slate-900">{monitor.timeout || 5000} ms</p>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-sans font-bold">Polling Cycle:</span>
                <p className="text-slate-900">{monitor.checkInterval || 1800} seconds</p>
              </div>
              {monitor.type === "http" && (
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-sans font-bold">Expected Code:</span>
                  <p className="text-emerald-700 font-bold">HTTP {monitor.expectedStatusCode || 200}</p>
                </div>
              )}
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-sans font-bold">System ID:</span>
                <p className="text-slate-500 text-[10px] truncate">{monitor.id}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
