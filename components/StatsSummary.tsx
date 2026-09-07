"use client";

import React from "react";
import { SystemStats } from "@/types/monitor";
import { 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Activity, 
  Zap, 
  Server,
  Database,
  RefreshCw,
  ShieldCheck,
  ShieldAlert,
  ArrowUpRight
} from "lucide-react";

interface StatsSummaryProps {
  stats: SystemStats;
  dbStatus: { connected: boolean; message: string; projectId?: string } | null;
  checkingDb: boolean;
  onRefreshDb: () => void;
  onFilterDownOnly?: () => void;
}

export function StatsSummary({
  stats,
  dbStatus,
  checkingDb,
  onRefreshDb,
  onFilterDownOnly,
}: StatsSummaryProps) {
  const isAllGood = stats.down === 0 && stats.degraded === 0 && stats.total > 0;
  const hasDown = stats.down > 0;
  const hasDegraded = stats.degraded > 0 && stats.down === 0;

  return (
    <div className="space-y-4">
      {/* Top Corporate Status Banner (White / Light Corporate) */}
      <div
        className={`relative overflow-hidden rounded-2xl border transition-all duration-300 shadow-sm bg-white ${
          hasDown
            ? "border-[#fb2c36]/60 bg-gradient-to-r from-[#fb2c36]/5 via-white to-white"
            : hasDegraded
            ? "border-amber-400 bg-gradient-to-r from-amber-50 via-white to-white"
            : "border-[#0c519d]/25 bg-gradient-to-r from-blue-50/50 via-white to-white"
        }`}
      >
        {/* Accent Top Bar */}
        <div
          className={`h-1.5 w-full ${
            hasDown ? "bg-[#fb2c36]" : hasDegraded ? "bg-amber-500" : "bg-[#0c519d]"
          }`}
        />

        <div className="p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-start sm:items-center gap-4">
            <div
              className={`p-3.5 rounded-xl border shadow-md shrink-0 ${
                hasDown
                  ? "bg-[#fb2c36] text-white border-[#fb2c36] shadow-[#fb2c36]/30 animate-pulse"
                  : hasDegraded
                  ? "bg-amber-500 text-white border-amber-600 shadow-amber-500/30"
                  : "bg-[#0c519d] text-white border-[#0c519d] shadow-[#0c519d]/30"
              }`}
            >
              {hasDown ? (
                <ShieldAlert className="w-7 h-7" />
              ) : hasDegraded ? (
                <AlertTriangle className="w-7 h-7" />
              ) : (
                <ShieldCheck className="w-7 h-7" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <span
                  className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded tracking-wider ${
                    hasDown
                      ? "bg-[#fb2c36]/15 text-[#fb2c36] border border-[#fb2c36]/30"
                      : hasDegraded
                      ? "bg-amber-100 text-amber-800 border border-amber-300"
                      : "bg-[#0c519d]/10 text-[#0c519d] border border-[#0c519d]/25"
                  }`}
                >
                  {hasDown ? "STATUS KRITIS" : hasDegraded ? "PERFORMA MENURUN" : "SYSTEM OPERATIONAL"}
                </span>
                <span className="text-xs text-slate-500 font-mono">
                  SLA Uptime: <strong className="text-slate-800">{stats.uptimeAverage}%</strong>
                </span>
              </div>

              <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight mt-1">
                {hasDown
                  ? `Peringatan Kritis: ${stats.down} Layanan Mengalami Gangguan Down!`
                  : hasDegraded
                  ? `Perhatian: ${stats.degraded} Layanan Mengalami Kelambatan (Degraded)`
                  : "Seluruh Server & Database Beroperasi dengan Optimal"}
              </h2>

              <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed font-medium">
                {hasDown
                  ? "Terdeteksi adanya server atau port database yang terputus. Silakan lakukan audit insiden pada kartu di bawah."
                  : hasDegraded
                  ? "Waktu respons melampaui toleransi normal (>1500ms). Periksa kapasitas beban pada infrastruktur terkait."
                  : "Semua protokol HTTP/HTTPS, TCP Socket, dan Database MySQL/Redis merespons tepat waktu."}
              </p>
            </div>
          </div>

          {/* Right Action & Database Storage Info */}
          <div className="flex flex-col sm:flex-row md:flex-col items-start sm:items-center md:items-end gap-2.5 border-t md:border-t-0 pt-3 md:pt-0 border-slate-200">
            {hasDown && onFilterDownOnly && (
              <button
                onClick={onFilterDownOnly}
                className="px-3.5 py-1.5 rounded-lg bg-[#fb2c36] hover:bg-[#fb2c36]/90 text-white text-xs font-black shadow-md shadow-[#fb2c36]/25 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span>Lihat Layanan Down ({stats.down})</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            )}

            <div className="flex items-center gap-2">
              <div
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border ${
                  dbStatus?.connected
                    ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                    : "bg-slate-100 text-slate-700 border-slate-200"
                }`}
                title={dbStatus?.message}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    dbStatus?.connected ? "bg-emerald-500" : "bg-amber-500"
                  }`}
                />
                <Database className="w-3.5 h-3.5 text-[#0c519d]" />
                <span className="font-mono text-[11px] truncate max-w-[190px] font-semibold">
                  {dbStatus?.connected ? `Firebase: ${dbStatus.projectId}` : "Local Storage Mode"}
                </span>
              </div>

              <button
                onClick={onRefreshDb}
                disabled={checkingDb}
                className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors border border-slate-200 cursor-pointer disabled:opacity-50"
                title="Cek ulang status koneksi database"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${checkingDb ? "animate-spin text-[#0c519d]" : ""}`} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 5-Column Executive KPI Cards (White Surfaces) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Total Services */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 hover:border-[#0c519d]/50 transition-all shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Monitor</span>
            <div className="p-1.5 rounded-md bg-[#0c519d]/10 text-[#0c519d]">
              <Server className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-2xl font-black font-mono text-slate-900 mt-2">{stats.total}</p>
          <span className="text-[11px] text-slate-400 mt-1 block font-medium">Layanan Terdaftar</span>
        </div>

        {/* Operational */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 hover:border-emerald-500/50 transition-all shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Operational</span>
            <div className="p-1.5 rounded-md bg-emerald-100 text-emerald-700">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-2xl font-black font-mono text-emerald-600 mt-2">{stats.operational}</p>
          <span className="text-[11px] text-emerald-700/80 mt-1 block font-semibold">100% Responsif</span>
        </div>

        {/* Degraded */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 hover:border-amber-500/50 transition-all shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">Degraded</span>
            <div className="p-1.5 rounded-md bg-amber-100 text-amber-700">
              <AlertTriangle className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-2xl font-black font-mono text-amber-600 mt-2">{stats.degraded}</p>
          <span className="text-[11px] text-amber-700/80 mt-1 block font-semibold">Latensi Lambat</span>
        </div>

        {/* Down / Alert */}
        <div className={`p-4 rounded-xl bg-white border transition-all shadow-xs ${
          stats.down > 0 
            ? "border-[#fb2c36] shadow-[#fb2c36]/10 bg-[#fb2c36]/5" 
            : "border-slate-200"
        }`}>
          <div className="flex items-center justify-between">
            <span className={`text-[11px] font-bold uppercase tracking-wider ${
              stats.down > 0 ? "text-[#fb2c36]" : "text-slate-500"
            }`}>
              Server Down
            </span>
            <div className={`p-1.5 rounded-md ${
              stats.down > 0 ? "bg-[#fb2c36] text-white" : "bg-slate-100 text-slate-500"
            }`}>
              <XCircle className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className={`text-2xl font-black font-mono mt-2 ${
            stats.down > 0 ? "text-[#fb2c36]" : "text-slate-800"
          }`}>
            {stats.down}
          </p>
          <span className={`text-[11px] mt-1 block font-bold ${
            stats.down > 0 ? "text-[#fb2c36]" : "text-slate-400"
          }`}>
            {stats.down > 0 ? "Memerlukan Tindakan" : "Nihil Masalah"}
          </span>
        </div>

        {/* Latency & SLA */}
        <div className="col-span-2 sm:col-span-1 p-4 rounded-xl bg-white border border-slate-200 hover:border-[#0c519d]/50 transition-all shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#0c519d] uppercase tracking-wider">Avg Latency</span>
            <div className="p-1.5 rounded-md bg-[#0c519d]/10 text-[#0c519d]">
              <Zap className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-2xl font-black font-mono text-slate-900 mt-2">
            {stats.avgLatency} <span className="text-xs font-semibold text-slate-500">ms</span>
          </p>
          <span className="text-[11px] text-blue-700/80 mt-1 block font-mono font-semibold">Uptime: {stats.uptimeAverage}%</span>
        </div>
      </div>
    </div>
  );
}
