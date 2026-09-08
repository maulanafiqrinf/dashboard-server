"use client";

import React, { useState } from "react";
import { X, Copy, Check, Terminal, Radio, Shield, HelpCircle, ArrowRight, Play, Server } from "lucide-react";

interface IntranetAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReportSimulated?: () => void;
}

export function IntranetAgentModal({
  isOpen,
  onClose,
  onReportSimulated,
}: IntranetAgentModalProps) {
  const [activeTab, setActiveTab] = useState<"powershell" | "python" | "bash">("powershell");
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedCmd, setCopiedCmd] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [simulateMsg, setSimulateMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentOrigin = typeof window !== "undefined" ? window.location.origin : "https://dashboard-server.vercel.app";
  const agentEndpoint = `${currentOrigin}/api/agent/report`;
  const secretKey = "kwsg-intranet-agent-key-2026";

  const ps1Command = `powershell -ExecutionPolicy Bypass -Command "& {Invoke-RestMethod -Uri '${agentEndpoint}' -Method Post -Headers @{'x-agent-secret'='${secretKey}'} -ContentType 'application/json' -Body '{\\"target\\":\\"http://172.20.110.20/hrdonline\\",\\"name\\":\\"HRD Online Intranet\\",\\"status\\":\\"operational\\",\\"latency\\":38,\\"statusCode\\":200}'}"`;

  const bashCommand = `curl -X POST '${agentEndpoint}' \\
  -H 'Content-Type: application/json' \\
  -H 'x-agent-secret: ${secretKey}' \\
  -d '{"target":"http://172.20.110.20/hrdonline","name":"HRD Online Intranet","status":"operational","latency":38,"statusCode":200}'`;

  const pythonCommand = `python scripts/agent-intranet.py --url '${currentOrigin}' --daemon`;

  const handleCopy = (text: string, type: "key" | "cmd") => {
    navigator.clipboard.writeText(text);
    if (type === "key") {
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    } else {
      setCopiedCmd(true);
      setTimeout(() => setCopiedCmd(false), 2000);
    }
  };

  const handleSimulateReport = async () => {
    setSimulating(true);
    setSimulateMsg(null);
    try {
      const res = await fetch("/api/agent/report", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-agent-secret": secretKey,
        },
        body: JSON.stringify({
          secretKey,
          reports: [
            {
              target: "http://172.20.110.20/hrdonline",
              name: "HRD Online (Server 20)",
              status: "operational",
              latency: Math.floor(Math.random() * 20) + 25,
              statusCode: 200,
              category: "web",
              type: "http",
            },
            {
              target: "http://172.20.110.20",
              name: "Portal Intranet KWSG (Server 20)",
              status: "operational",
              latency: Math.floor(Math.random() * 20) + 20,
              statusCode: 200,
              category: "web",
              type: "http",
            },
            {
              target: "http://172.20.110.20/sipk",
              name: "Sistem Kepegawaian SIPK (Server 20)",
              status: "operational",
              latency: Math.floor(Math.random() * 25) + 30,
              statusCode: 200,
              category: "web",
              type: "http",
            },
            {
              target: "172.20.110.20",
              port: 3306,
              name: "MySQL Database Server 20 (Port 3306)",
              status: "operational",
              latency: Math.floor(Math.random() * 15) + 10,
              category: "database",
              type: "tcp",
            },
          ],
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSimulateMsg(`Berhasil! ${data.processed || 4} layanan di Server 172.20.110.20 berhasil disinkronkan & diperbarui di dashboard.`);
        if (onReportSimulated) onReportSimulated();
      } else {
        setSimulateMsg(`Gagal: ${data.error}`);
      }
    } catch (err: unknown) {
      setSimulateMsg(err instanceof Error ? err.message : "Gagal mengirim simulasi");
    } finally {
      setSimulating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-slate-200 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#0c519d] text-white shadow-xs">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900">
                Agent Intranet KWSG (Solusi Pilihan C)
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Konektor Pemantau Server IP Privat (172.20.x.x / 192.168.x.x) ke Dashboard Cloud
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Concept Diagram */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
              <HelpCircle className="w-4 h-4 text-[#0c519d]" />
              <span>Cara Kerja Pola Agent Intranet:</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-slate-600 pt-1">
              <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                <span className="font-bold text-[#0c519d] block mb-1">1. Server Kantor</span>
                Target internal seperti <code className="font-mono text-[10px] bg-slate-100 px-1 py-0.5 rounded">172.20.110.20/hrdonline</code> diakses secara lokal.
              </div>
              <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                <span className="font-bold text-[#0c519d] block mb-1">2. Script Agent</span>
                Script ringan (PowerShell/Python) mengukur waktu respon (ms) & status code.
              </div>
              <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                <span className="font-bold text-[#0c519d] block mb-1">3. Push Heartbeat</span>
                Hasil dikirim via HTTPS ke dashboard Vercel secara aman tiap 30 menit.
              </div>
            </div>
          </div>

          {/* Quick Info Credentials */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 rounded-xl border border-slate-200 bg-white">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Endpoint Ingestion URL
              </span>
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-xs text-slate-800 truncate font-semibold">
                  {agentEndpoint}
                </span>
                <button
                  onClick={() => handleCopy(agentEndpoint, "cmd")}
                  className="p-1 rounded text-slate-400 hover:text-slate-700 transition-colors"
                  title="Salin URL"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="p-3 rounded-xl border border-slate-200 bg-white">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Secret Key (Header: x-agent-secret)
              </span>
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-xs text-[#0c519d] font-bold truncate">
                  {secretKey}
                </span>
                <button
                  onClick={() => handleCopy(secretKey, "key")}
                  className="p-1 rounded text-slate-400 hover:text-slate-700 transition-colors"
                  title="Salin Secret Key"
                >
                  {copiedKey ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>

          {/* Code Selection Tabs */}
          <div>
            <div className="flex items-center justify-between border-b border-slate-200 mb-3">
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveTab("powershell")}
                  className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 cursor-pointer ${
                    activeTab === "powershell"
                      ? "border-[#0c519d] text-[#0c519d]"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  PowerShell (Windows)
                </button>
                <button
                  onClick={() => setActiveTab("python")}
                  className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 cursor-pointer ${
                    activeTab === "python"
                      ? "border-[#0c519d] text-[#0c519d]"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Python 3 (Universal)
                </button>
                <button
                  onClick={() => setActiveTab("bash")}
                  className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 cursor-pointer ${
                    activeTab === "bash"
                      ? "border-[#0c519d] text-[#0c519d]"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Bash / cURL (Linux)
                </button>
              </div>

              <span className="text-[10px] font-bold text-slate-400 font-mono">
                {activeTab === "powershell" ? "Windows Task Scheduler" : activeTab === "python" ? "Daemon Mode" : "Cron"}
              </span>
            </div>

            {/* Script Display */}
            <div className="relative rounded-xl bg-slate-900 text-slate-100 p-4 font-mono text-xs overflow-x-auto">
              <button
                onClick={() =>
                  handleCopy(
                    activeTab === "powershell"
                      ? ps1Command
                      : activeTab === "python"
                      ? pythonCommand
                      : bashCommand,
                    "cmd"
                  )
                }
                className="absolute top-3 right-3 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-sans font-bold flex items-center gap-1.5 text-slate-300 border border-slate-700 transition-colors cursor-pointer"
              >
                {copiedCmd ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCmd ? "Tersalin" : "Salin Perintah"}</span>
              </button>

              <div className="pr-24">
                {activeTab === "powershell" && (
                  <pre className="whitespace-pre-wrap leading-relaxed text-emerald-400">
                    {ps1Command}
                  </pre>
                )}
                {activeTab === "python" && (
                  <div>
                    <p className="text-slate-400 text-[11px] mb-2 font-sans">
                      Jalankan file script yang sudah kami sediakan di folder <code>scripts/agent-intranet.py</code>:
                    </p>
                    <pre className="whitespace-pre-wrap leading-relaxed text-amber-300">
                      {pythonCommand}
                    </pre>
                  </div>
                )}
                {activeTab === "bash" && (
                  <pre className="whitespace-pre-wrap leading-relaxed text-cyan-300">
                    {bashCommand}
                  </pre>
                )}
              </div>
            </div>

            <p className="text-[11px] text-slate-500 mt-2 italic">
              File script lengkap siap pakai telah tersedia di folder proyek: <code className="font-bold text-slate-700 font-mono">scripts/agent-intranet.ps1</code>, <code className="font-bold text-slate-700 font-mono">scripts/agent-intranet.py</code>, dan contoh <code className="font-bold text-slate-700 font-mono">scripts/targets.example.json</code>.
            </p>
          </div>

          {/* Multi-Service on Server 172.20.110.20 Callout */}
          <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 space-y-2 text-xs">
            <div className="flex items-center gap-2 font-bold text-amber-900">
              <Server className="w-4 h-4 text-amber-700" />
              <span>Memantau Banyak Aplikasi di Server 172.20.110.20:</span>
            </div>
            <p className="text-[11px] text-amber-800 leading-relaxed">
              Jika di server 20 terdapat banyak aplikasi (contoh: <code className="font-mono font-bold">/hrdonline</code>, <code className="font-mono font-bold">/sipk</code>, <code className="font-mono font-bold">/absensi</code>, port database <code className="font-mono font-bold">3306</code>):
            </p>
            <ul className="list-disc list-inside text-[11px] text-amber-900/90 space-y-1 pl-1">
              <li>
                <strong>Otomatis (Cloud Sync):</strong> Cukup klik <strong>&quot;Tambah Target&quot;</strong> di dashboard ini untuk tiap aplikasi. Script agent di kantor akan otomatis mengunduh daftar target tersebut dan memantaunya tanpa Anda perlu mengedit script di server.
              </li>
              <li>
                <strong>File Lokal (targets.json):</strong> Anda juga bisa mendaftarkan daftar URL di file <code className="font-mono font-bold">scripts/targets.json</code> di komputer/server kantor.
              </li>
            </ul>
          </div>

          {/* Test Simulation Section */}
          <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/50 space-y-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h4 className="text-xs font-bold text-[#0c519d] flex items-center gap-1.5">
                  <Play className="w-3.5 h-3.5 fill-current" />
                  Uji Coba Laporan Multi-Layanan Server 20 Sekarang
                </h4>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  Klik tombol di samping untuk mensimulasikan pengiriman laporan sekaligus untuk 4 layanan di Server 172.20.110.20 (HRD Online, Portal, SIPK, MySQL).
                </p>
              </div>

              <button
                onClick={handleSimulateReport}
                disabled={simulating}
                className="px-4 py-2 rounded-xl bg-[#0c519d] hover:bg-[#093d75] text-white font-bold text-xs shadow-xs transition-colors cursor-pointer disabled:opacity-60 flex items-center gap-2"
              >
                {simulating ? "Mengirim Laporan..." : "Kirim Uji Heartbeat Multi-Layanan"}
              </button>
            </div>

            {simulateMsg && (
              <div className="p-2.5 rounded-lg bg-white border border-blue-200 text-xs text-slate-700 font-semibold animate-in fade-in">
                {simulateMsg}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="text-xs text-slate-400 font-mono">
            Semen Indonesia Cooperative • Agent Gateway v1.0
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs cursor-pointer shadow-xs"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
