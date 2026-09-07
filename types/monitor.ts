export type MonitorType = "http" | "tcp" | "database" | "ping";
export type MonitorCategory = "web" | "api" | "database" | "server" | "network";
export type MonitorStatus = "operational" | "degraded" | "down" | "pending";
export type DatabaseType = "mysql" | "postgres" | "redis" | "mongodb" | "generic";

export interface CheckHistoryItem {
  timestamp: string;
  status: MonitorStatus;
  latency: number; // in ms
  error?: string;
  statusCode?: number;
}

export interface Monitor {
  id: string;
  name: string;
  type: MonitorType;
  category: MonitorCategory;
  target: string; // URL for HTTP, Hostname/IP for TCP & DB
  port?: number; // For TCP and Database
  dbType?: DatabaseType;
  method?: "GET" | "POST" | "HEAD";
  expectedStatusCode?: number;
  timeout?: number; // ms, default 5000
  checkInterval?: number; // seconds, default 60
  status: MonitorStatus;
  latency: number; // ms
  lastChecked?: string;
  lastError?: string;
  uptimePercentage?: number; // 0 - 100
  active: boolean;
  history?: CheckHistoryItem[];
  createdAt: string;
  updatedAt: string;
}

export interface Incident {
  id: string;
  monitorId: string;
  monitorName: string;
  startedAt: string;
  resolvedAt?: string;
  durationSeconds?: number;
  cause: string;
  status: "ongoing" | "resolved";
}

export interface SystemStats {
  total: number;
  operational: number;
  degraded: number;
  down: number;
  avgLatency: number;
  uptimeAverage: number;
}
