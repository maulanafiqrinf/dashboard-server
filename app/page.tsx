"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Monitor, Incident, SystemStats } from "@/types/monitor";
import { MonitorCard } from "@/components/MonitorCard";
import { MonitorTableView } from "@/components/MonitorTableView";
import { AddEditModal } from "@/components/AddEditModal";
import { IncidentHistoryModal } from "@/components/IncidentHistoryModal";
import { IntranetAgentModal } from "@/components/IntranetAgentModal";
import { StatsSummary } from "@/components/StatsSummary";
import { LoginView } from "@/components/LoginView";
import { auth } from "@/lib/firebase-client";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { isAuthorizedEmail } from "@/lib/auth-config";
import { 
  Plus, 
  RotateCw, 
  History, 
  Search, 
  Volume2, 
  VolumeX, 
  Activity,
  Layers,
  LayoutGrid,
  List,
  ArrowUpDown,
  Download,
  Clock,
  Shield,
  Server,
  Globe,
  Database,
  LogOut,
  UserCheck,
  Radio
} from "lucide-react";

interface AuthUser {
  email: string;
  displayName?: string;
  photoURL?: string;
}

export default function DashboardPage() {
  // Auth state
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [authChecking, setAuthChecking] = useState(true);

  // Monitors & Stats
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [stats, setStats] = useState<SystemStats>({
    total: 0,
    operational: 0,
    degraded: 0,
    down: 0,
    avgLatency: 0,
    uptimeAverage: 100,
  });
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [dbStatus, setDbStatus] = useState<{ connected: boolean; message: string; projectId?: string } | null>(null);
  const [checkingDb, setCheckingDb] = useState(false);

  // View & Filter State
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"default" | "down-first" | "latency-desc" | "name-asc" | "uptime-desc">("down-first");
  
  // Default polling interval: 30 minutes = 1800 seconds!
  const [autoRefreshSec, setAutoRefreshSec] = useState<number>(1800);
  const [checkingAll, setCheckingAll] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Modals
  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [editingMonitor, setEditingMonitor] = useState<Monitor | null>(null);
  const [isIncidentOpen, setIsIncidentOpen] = useState(false);
  const [isAgentModalOpen, setIsAgentModalOpen] = useState(false);

  // Live Clock
  const [currentTime, setCurrentTime] = useState<string>("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString("id-ID", { hour12: false }) + " WIB");
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Listen to Firebase Auth state or local session
  useEffect(() => {
    // Check localStorage cache first
    try {
      const savedUser = localStorage.getItem("sic_auth_user");
      if (savedUser) {
        const parsed: AuthUser = JSON.parse(savedUser);
        if (isAuthorizedEmail(parsed.email)) {
          setCurrentUser(parsed);
          setAuthChecking(false);
          return;
        }
      }
    } catch {
      // Ignored
    }

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser && firebaseUser.email && isAuthorizedEmail(firebaseUser.email)) {
        const u: AuthUser = {
          email: firebaseUser.email,
          displayName: firebaseUser.displayName || firebaseUser.email,
          photoURL: firebaseUser.photoURL || undefined,
        };
        setCurrentUser(u);
        try {
          localStorage.setItem("sic_auth_user", JSON.stringify(u));
        } catch {}
      } else {
        setCurrentUser(null);
      }
      setAuthChecking(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLoginSuccess = (user: AuthUser) => {
    setCurrentUser(user);
    try {
      localStorage.setItem("sic_auth_user", JSON.stringify(user));
    } catch {}
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch {}
    try {
      localStorage.removeItem("sic_auth_user");
    } catch {}
    setCurrentUser(null);
  };

  // Audio alert chime
  const playAlertSound = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(440, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.3);
    } catch {
      // Audio not permitted
    }
  }, [soundEnabled]);

  // Load monitors
  const fetchMonitors = useCallback(async () => {
    try {
      const res = await fetch("/api/monitors", { cache: "no-store" });
      const data = await res.json();
      if (data.success) {
        setMonitors(data.data);
        if (data.stats) setStats(data.stats);
      }
    } catch (err) {
      console.error("Failed to fetch monitors:", err);
    }
  }, []);

  // Load incidents
  const fetchIncidents = useCallback(async () => {
    try {
      const res = await fetch("/api/incidents", { cache: "no-store" });
      const data = await res.json();
      if (data.success) {
        setIncidents(data.data);
      }
    } catch (err) {
      console.error("Failed to fetch incidents:", err);
    }
  }, []);

  // Check DB status
  const fetchDbStatus = useCallback(async () => {
    setCheckingDb(true);
    try {
      const res = await fetch("/api/database-status", { cache: "no-store" });
      const data = await res.json();
      setDbStatus({
        connected: data.connected,
        message: data.message,
        projectId: data.projectId,
      });
    } catch {
      setDbStatus({
        connected: false,
        message: "Gagal menghubungkan ke database",
      });
    } finally {
      setCheckingDb(false);
    }
  }, []);

  // Check All Monitors
  const handleCheckAll = async () => {
    setCheckingAll(true);
    try {
      const res = await fetch("/api/check", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setMonitors(data.data);
        if (data.stats) {
          setStats(data.stats);
          if (data.stats.down > 0) {
            playAlertSound();
          }
        }
        await fetchIncidents();
      }
    } catch (err) {
      console.error("Failed to check all monitors:", err);
    } finally {
      setCheckingAll(false);
    }
  };

  // Check Single Monitor
  const handleCheckSingle = async (id: string) => {
    try {
      const res = await fetch(`/api/check/${id}`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setMonitors((prev) =>
          prev.map((m) => (m.id === id ? data.data : m))
        );
        if (data.data.status === "down") {
          playAlertSound();
        }
        await fetchIncidents();
      }
    } catch (err) {
      console.error("Failed to check single monitor:", err);
    }
  };

  // Save Monitor
  const handleSaveMonitor = async (formData: Partial<Monitor>) => {
    const adminEmail = currentUser?.email || "";
    if (editingMonitor) {
      const res = await fetch(`/api/monitors/${editingMonitor.id}`, {
        method: "PATCH",
        headers: { 
          "Content-Type": "application/json",
          "x-admin-email": adminEmail
        },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.success) {
        setMonitors((prev) =>
          prev.map((m) => (m.id === editingMonitor.id ? data.data : m))
        );
        handleCheckSingle(editingMonitor.id);
      } else {
        alert(data.error || "Gagal memperbarui monitor");
      }
    } else {
      const res = await fetch("/api/monitors", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-admin-email": adminEmail
        },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.success) {
        setMonitors((prev) => [...prev, data.data]);
        handleCheckSingle(data.data.id);
      } else {
        alert(data.error || "Gagal menambah target monitor");
      }
    }
  };

  // Delete Monitor
  const handleDeleteMonitor = async (id: string) => {
    if (!confirm("Konfirmasi penghapusan target monitor dari sistem Semen Indonesia Cooperative?")) return;
    try {
      const res = await fetch(`/api/monitors/${id}`, { 
        method: "DELETE",
        headers: {
          "x-admin-email": currentUser?.email || ""
        }
      });
      const data = await res.json();
      if (data.success) {
        setMonitors((prev) => prev.filter((m) => m.id !== id));
      } else {
        alert(data.error || "Gagal menghapus monitor");
      }
    } catch (err) {
      console.error("Failed to delete monitor:", err);
    }
  };

  // Toggle Pause/Resume
  const handleToggleActive = async (id: string, active: boolean) => {
    try {
      const res = await fetch(`/api/monitors/${id}`, {
        method: "PATCH",
        headers: { 
          "Content-Type": "application/json",
          "x-admin-email": currentUser?.email || ""
        },
        body: JSON.stringify({ active }),
      });
      const data = await res.json();
      if (data.success) {
        setMonitors((prev) =>
          prev.map((m) => (m.id === id ? data.data : m))
        );
      }
    } catch (err) {
      console.error("Failed to toggle monitor:", err);
    }
  };

  // Export JSON Report
  const handleExportJSON = () => {
    const report = {
      title: "Semen Indonesia Cooperative - Infrastructure Health Report",
      generatedAt: new Date().toISOString(),
      generatedBy: currentUser?.email,
      stats,
      monitors,
      incidents,
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `semen-indonesia-report-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Initial Load when logged in
  useEffect(() => {
    if (currentUser) {
      fetchMonitors();
      fetchIncidents();
      fetchDbStatus();
    }
  }, [currentUser, fetchMonitors, fetchIncidents, fetchDbStatus]);

  // Auto-refresh interval (Default 30 minutes = 1800s)
  useEffect(() => {
    if (!currentUser || autoRefreshSec <= 0) return;
    const interval = setInterval(() => {
      handleCheckAll();
    }, autoRefreshSec * 1000);
    return () => clearInterval(interval);
  }, [currentUser, autoRefreshSec]);

  // Filtering & Sorting
  const filteredAndSortedMonitors = monitors
    .filter((m) => {
      const matchesSearch =
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.target.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.port && String(m.port).includes(searchQuery)) ||
        (m.dbType && m.dbType.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCategory =
        selectedCategory === "all" || m.category === selectedCategory;

      const matchesStatus =
        selectedStatus === "all" ||
        (selectedStatus === "active" && m.active) ||
        (selectedStatus === "paused" && !m.active) ||
        m.status === selectedStatus;

      return matchesSearch && matchesCategory && matchesStatus;
    })
    .sort((a, b) => {
      if (sortBy === "down-first") {
        const order: Record<string, number> = { down: 0, degraded: 1, pending: 2, operational: 3 };
        return (order[a.status] ?? 4) - (order[b.status] ?? 4);
      }
      if (sortBy === "latency-desc") {
        return b.latency - a.latency;
      }
      if (sortBy === "name-asc") {
        return a.name.localeCompare(b.name);
      }
      if (sortBy === "uptime-desc") {
        return (b.uptimePercentage ?? 100) - (a.uptimePercentage ?? 100);
      }
      return 0;
    });

  const ongoingIncidentsCount = incidents.filter((i) => i.status === "ongoing").length;

  // Render Login screen if not authenticated
  if (authChecking) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-600 font-semibold text-sm">
          <RotateCw className="w-5 h-5 animate-spin text-[#0c519d]" />
          <span>Memvalidasi otorisasi Semen Indonesia Cooperative...</span>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <main className="min-h-screen bg-[#f8fafc] text-slate-900 selection:bg-[#0c519d] selection:text-white corp-grid-bg">
      {/* Top Corporate Status Bar */}
      <div className="bg-white border-b border-slate-200 text-xs py-2 px-4 sm:px-6 lg:px-8 flex items-center justify-between font-mono shadow-2xs">
        <div className="flex items-center gap-4 text-slate-600">
          <span className="flex items-center gap-2 font-bold text-[#0c519d]">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            SEMEN INDONESIA COOPERATIVE • NOC COMMAND CENTER
          </span>
          <span className="hidden md:inline text-slate-300">|</span>
          <span className="hidden md:inline text-slate-500 font-medium">PROJECT: apt-footing-392911</span>
        </div>

        <div className="flex items-center gap-4 text-slate-600">
          <span className="flex items-center gap-1.5 font-bold text-slate-700">
            <Clock className="w-3.5 h-3.5 text-[#0c519d]" />
            {currentTime}
          </span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Corporate Header with User Profile */}
        <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 pb-6 border-b border-slate-200 bg-white p-6 rounded-2xl border shadow-xs">
          <div className="flex items-center gap-4">
            <div className="p-3.5 rounded-2xl bg-[#0c519d] text-white shadow-lg shadow-[#0c519d]/25 border border-blue-400/30">
              <Shield className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 uppercase font-sans">
                  Semen Indonesia Cooperative
                </h1>
                <span className="px-2.5 py-0.5 text-[10px] font-black rounded-md bg-[#0c519d] text-white tracking-wider uppercase shadow-xs">
                  ENTERPRISE
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 font-medium">
                Pusat Pemantauan Infrastruktur Server, Database & Web Service Terintegrasi
              </p>
            </div>
          </div>

          {/* Action Header Tools & Logged In Profile */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* User Profile Badge */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-xs">
              <div className="w-6 h-6 rounded-full bg-[#0c519d] text-white flex items-center justify-center font-bold text-[10px] uppercase">
                {currentUser.displayName ? currentUser.displayName.charAt(0) : "U"}
              </div>
              <div className="text-left">
                <span className="text-[10px] font-bold text-slate-400 block uppercase leading-tight">Admin</span>
                <span className="font-mono text-xs text-slate-800 font-bold">{currentUser.email}</span>
              </div>
              <button
                onClick={handleLogout}
                className="ml-1 p-1 text-slate-400 hover:text-[#fb2c36] rounded-md transition-colors cursor-pointer"
                title="Keluar (Logout)"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Audio Toggle */}
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2 rounded-xl border text-xs font-semibold transition-colors cursor-pointer ${
                soundEnabled
                  ? "bg-slate-100 border-slate-300 text-slate-800"
                  : "bg-slate-50 border-slate-200 text-slate-400"
              }`}
              title={soundEnabled ? "Audio Alarm Aktif" : "Audio Alarm Senyap"}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-600" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
            </button>

            {/* Polling Interval Dropdown (Default 30 Menit!) */}
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 text-xs text-slate-700 font-semibold shadow-2xs">
              <span className="text-slate-400 font-bold hidden sm:inline text-[10px] uppercase">Auto-Refresh:</span>
              <select
                value={autoRefreshSec}
                onChange={(e) => setAutoRefreshSec(Number(e.target.value))}
                className="bg-transparent text-slate-900 font-bold focus:outline-none cursor-pointer text-xs"
              >
                <option value={1800}>Tiap 30 Menit (Default)</option>
                <option value={900}>Tiap 15 Menit</option>
                <option value={300}>Tiap 5 Menit</option>
                <option value={3600}>Tiap 1 Jam</option>
                <option value={0}>Nonaktif (Manual)</option>
              </select>
            </div>

            {/* Incident History Button */}
            <button
              onClick={() => setIsIncidentOpen(true)}
              className={`relative inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer shadow-2xs ${
                ongoingIncidentsCount > 0
                  ? "bg-[#fb2c36]/10 border-[#fb2c36] text-[#fb2c36] hover:bg-[#fb2c36]/20"
                  : "bg-white hover:bg-slate-50 text-slate-800 border-slate-300"
              }`}
            >
              <History className="w-4 h-4" />
              <span>LOG INSIDEN</span>
              {ongoingIncidentsCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-[#fb2c36] text-white animate-pulse">
                  {ongoingIncidentsCount}
                </span>
              )}
            </button>

            {/* Export JSON Report */}
            <button
              onClick={handleExportJSON}
              className="p-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 hover:text-slate-900 transition-colors cursor-pointer shadow-2xs"
              title="Ekspor Laporan JSON"
            >
              <Download className="w-4 h-4" />
            </button>

            {/* Check All Now Button */}
            <button
              onClick={handleCheckAll}
              disabled={checkingAll}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold uppercase tracking-wider bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 transition-all disabled:opacity-50 cursor-pointer shadow-xs"
            >
              <RotateCw className={`w-3.5 h-3.5 ${checkingAll ? "animate-spin text-[#0c519d]" : ""}`} />
              <span>{checkingAll ? "MEMERIKSA..." : "PERIKSA SEMUA"}</span>
            </button>

            {/* Agent Intranet Button */}
            <button
              onClick={() => setIsAgentModalOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-extrabold uppercase tracking-wider border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 transition-colors cursor-pointer shadow-2xs"
              title="Panduan & Script Pemantau Server Intranet KWSG (IP Privat 172.20.x.x)"
            >
              <Radio className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
              <span>AGENT INTRANET</span>
            </button>

            {/* Add Target Button (#0c519d) */}
            <button
              onClick={() => {
                setEditingMonitor(null);
                setIsAddEditOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold uppercase tracking-wider bg-[#0c519d] hover:bg-[#0c519d]/90 text-white shadow-md shadow-[#0c519d]/30 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>TAMBAH TARGET</span>
            </button>
          </div>
        </header>

        {/* Executive Stats Summary Banner (White) */}
        <StatsSummary
          stats={stats}
          dbStatus={dbStatus}
          checkingDb={checkingDb}
          onRefreshDb={fetchDbStatus}
          onFilterDownOnly={() => {
            setSelectedStatus("down");
            setSortBy("down-first");
          }}
        />

        {/* Operations Control Toolbar (White Card) */}
        <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-4 p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          {/* Search Field */}
          <div className="relative flex-1 max-w-lg">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari target, IP address, port (misal 3306, 80), atau nama server..."
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 text-xs font-mono focus:outline-none focus:border-[#0c519d] focus:bg-white transition-all shadow-2xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-800"
              >
                Clear
              </button>
            )}
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 xl:pb-0 scrollbar-none">
            {[
              { id: "all", label: "SEMUA", icon: Layers },
              { id: "web", label: "WEB", icon: Globe },
              { id: "database", label: "DATABASE", icon: Database },
              { id: "api", label: "API", icon: Activity },
              { id: "server", label: "SERVER", icon: Server },
            ].map((tab) => {
              const active = selectedCategory === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setSelectedCategory(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                    active
                      ? "bg-[#0c519d] text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200 border border-slate-200"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Filters, Sorting & View Toggle */}
          <div className="flex flex-wrap items-center gap-2 self-end xl:self-auto">
            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold focus:outline-none cursor-pointer"
            >
              <option value="all">Semua Status</option>
              <option value="operational">🟢 Operational</option>
              <option value="degraded">🟠 Degraded</option>
              <option value="down">🔴 Down Saja</option>
              <option value="paused">⚪ Paused</option>
            </select>

            {/* Sorting */}
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-50 border border-slate-200 text-xs">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as "default" | "down-first" | "latency-desc" | "name-asc" | "uptime-desc")}
                className="bg-transparent text-slate-800 font-bold focus:outline-none cursor-pointer"
              >
                <option value="down-first">Urutkan: Kritis (Down)</option>
                <option value="latency-desc">Urutkan: Latensi Tinggi</option>
                <option value="name-asc">Urutkan: Nama (A-Z)</option>
                <option value="uptime-desc">Urutkan: Uptime SLA</option>
              </select>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center rounded-lg bg-slate-100 p-1 border border-slate-200">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                  viewMode === "grid" ? "bg-white text-[#0c519d] shadow-2xs font-bold" : "text-slate-500 hover:text-slate-900"
                }`}
                title="Tampilan Grid Card"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode("table")}
                className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                  viewMode === "table" ? "bg-white text-[#0c519d] shadow-2xs font-bold" : "text-slate-500 hover:text-slate-900"
                }`}
                title="Tampilan Tabel Rinci (NOC)"
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Content Section: Grid or Table */}
        {filteredAndSortedMonitors.length === 0 ? (
          <div className="text-center py-16 px-4 rounded-2xl bg-white border border-dashed border-slate-300">
            <Server className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <h3 className="font-bold text-slate-800 text-base">Tidak Ada Target yang Sesuai Filter</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Tidak ditemukan server atau port yang cocok dengan kriteria pencarian saat ini.
            </p>
            <button
              onClick={() => {
                setSearchQuery("");
                setSelectedCategory("all");
                setSelectedStatus("all");
              }}
              className="mt-4 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider bg-[#0c519d] hover:bg-[#0c519d]/90 text-white transition-colors"
            >
              Reset Filter
            </button>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredAndSortedMonitors.map((monitor) => (
              <MonitorCard
                key={monitor.id}
                monitor={monitor}
                onCheck={handleCheckSingle}
                onEdit={(m) => {
                  setEditingMonitor(m);
                  setIsAddEditOpen(true);
                }}
                onDelete={handleDeleteMonitor}
                onToggleActive={handleToggleActive}
              />
            ))}
          </div>
        ) : (
          <MonitorTableView
            monitors={filteredAndSortedMonitors}
            onCheck={handleCheckSingle}
            onEdit={(m) => {
              setEditingMonitor(m);
              setIsAddEditOpen(true);
            }}
            onDelete={handleDeleteMonitor}
            onToggleActive={handleToggleActive}
          />
        )}

        {/* Corporate Footer */}
        <footer className="pt-8 pb-4 border-t border-slate-200 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-4 font-mono">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#0c519d]"></span>
            <span>Semen Indonesia Cooperative • Enterprise Infrastructure Monitor</span>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span>Firebase: apt-footing-392911</span>
            <span>Local Time: {currentTime}</span>
          </div>
        </footer>
      </div>

      {/* Modals */}
      <AddEditModal
        isOpen={isAddEditOpen}
        onClose={() => {
          setIsAddEditOpen(false);
          setEditingMonitor(null);
        }}
        onSave={handleSaveMonitor}
        initialData={editingMonitor}
      />

      <IncidentHistoryModal
        isOpen={isIncidentOpen}
        onClose={() => setIsIncidentOpen(false)}
        incidents={incidents}
      />

      <IntranetAgentModal
        isOpen={isAgentModalOpen}
        onClose={() => setIsAgentModalOpen(false)}
        onReportSimulated={fetchMonitors}
      />
    </main>
  );
}
