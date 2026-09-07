"use client";

import React, { useState } from "react";
import { Monitor } from "@/types/monitor";
import { 
  RotateCw, 
  Trash2, 
  Edit3, 
  Play, 
  Pause, 
  Globe, 
  Database, 
  Server, 
  Network, 
  Activity 
} from "lucide-react";

interface MonitorTableViewProps {
  monitors: Monitor[];
  onCheck: (id: string) => Promise<void>;
  onEdit: (monitor: Monitor) => void;
  onDelete: (id: string) => Promise<void>;
  onToggleActive: (id: string, active: boolean) => Promise<void>;
}

export function MonitorTableView({
  monitors,
  onCheck,
  onEdit,
  onDelete,
  onToggleActive,
}: MonitorTableViewProps) {
  const [checkingId, setCheckingId] = useState<string | null>(null);

  const handleCheck = async (id: string) => {
    setCheckingId(id);
    try {
      await onCheck(id);
    } finally {
      setCheckingId(null);
    }
  };

  const getCategoryIcon = (category: string, type: string) => {
    if (type === "database") return <Database className="w-3.5 h-3.5 text-[#0c519d]" />;
    switch (category) {
      case "web":
        return <Globe className="w-3.5 h-3.5 text-[#0c519d]" />;
      case "api":
        return <Activity className="w-3.5 h-3.5 text-cyan-600" />;
      case "database":
        return <Database className="w-3.5 h-3.5 text-purple-600" />;
      case "network":
        return <Network className="w-3.5 h-3.5 text-emerald-600" />;
      default:
        return <Server className="w-3.5 h-3.5 text-amber-600" />;
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black text-slate-500 uppercase tracking-wider">
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Service Name / Target</th>
              <th className="py-3 px-4">Protocol</th>
              <th className="py-3 px-4">Latency</th>
              <th className="py-3 px-4">Uptime SLA</th>
              <th className="py-3 px-4">Last Polled</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {monitors.map((m) => {
              const isDown = m.status === "down";
              const isDegraded = m.status === "degraded";
              const isChecking = checkingId === m.id;

              return (
                <tr
                  key={m.id}
                  className={`transition-colors hover:bg-slate-50 ${
                    isDown ? "bg-[#fb2c36]/5" : isDegraded ? "bg-amber-50/50" : ""
                  }`}
                >
                  {/* Status Badge */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    {!m.active ? (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                        PAUSED
                      </span>
                    ) : isDown ? (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-black bg-[#fb2c36]/10 text-[#fb2c36] border border-[#fb2c36]/30 animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#fb2c36]"></span>
                        DOWN
                      </span>
                    ) : isDegraded ? (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-black bg-amber-50 text-amber-800 border border-amber-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                        DEGRADED
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        OPERATIONAL
                      </span>
                    )}
                  </td>

                  {/* Name & Target */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2">
                      <div className="p-1 rounded bg-slate-100 border border-slate-200 shrink-0">
                        {getCategoryIcon(m.category, m.type)}
                      </div>
                      <div className="truncate max-w-xs sm:max-w-md">
                        <span className="font-bold text-slate-900 block truncate">{m.name}</span>
                        <span className="font-mono text-[11px] text-slate-500 truncate block">
                          {m.type === "database"
                            ? `${m.dbType?.toUpperCase()}://${m.target}:${m.port || 3306}`
                            : m.type === "tcp"
                            ? `TCP://${m.target}:${m.port}`
                            : m.target}
                        </span>
                        {isDown && m.lastError && (
                          <span className="text-[10px] text-[#fb2c36] font-mono truncate block mt-0.5 font-bold">
                            Error: {m.lastError}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Type */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <span className="px-2 py-0.5 rounded text-[10px] font-black bg-[#0c519d]/10 text-[#0c519d] border border-[#0c519d]/30 uppercase tracking-wider">
                      {m.type === "database" ? m.dbType || "DB" : m.type}
                    </span>
                  </td>

                  {/* Latency */}
                  <td className="py-3.5 px-4 whitespace-nowrap font-mono font-black">
                    <span className={isDown ? "text-[#fb2c36]" : m.latency > 1500 ? "text-amber-700" : "text-emerald-600"}>
                      {isDown ? "OFF" : `${m.latency} ms`}
                    </span>
                  </td>

                  {/* Uptime */}
                  <td className="py-3.5 px-4 whitespace-nowrap font-mono font-bold text-slate-700">
                    {m.uptimePercentage !== undefined ? `${m.uptimePercentage}%` : "100%"}
                  </td>

                  {/* Last Checked */}
                  <td className="py-3.5 px-4 whitespace-nowrap text-slate-500 text-[11px] font-medium">
                    {m.lastChecked ? new Date(m.lastChecked).toLocaleTimeString() : "-"}
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 px-4 whitespace-nowrap text-right">
                    <div className="inline-flex items-center gap-1">
                      <button
                        onClick={() => handleCheck(m.id)}
                        disabled={isChecking || !m.active}
                        className="p-1.5 rounded-lg bg-[#0c519d] hover:bg-[#0c519d]/90 text-white transition-colors cursor-pointer disabled:opacity-50"
                        title="Re-check"
                      >
                        <RotateCw className={`w-3.5 h-3.5 ${isChecking ? "animate-spin" : ""}`} />
                      </button>

                      <button
                        onClick={() => onToggleActive(m.id, !m.active)}
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                        title={m.active ? "Pause" : "Resume"}
                      >
                        {m.active ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                      </button>

                      <button
                        onClick={() => onEdit(m)}
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                        title="Edit"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => onDelete(m.id)}
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-[#fb2c36] transition-colors cursor-pointer"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
