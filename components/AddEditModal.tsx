"use client";

import React, { useState, useEffect } from "react";
import { Monitor, MonitorType, MonitorCategory, DatabaseType } from "@/types/monitor";
import { X, Sparkles } from "lucide-react";

interface AddEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<Monitor>) => Promise<void>;
  initialData?: Monitor | null;
}

export function AddEditModal({
  isOpen,
  onClose,
  onSave,
  initialData,
}: AddEditModalProps) {
  const [name, setName] = useState("");
  const [type, setType] = useState<MonitorType>("http");
  const [category, setCategory] = useState<MonitorCategory>("web");
  const [target, setTarget] = useState("");
  const [port, setPort] = useState<string>("");
  const [dbType, setDbType] = useState<DatabaseType>("mysql");
  const [method, setMethod] = useState<"GET" | "POST" | "HEAD">("GET");
  const [expectedStatusCode, setExpectedStatusCode] = useState<number>(200);
  const [timeout, setTimeoutVal] = useState<number>(5000);
  const [checkInterval, setCheckInterval] = useState<number>(1800); // 30 minutes default!
  const [checkSource, setCheckSource] = useState<"cloud" | "agent">("cloud");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setType(initialData.type);
      setCategory(initialData.category);
      setTarget(initialData.target);
      setPort(initialData.port ? String(initialData.port) : "");
      setDbType(initialData.dbType || "mysql");
      setMethod(initialData.method || "GET");
      setExpectedStatusCode(initialData.expectedStatusCode || 200);
      setTimeoutVal(initialData.timeout || 5000);
      setCheckInterval(initialData.checkInterval || 1800);
      setCheckSource(initialData.checkSource || "cloud");
    } else {
      setName("");
      setType("http");
      setCategory("web");
      setTarget("http://localhost:3000");
      setPort("");
      setDbType("mysql");
      setMethod("GET");
      setExpectedStatusCode(200);
      setTimeoutVal(5000);
      setCheckInterval(1800);
      setCheckSource("cloud");
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const applyPreset = (presetKey: string) => {
    switch (presetKey) {
      case "laragon-mysql":
        setName("MySQL Database Server (Port 3306)");
        setType("database");
        setCategory("database");
        setDbType("mysql");
        setTarget("127.0.0.1");
        setPort("3306");
        setTimeoutVal(3000);
        break;
      case "postgres":
        setName("PostgreSQL Enterprise DB (Port 5432)");
        setType("database");
        setCategory("database");
        setDbType("postgres");
        setTarget("127.0.0.1");
        setPort("5432");
        setTimeoutVal(3000);
        break;
      case "redis":
        setName("Redis Cache Engine (Port 6379)");
        setType("database");
        setCategory("database");
        setDbType("redis");
        setTarget("127.0.0.1");
        setPort("6379");
        setTimeoutVal(3000);
        break;
      case "webapp":
        setName("Web Portal Semen Indonesia Cooperative");
        setType("http");
        setCategory("web");
        setTarget("http://localhost");
        setPort("");
        setMethod("GET");
        setExpectedStatusCode(200);
        setTimeoutVal(5000);
        break;
      case "ssh-server":
        setName("Infrastructure SSH Host (Port 22)");
        setType("tcp");
        setCategory("server");
        setTarget("127.0.0.1");
        setPort("22");
        setTimeoutVal(3000);
        break;
      case "dns":
        setName("Enterprise DNS Resolver (8.8.8.8)");
        setType("tcp");
        setCategory("network");
        setTarget("8.8.8.8");
        setPort("53");
        setTimeoutVal(3000);
        setCheckSource("cloud");
        break;
      case "hrdonline":
        setName("HRD Online Intranet (172.20.110.20)");
        setType("http");
        setCategory("web");
        setTarget("http://172.20.110.20/hrdonline");
        setPort("");
        setMethod("GET");
        setExpectedStatusCode(200);
        setTimeoutVal(5000);
        setCheckInterval(1800);
        setCheckSource("agent");
        break;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !target.trim()) return;

    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        type,
        category,
        target: target.trim(),
        port: port ? parseInt(port, 10) : undefined,
        dbType: type === "database" ? dbType : undefined,
        method: type === "http" ? method : undefined,
        expectedStatusCode: type === "http" ? expectedStatusCode : undefined,
        timeout,
        checkInterval,
        checkSource,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden my-8">
        {/* Accent Strip */}
        <div className="h-1.5 w-full bg-[#0c519d]" />

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-slate-50">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#0c519d]">
              CONFIGURATION MANAGEMENT
            </span>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight mt-0.5">
              {initialData ? "Edit Target Monitoring" : "Tambah Target Monitoring Baru"}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Konfigurasi parameter protokol dan polling cycle untuk infrastruktur Semen Indonesia Cooperative.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-800 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Preset Bar */}
        {!initialData && (
          <div className="p-4 bg-slate-50/70 border-b border-slate-200">
            <div className="flex items-center gap-2 mb-2 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-[#0c519d]" />
              <span>Template Cepat Korporat:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { id: "hrdonline", label: "🏢 HRD Online (172.20.110.20)" },
                { id: "laragon-mysql", label: "MySQL (3306)" },
                { id: "postgres", label: "PostgreSQL (5432)" },
                { id: "redis", label: "Redis (6379)" },
                { id: "webapp", label: "Web Portal HTTP" },
                { id: "ssh-server", label: "Server SSH (22)" },
                { id: "dns", label: "DNS (53)" },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => applyPreset(p.id)}
                  className={`px-2.5 py-1.5 rounded text-xs font-semibold border transition-all cursor-pointer shadow-2xs ${
                    p.id === "hrdonline"
                      ? "bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100"
                      : "bg-white hover:bg-[#0c519d] hover:text-white text-slate-700 border-slate-300"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Target Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Nama Layanan / Identitas Server <span className="text-[#fb2c36]">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Production API Gateway, Database Cluster MySQL, dll"
              className="w-full px-3.5 py-2.5 rounded-lg bg-white border border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#0c519d] text-sm shadow-2xs"
            />
          </div>

          {/* Type & Category Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Protokol Pengecekan <span className="text-[#fb2c36]">*</span>
              </label>
              <select
                value={type}
                onChange={(e) => {
                  const val = e.target.value as MonitorType;
                  setType(val);
                  if (val === "database") {
                    setCategory("database");
                    if (!port) setPort("3306");
                  } else if (val === "http") {
                    setCategory("web");
                    setPort("");
                  } else if (val === "tcp") {
                    setCategory("server");
                  }
                }}
                className="w-full px-3.5 py-2.5 rounded-lg bg-white border border-slate-300 text-slate-900 focus:outline-none focus:border-[#0c519d] text-sm cursor-pointer shadow-2xs"
              >
                <option value="http">HTTP / HTTPS (Web & REST API)</option>
                <option value="database">Database (MySQL, Postgres, Redis, Mongo)</option>
                <option value="tcp">TCP Socket / Port Server (SSH, Custom)</option>
                <option value="ping">DNS / Host Resolution Ping</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Kategori Infrastruktur
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as MonitorCategory)}
                className="w-full px-3.5 py-2.5 rounded-lg bg-white border border-slate-300 text-slate-900 focus:outline-none focus:border-[#0c519d] text-sm cursor-pointer shadow-2xs"
              >
                <option value="web">Web Application</option>
                <option value="api">API Endpoint / Microservice</option>
                <option value="database">Database Engine</option>
                <option value="server">Infrastructure Server</option>
                <option value="network">Network & DNS</option>
              </select>
            </div>
          </div>

          {/* Specific DB settings */}
          {type === "database" && (
            <div className="p-4 rounded-lg bg-blue-50/60 border border-blue-200 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#0c519d] uppercase tracking-wider mb-1.5">
                  Engine Database
                </label>
                <select
                  value={dbType}
                  onChange={(e) => {
                    const dt = e.target.value as DatabaseType;
                    setDbType(dt);
                    if (dt === "mysql") setPort("3306");
                    if (dt === "postgres") setPort("5432");
                    if (dt === "redis") setPort("6379");
                    if (dt === "mongodb") setPort("27017");
                  }}
                  className="w-full px-3 py-2 rounded-lg bg-white border border-blue-200 text-slate-900 text-sm"
                >
                  <option value="mysql">MySQL / MariaDB (Port 3306)</option>
                  <option value="postgres">PostgreSQL (Port 5432)</option>
                  <option value="redis">Redis Server (Port 6379)</option>
                  <option value="mongodb">MongoDB (Port 27017)</option>
                  <option value="generic">Database Lainnya (TCP Port)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#0c519d] uppercase tracking-wider mb-1.5">
                  Port Database
                </label>
                <input
                  type="number"
                  value={port}
                  onChange={(e) => setPort(e.target.value)}
                  placeholder="3306"
                  className="w-full px-3 py-2 rounded-lg bg-white border border-blue-200 text-slate-900 text-sm font-mono"
                />
              </div>
            </div>
          )}

          {/* Target Host or URL */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className={type === "tcp" ? "sm:col-span-2" : "sm:col-span-3"}>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                {type === "http" ? "Target URL (HTTP / HTTPS)" : "Host / IP Address"} <span className="text-[#fb2c36]">*</span>
              </label>
              <input
                type="text"
                required
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                placeholder={type === "http" ? "https://api.domain.co.id atau http://localhost:80" : "127.0.0.1 atau server.local"}
                className="w-full px-3.5 py-2.5 rounded-lg bg-white border border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#0c519d] font-mono text-sm shadow-2xs"
              />
            </div>

            {type === "tcp" && (
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Port Server <span className="text-[#fb2c36]">*</span>
                </label>
                <input
                  type="number"
                  required
                  value={port}
                  onChange={(e) => setPort(e.target.value)}
                  placeholder="80, 443, 22"
                  className="w-full px-3.5 py-2.5 rounded-lg bg-white border border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#0c519d] font-mono text-sm shadow-2xs"
                />
              </div>
            )}
          </div>

          {/* Check Source (Cloud vs Agent Intranet) */}
          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Sumber Pemeriksaan (Monitoring Origin)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <label
                onClick={() => setCheckSource("cloud")}
                className={`flex items-start gap-2.5 p-3 rounded-lg border cursor-pointer transition-all ${
                  checkSource === "cloud"
                    ? "bg-white border-[#0c519d] ring-1 ring-[#0c519d]"
                    : "bg-white/60 border-slate-200 hover:bg-white"
                }`}
              >
                <input
                  type="radio"
                  name="checkSource"
                  checked={checkSource === "cloud"}
                  onChange={() => setCheckSource("cloud")}
                  className="mt-0.5"
                />
                <div>
                  <span className="text-xs font-bold text-slate-800 block">🌐 Cloud / Langsung</span>
                  <span className="text-[11px] text-slate-500 block leading-relaxed">
                    Diperiksa langsung oleh dashboard. Cocok untuk website publik / domain internet.
                  </span>
                </div>
              </label>

              <label
                onClick={() => setCheckSource("agent")}
                className={`flex items-start gap-2.5 p-3 rounded-lg border cursor-pointer transition-all ${
                  checkSource === "agent"
                    ? "bg-white border-amber-500 ring-1 ring-amber-500"
                    : "bg-white/60 border-slate-200 hover:bg-white"
                }`}
              >
                <input
                  type="radio"
                  name="checkSource"
                  checked={checkSource === "agent"}
                  onChange={() => setCheckSource("agent")}
                  className="mt-0.5"
                />
                <div>
                  <span className="text-xs font-bold text-amber-800 block">🏢 Agent Intranet KWSG</span>
                  <span className="text-[11px] text-slate-500 block leading-relaxed">
                    Dipantau script lokal kantor. Cocok untuk IP privat (172.20.x.x / 192.168.x.x).
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* HTTP options */}
          {type === "http" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-lg bg-slate-50 border border-slate-200">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  HTTP Request Method
                </label>
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value as "GET" | "POST" | "HEAD")}
                  className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 text-sm"
                >
                  <option value="GET">GET</option>
                  <option value="HEAD">HEAD</option>
                  <option value="POST">POST</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  Expected Status Code
                </label>
                <input
                  type="number"
                  value={expectedStatusCode}
                  onChange={(e) => setExpectedStatusCode(parseInt(e.target.value, 10))}
                  placeholder="200"
                  className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 text-sm font-mono"
                />
              </div>
            </div>
          )}

          {/* Timing options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Batas Timeout (ms)
              </label>
              <input
                type="number"
                value={timeout}
                onChange={(e) => setTimeoutVal(parseInt(e.target.value, 10))}
                min={500}
                max={30000}
                step={500}
                className="w-full px-3.5 py-2.5 rounded-lg bg-white border border-slate-300 text-slate-900 text-sm font-mono shadow-2xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Interval Polling (Detik)
              </label>
              <input
                type="number"
                value={checkInterval}
                onChange={(e) => setCheckInterval(parseInt(e.target.value, 10))}
                min={10}
                max={86400}
                className="w-full px-3.5 py-2.5 rounded-lg bg-white border border-slate-300 text-slate-900 text-sm font-mono shadow-2xs"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">Default: 1800 detik (30 Menit)</span>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 text-xs font-extrabold uppercase tracking-wider text-white bg-[#0c519d] hover:bg-[#0c519d]/90 rounded-lg shadow-md shadow-[#0c519d]/30 transition-all disabled:opacity-50 cursor-pointer"
            >
              {saving ? "Menyimpan..." : initialData ? "Simpan Perubahan" : "Tambahkan Target"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
