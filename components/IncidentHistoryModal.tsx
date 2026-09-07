"use client";

import React from "react";
import { Incident } from "@/types/monitor";
import { X, AlertOctagon, CheckCircle2, Clock, ShieldAlert } from "lucide-react";

interface IncidentHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  incidents: Incident[];
}

export function IncidentHistoryModal({
  isOpen,
  onClose,
  incidents,
}: IncidentHistoryModalProps) {
  if (!isOpen) return null;

  const ongoing = incidents.filter((i) => i.status === "ongoing");
  const resolved = incidents.filter((i) => i.status === "resolved");

  const formatDuration = (sec?: number) => {
    if (!sec) return "< 1 detik";
    if (sec < 60) return `${sec} detik`;
    if (sec < 3600) return `${Math.floor(sec / 60)}m ${sec % 60}s`;
    return `${Math.floor(sec / 3600)}j ${Math.floor((sec % 3600) / 60)}m`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden my-8">
        {/* Top Accent Strip */}
        <div className={`h-1.5 w-full ${ongoing.length > 0 ? "bg-[#fb2c36]" : "bg-[#0c519d]"}`} />

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-3.5">
            <div className={`p-2.5 rounded-xl border text-white ${
              ongoing.length > 0 ? "bg-[#fb2c36] border-[#fb2c36]" : "bg-[#0c519d] border-[#0c519d]"
            }`}>
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#0c519d]">
                AUDIT & INCIDENT MANAGEMENT
              </span>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight mt-0.5">
                Log Insiden & Rekam Jejak Downtime
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Catatan resmi insiden kegagalan koneksi server/database dan durasi pemulihan operasional.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-800 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[65vh] overflow-y-auto space-y-6">
          {/* Ongoing Critical Incidents */}
          {ongoing.length > 0 && (
            <div>
              <h3 className="text-xs font-black text-[#fb2c36] uppercase tracking-wider mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#fb2c36] animate-ping"></span>
                Insiden Aktif Membutuhkan Penanganan Segera ({ongoing.length})
              </h3>
              <div className="space-y-3">
                {ongoing.map((inc) => (
                  <div
                    key={inc.id}
                    className="p-4 rounded-xl bg-[#fb2c36]/10 border border-[#fb2c36]/40 text-slate-800 space-y-2 shadow-xs"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                        <AlertOctagon className="w-4 h-4 text-[#fb2c36]" />
                        {inc.monitorName}
                      </h4>
                      <span className="px-2.5 py-0.5 rounded text-[10px] font-black bg-[#fb2c36] text-white tracking-wider uppercase animate-pulse">
                        CRITICAL DOWN
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-white border border-[#fb2c36]/30 font-mono text-xs text-slate-800">
                      <span className="text-[#fb2c36] font-bold">Root Cause: </span>
                      {inc.cause}
                    </div>
                    <p className="text-[11px] text-slate-600 flex items-center gap-1.5 font-mono">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      Waktu Mulai Gangguan: {new Date(inc.startedAt).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Resolved Incidents */}
          <div>
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
              Riwayat Insiden Terselesaikan ({resolved.length})
            </h3>

            {resolved.length === 0 && ongoing.length === 0 ? (
              <div className="text-center py-12 px-4 rounded-xl bg-slate-50 border border-slate-200">
                <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto mb-3" />
                <p className="font-bold text-slate-900 text-sm">Tidak Ada Insiden Tercatat</p>
                <p className="text-xs text-slate-500 mt-1">
                  Seluruh server dan layanan beroperasi 100% tanpa gangguan koneksi.
                </p>
              </div>
            ) : resolved.length === 0 ? (
              <p className="text-xs text-slate-500 italic">Belum ada riwayat insiden yang terselesaikan.</p>
            ) : (
              <div className="space-y-3">
                {resolved.map((inc) => (
                  <div
                    key={inc.id}
                    className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 space-y-2 hover:border-slate-300 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        {inc.monitorName}
                      </h4>
                      <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 uppercase tracking-wider font-mono">
                        Downtime: {formatDuration(inc.durationSeconds)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 font-mono bg-white p-2 rounded border border-slate-200">
                      Penyebab: {inc.cause}
                    </p>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 font-mono">
                      <span>Mulai: {new Date(inc.startedAt).toLocaleString()}</span>
                      {inc.resolvedAt && <span>Pulih: {new Date(inc.resolvedAt).toLocaleString()}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-700 bg-slate-200 hover:bg-slate-300 rounded-lg transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
