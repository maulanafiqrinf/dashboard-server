import { adminDb } from "./firebase-admin";
import { Monitor, Incident, SystemStats, CheckHistoryItem, MonitorStatus, MonitorCategory, MonitorType } from "@/types/monitor";
import { runMonitorCheck } from "./checker";
import fs from "fs";
import path from "path";
import os from "os";

const MONITORS_COLLECTION = "monitors";
const INCIDENTS_COLLECTION = "incidents";

const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const DATA_DIR = isServerless ? path.join(os.tmpdir(), "dashboard-data") : path.join(process.cwd(), "data");
const LOCAL_MONITORS_FILE = path.join(DATA_DIR, "monitors.json");
const LOCAL_INCIDENTS_FILE = path.join(DATA_DIR, "incidents.json");

let firestoreAvailable: boolean | null = null;
let inMemoryMonitors: Monitor[] = [];
let inMemoryIncidents: Incident[] = [];

function ensureDataDir() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch {
    // Ignore read-only errors on serverless
  }
}

function readLocalMonitors(): Monitor[] {
  if (inMemoryMonitors.length > 0) {
    return inMemoryMonitors;
  }
  try {
    ensureDataDir();
    if (fs.existsSync(LOCAL_MONITORS_FILE)) {
      const raw = fs.readFileSync(LOCAL_MONITORS_FILE, "utf-8");
      inMemoryMonitors = JSON.parse(raw);
      return inMemoryMonitors;
    }
  } catch {
    // Fall back to inMemory
  }
  return inMemoryMonitors;
}

function writeLocalMonitors(monitors: Monitor[]) {
  inMemoryMonitors = monitors;
  try {
    ensureDataDir();
    fs.writeFileSync(LOCAL_MONITORS_FILE, JSON.stringify(monitors, null, 2), "utf-8");
  } catch {
    // Read-only filesystem on Vercel, inMemoryMonitors is used safely
  }
}

function readLocalIncidents(): Incident[] {
  if (inMemoryIncidents.length > 0) {
    return inMemoryIncidents;
  }
  try {
    ensureDataDir();
    if (fs.existsSync(LOCAL_INCIDENTS_FILE)) {
      const raw = fs.readFileSync(LOCAL_INCIDENTS_FILE, "utf-8");
      inMemoryIncidents = JSON.parse(raw);
      return inMemoryIncidents;
    }
  } catch {
    // Fall back
  }
  return inMemoryIncidents;
}

function writeLocalIncidents(incidents: Incident[]) {
  inMemoryIncidents = incidents;
  try {
    ensureDataDir();
    fs.writeFileSync(LOCAL_INCIDENTS_FILE, JSON.stringify(incidents, null, 2), "utf-8");
  } catch {
    // Read-only filesystem on Vercel, inMemoryIncidents is used safely
  }
}

const INITIAL_MONITORS: Omit<Monitor, "id">[] = [
  {
    name: "Laragon Local MySQL Database",
    type: "database",
    category: "database",
    target: "127.0.0.1",
    port: 3306,
    dbType: "mysql",
    timeout: 3000,
    checkInterval: 1800,
    status: "pending",
    latency: 0,
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    history: [],
  },
  {
    name: "Laragon Local Apache/Nginx Web Server",
    type: "http",
    category: "web",
    target: "http://localhost",
    method: "GET",
    expectedStatusCode: 200,
    timeout: 3000,
    checkInterval: 1800,
    status: "pending",
    latency: 0,
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    history: [],
  },
  {
    name: "Cloudflare DNS (1.1.1.1)",
    type: "tcp",
    category: "network",
    target: "1.1.1.1",
    port: 53,
    timeout: 3000,
    checkInterval: 1800,
    status: "pending",
    latency: 0,
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    history: [],
  },
  {
    name: "Google Public DNS (8.8.8.8)",
    type: "tcp",
    category: "network",
    target: "8.8.8.8",
    port: 53,
    timeout: 3000,
    checkInterval: 1800,
    status: "pending",
    latency: 0,
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    history: [],
  },
  {
    name: "GitHub Public REST API",
    type: "http",
    category: "api",
    target: "https://api.github.com",
    method: "GET",
    expectedStatusCode: 200,
    timeout: 5000,
    checkInterval: 1800,
    status: "pending",
    latency: 0,
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    history: [],
  },
  {
    name: "Simulasi Server Mati (Port Tertutup)",
    type: "tcp",
    category: "server",
    target: "127.0.0.1",
    port: 19876,
    timeout: 2000,
    checkInterval: 1800,
    status: "pending",
    latency: 0,
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    history: [],
  },
];

export async function checkFirestoreConnectivity(): Promise<{ connected: boolean; message: string }> {
  try {
    const testDoc = await adminDb.collection(MONITORS_COLLECTION).limit(1).get();
    firestoreAvailable = true;
    return { connected: true, message: `Firebase Firestore connected (${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "apt-footing-392911"})` };
  } catch (err: unknown) {
    firestoreAvailable = false;
    const msg = err instanceof Error ? err.message : String(err);
    return {
      connected: false,
      message: `Database Firestore belum dibuat di Firebase Console (${msg.slice(0, 100)}). Menggunakan penyimpanan persisten lokal.`,
    };
  }
}

/**
 * Seed initial monitors if collection / local storage is empty
 */
export async function seedIfEmpty(): Promise<void> {
  const isFs = await isFirestoreReady();

  if (isFs) {
    try {
      const snapshot = await adminDb.collection(MONITORS_COLLECTION).limit(1).get();
      if (snapshot.empty) {
        const batch = adminDb.batch();
        for (const item of INITIAL_MONITORS) {
          const docRef = adminDb.collection(MONITORS_COLLECTION).doc();
          batch.set(docRef, { ...item, id: docRef.id });
        }
        await batch.commit();
      }
      return;
    } catch (error) {
      console.warn("Firestore seed failed, falling back to local:", error);
      firestoreAvailable = false;
    }
  }

  // Local fallback seed
  const current = readLocalMonitors();
  if (current.length === 0) {
    const seeded = INITIAL_MONITORS.map((m, index) => ({
      ...m,
      id: `mon_${Date.now()}_${index}`,
    }));
    writeLocalMonitors(seeded);
  }
}

async function isFirestoreReady(): Promise<boolean> {
  if (firestoreAvailable === null) {
    const res = await checkFirestoreConnectivity();
    return res.connected;
  }
  return firestoreAvailable;
}

/**
 * Get all monitors
 */
export async function getAllMonitors(): Promise<Monitor[]> {
  await seedIfEmpty();

  if (await isFirestoreReady()) {
    try {
      const snapshot = await adminDb.collection(MONITORS_COLLECTION).get();
      const list = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Monitor[];
      return list.sort((a, b) => (a.createdAt || "").localeCompare(b.createdAt || ""));
    } catch (err) {
      console.warn("Error getting monitors from Firestore, reading local:", err);
      firestoreAvailable = false;
    }
  }

  return readLocalMonitors();
}

/**
 * Get monitor by ID
 */
export async function getMonitorById(id: string): Promise<Monitor | null> {
  if (await isFirestoreReady()) {
    try {
      const doc = await adminDb.collection(MONITORS_COLLECTION).doc(id).get();
      if (doc.exists) {
        return { id: doc.id, ...doc.data() } as Monitor;
      }
    } catch (err) {
      console.warn("Error getting monitor from Firestore:", err);
      firestoreAvailable = false;
    }
  }

  const list = readLocalMonitors();
  return list.find((m) => m.id === id) || null;
}

function stripUndefined<T extends object>(obj: T): T {
  const cleaned: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) {
      cleaned[k] = v;
    }
  }
  return cleaned as T;
}

/**
 * Create a new monitor
 */
export async function createMonitor(data: Omit<Monitor, "id" | "status" | "latency" | "createdAt" | "updatedAt">): Promise<Monitor> {
  const now = new Date().toISOString();

  if (await isFirestoreReady()) {
    try {
      const docRef = adminDb.collection(MONITORS_COLLECTION).doc();
      const newMonitor: Monitor = {
        ...data,
        id: docRef.id,
        status: "pending",
        latency: 0,
        active: true,
        history: [],
        createdAt: now,
        updatedAt: now,
      };
      await docRef.set(stripUndefined(newMonitor));
      return newMonitor;
    } catch (err) {
      console.warn("Error creating in Firestore, using local:", err);
      firestoreAvailable = false;
    }
  }

  const list = readLocalMonitors();
  const newMonitor: Monitor = {
    ...data,
    id: `mon_${Date.now()}`,
    status: "pending",
    latency: 0,
    active: true,
    history: [],
    createdAt: now,
    updatedAt: now,
  };
  list.push(newMonitor);
  writeLocalMonitors(list);
  return newMonitor;
}

/**
 * Update monitor
 */
export async function updateMonitor(id: string, data: Partial<Monitor>): Promise<Monitor | null> {
  const now = new Date().toISOString();

  if (await isFirestoreReady()) {
    try {
      const docRef = adminDb.collection(MONITORS_COLLECTION).doc(id);
      const doc = await docRef.get();
      if (doc.exists) {
        await docRef.update(stripUndefined({ ...data, updatedAt: now }));
        const fresh = await docRef.get();
        return { id: fresh.id, ...fresh.data() } as Monitor;
      }
    } catch (err) {
      console.warn("Error updating in Firestore, using local:", err);
      firestoreAvailable = false;
    }
  }

  const list = readLocalMonitors();
  const idx = list.findIndex((m) => m.id === id);
  if (idx === -1) return null;

  list[idx] = {
    ...list[idx],
    ...data,
    updatedAt: now,
  };
  writeLocalMonitors(list);
  return list[idx];
}

/**
 * Delete monitor
 */
export async function deleteMonitor(id: string): Promise<boolean> {
  if (await isFirestoreReady()) {
    try {
      await adminDb.collection(MONITORS_COLLECTION).doc(id).delete();
      return true;
    } catch (err) {
      console.warn("Error deleting in Firestore, using local:", err);
      firestoreAvailable = false;
    }
  }

  const list = readLocalMonitors();
  const filtered = list.filter((m) => m.id !== id);
  writeLocalMonitors(filtered);
  return true;
}

function computeUptime(history: CheckHistoryItem[]): number {
  if (!history || history.length === 0) return 100;
  const evaluated = history.filter((h) => h.status !== "pending");
  if (evaluated.length === 0) return 100;
  const upCount = evaluated.filter((h) => h.status === "operational" || h.status === "degraded").length;
  return Math.round((upCount / evaluated.length) * 1000) / 10;
}

/**
 * Check single monitor and update record + incidents
 */
export async function checkAndUpdateMonitor(id: string): Promise<Monitor | null> {
  const monitor = await getMonitorById(id);
  if (!monitor) return null;

  if (!monitor.active) {
    return monitor;
  }

  const result = await runMonitorCheck(monitor);
  const now = new Date().toISOString();

  const existingHistory = monitor.history || [];
  const newHistoryItem: CheckHistoryItem = {
    timestamp: now,
    status: result.status,
    latency: result.latency,
    error: result.error,
    statusCode: result.statusCode,
  };
  const updatedHistory = [...existingHistory.slice(-29), newHistoryItem];
  const uptimePercentage = computeUptime(updatedHistory);

  const prevStatus = monitor.status;
  const newStatus = result.status;

  // Handle incidents
  if (prevStatus !== "down" && newStatus === "down") {
    await recordIncidentStart(monitor.id, monitor.name, result.error || "Layanan tidak merespons", now);
  } else if (prevStatus === "down" && (newStatus === "operational" || newStatus === "degraded")) {
    await recordIncidentResolved(monitor.id, now);
  }

  const updates: Partial<Monitor> = {
    status: newStatus,
    latency: result.latency,
    lastChecked: now,
    lastError: result.error || undefined,
    uptimePercentage,
    history: updatedHistory,
    updatedAt: now,
  };

  return updateMonitor(id, updates);
}

async function recordIncidentStart(monitorId: string, monitorName: string, cause: string, startedAt: string) {
  if (await isFirestoreReady()) {
    try {
      const incRef = adminDb.collection(INCIDENTS_COLLECTION).doc();
      const inc: Incident = {
        id: incRef.id,
        monitorId,
        monitorName,
        startedAt,
        cause,
        status: "ongoing",
      };
      await incRef.set(inc);
      return;
    } catch {
      // Fallback to local
    }
  }

  const incidents = readLocalIncidents();
  incidents.unshift({
    id: `inc_${Date.now()}`,
    monitorId,
    monitorName,
    startedAt,
    cause,
    status: "ongoing",
  });
  writeLocalIncidents(incidents.slice(0, 100));
}

async function recordIncidentResolved(monitorId: string, resolvedAt: string) {
  if (await isFirestoreReady()) {
    try {
      const activeIncidents = await adminDb
        .collection(INCIDENTS_COLLECTION)
        .where("monitorId", "==", monitorId)
        .where("status", "==", "ongoing")
        .get();

      for (const incDoc of activeIncidents.docs) {
        const incData = incDoc.data();
        const start = new Date(incData.startedAt).getTime();
        const end = new Date(resolvedAt).getTime();
        const duration = Math.max(1, Math.round((end - start) / 1000));
        await incDoc.ref.update({
          status: "resolved",
          resolvedAt,
          durationSeconds: duration,
        });
      }
      return;
    } catch {
      // Fallback
    }
  }

  const incidents = readLocalIncidents();
  const end = new Date(resolvedAt).getTime();
  for (const inc of incidents) {
    if (inc.monitorId === monitorId && inc.status === "ongoing") {
      const start = new Date(inc.startedAt).getTime();
      inc.status = "resolved";
      inc.resolvedAt = resolvedAt;
      inc.durationSeconds = Math.max(1, Math.round((end - start) / 1000));
    }
  }
  writeLocalIncidents(incidents);
}

/**
 * Check all monitors concurrently
 */
export async function checkAllMonitors(): Promise<Monitor[]> {
  const monitors = await getAllMonitors();
  const activeMonitors = monitors.filter((m) => m.active);

  await Promise.all(activeMonitors.map((m) => checkAndUpdateMonitor(m.id)));
  return getAllMonitors();
}

/**
 * Get all incidents
 */
export async function getAllIncidents(): Promise<Incident[]> {
  if (await isFirestoreReady()) {
    try {
      const snapshot = await adminDb.collection(INCIDENTS_COLLECTION).limit(50).get();
      const list = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Incident[];
      return list.sort((a, b) => (b.startedAt || "").localeCompare(a.startedAt || ""));
    } catch {
      // Fallback
    }
  }

  return readLocalIncidents();
}

/**
 * High level statistics
 */
export function calculateStats(monitors: Monitor[]): SystemStats {
  const total = monitors.length;
  const operational = monitors.filter((m) => m.status === "operational").length;
  const degraded = monitors.filter((m) => m.status === "degraded").length;
  const down = monitors.filter((m) => m.status === "down").length;

  const validLatencies = monitors
    .filter((m) => m.status !== "down" && m.latency > 0)
    .map((m) => m.latency);
  const avgLatency = validLatencies.length
    ? Math.round(validLatencies.reduce((a, b) => a + b, 0) / validLatencies.length)
    : 0;

  const uptimes = monitors.map((m) => m.uptimePercentage ?? 100);
  const uptimeAverage = uptimes.length
    ? Math.round((uptimes.reduce((a, b) => a + b, 0) / uptimes.length) * 10) / 10
    : 100;

  return {
    total,
    operational,
    degraded,
    down,
    avgLatency,
    uptimeAverage,
  };
}

export interface AgentReportInput {
  monitorId?: string;
  target?: string;
  name?: string;
  status: MonitorStatus;
  latency: number;
  statusCode?: number;
  error?: string;
  category?: MonitorCategory;
  type?: MonitorType;
}

/**
 * Record check result pushed from an Intranet Agent
 */
export async function recordAgentReport(report: AgentReportInput): Promise<Monitor> {
  const all = await getAllMonitors();
  let monitor: Monitor | undefined;

  if (report.monitorId) {
    monitor = all.find((m) => m.id === report.monitorId);
  }

  if (!monitor && report.target) {
    const cleanTarget = report.target.trim().toLowerCase().replace(/\/+$/, "");
    monitor = all.find((m) => m.target.trim().toLowerCase().replace(/\/+$/, "") === cleanTarget);
  }

  const now = new Date().toISOString();

  // If monitor doesn't exist yet, auto-create it!
  if (!monitor) {
    const target = report.target || "http://172.20.110.20/hrdonline";
    const newName = report.name || (target.includes("hrdonline") ? "HRD Online Intranet (172.20.110.20)" : `Target Intranet (${target})`);

    monitor = await createMonitor({
      name: newName,
      type: report.type || "http",
      category: report.category || "web",
      target: target,
      checkInterval: 1800,
      timeout: 5000,
      active: true,
      checkSource: "agent",
    });
  }

  const existingHistory = monitor.history || [];
  const newHistoryItem: CheckHistoryItem = {
    timestamp: now,
    status: report.status,
    latency: Math.max(0, Math.round(report.latency)),
    error: report.error,
    statusCode: report.statusCode,
  };

  const updatedHistory = [...existingHistory.slice(-29), newHistoryItem];
  const uptimePercentage = computeUptime(updatedHistory);

  const prevStatus = monitor.status;
  const newStatus = report.status;

  if (prevStatus !== "down" && newStatus === "down") {
    await recordIncidentStart(monitor.id, monitor.name, report.error || "Layanan Intranet tidak merespons", now);
  } else if (prevStatus === "down" && (newStatus === "operational" || newStatus === "degraded")) {
    await recordIncidentResolved(monitor.id, now);
  }

  const updates: Partial<Monitor> = {
    status: newStatus,
    latency: Math.max(0, Math.round(report.latency)),
    lastChecked: now,
    lastError: report.error || undefined,
    uptimePercentage,
    history: updatedHistory,
    checkSource: "agent",
    updatedAt: now,
  };

  const updated = await updateMonitor(monitor.id, updates);
  return updated || { ...monitor, ...updates };
}

