import net from "net";
import dns from "dns/promises";
import { Monitor, MonitorStatus, CheckHistoryItem } from "@/types/monitor";

export interface CheckResult {
  status: MonitorStatus;
  latency: number;
  statusCode?: number;
  error?: string;
  details?: string;
}

/**
 * Check an HTTP or HTTPS endpoint
 */
export async function checkHttp(
  url: string,
  method: string = "GET",
  expectedStatus: number = 200,
  timeoutMs: number = 5000
): Promise<CheckResult> {
  const start = performance.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const formattedUrl = url.startsWith("http://") || url.startsWith("https://") 
      ? url 
      : `http://${url}`;

    const res = await fetch(formattedUrl, {
      method,
      signal: controller.signal,
      headers: {
        "User-Agent": "ServerMonitorDashboard/1.0",
        "Accept": "*/*",
      },
      cache: "no-store",
    });

    clearTimeout(timeoutId);
    const latency = Math.round(performance.now() - start);

    const isExpected = expectedStatus 
      ? res.status === expectedStatus 
      : (res.status >= 200 && res.status < 400);

    if (isExpected) {
      // If latency is very high (> 2500ms), consider degraded
      const status: MonitorStatus = latency > 2500 ? "degraded" : "operational";
      return {
        status,
        latency,
        statusCode: res.status,
        details: `HTTP ${res.status} ${res.statusText}`,
      };
    } else {
      return {
        status: "down",
        latency,
        statusCode: res.status,
        error: `HTTP ${res.status} ${res.statusText} (Expected: ${expectedStatus})`,
      };
    }
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    const latency = Math.round(performance.now() - start);
    let errorMessage = "Unknown HTTP error";

    if (err instanceof Error) {
      if (err.name === "AbortError") {
        errorMessage = `Request timed out after ${timeoutMs}ms`;
      } else {
        errorMessage = err.message;
      }
    }

    return {
      status: "down",
      latency,
      error: errorMessage,
    };
  }
}

/**
 * Check TCP socket connectivity (Server ports, SSH, generic TCP services)
 */
export function checkTcp(
  host: string,
  port: number,
  timeoutMs: number = 5000
): Promise<CheckResult> {
  return new Promise((resolve) => {
    const start = performance.now();
    const cleanHost = host.replace(/^https?:\/\//, "").split("/")[0].split(":")[0];
    const socket = new net.Socket();

    let resolved = false;

    const finalize = (status: MonitorStatus, error?: string, details?: string) => {
      if (resolved) return;
      resolved = true;
      socket.destroy();
      const latency = Math.round(performance.now() - start);
      resolve({
        status,
        latency,
        error,
        details,
      });
    };

    socket.setTimeout(timeoutMs);

    socket.on("connect", () => {
      const latency = Math.round(performance.now() - start);
      const status: MonitorStatus = latency > 2000 ? "degraded" : "operational";
      finalize(status, undefined, `TCP Port ${port} is open and responding`);
    });

    socket.on("timeout", () => {
      finalize("down", `Connection timed out after ${timeoutMs}ms on port ${port}`);
    });

    socket.on("error", (err: NodeJS.ErrnoException) => {
      let msg = err.message;
      if (err.code === "ECONNREFUSED") {
        msg = `Connection refused on port ${port}. The service may not be running.`;
      } else if (err.code === "ENOTFOUND") {
        msg = `Host "${cleanHost}" not found (DNS resolution failed).`;
      } else if (err.code === "ETIMEDOUT") {
        msg = `Connection timed out to ${cleanHost}:${port}.`;
      }
      finalize("down", msg);
    });

    try {
      socket.connect(port, cleanHost);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      finalize("down", `Failed to initiate socket connection: ${msg}`);
    }
  });
}

/**
 * Check Database Connection (MySQL, Redis, Postgres, MongoDB)
 */
export function checkDatabase(
  dbType: string = "mysql",
  host: string,
  port: number,
  timeoutMs: number = 5000
): Promise<CheckResult> {
  const cleanHost = host.replace(/^https?:\/\//, "").split("/")[0].split(":")[0];

  // For Redis, send PING and expect +PONG
  if (dbType === "redis") {
    return new Promise((resolve) => {
      const start = performance.now();
      const socket = new net.Socket();
      let resolved = false;

      const finalize = (status: MonitorStatus, error?: string, details?: string) => {
        if (resolved) return;
        resolved = true;
        socket.destroy();
        const latency = Math.round(performance.now() - start);
        resolve({ status, latency, error, details });
      };

      socket.setTimeout(timeoutMs);

      socket.on("connect", () => {
        socket.write("*1\r\n$4\r\nPING\r\n");
      });

      socket.on("data", (data) => {
        const text = data.toString();
        if (text.includes("PONG") || text.includes("NOAUTH") || text.includes("ERR")) {
          // Connected and responded to Redis protocol
          const latency = Math.round(performance.now() - start);
          const status: MonitorStatus = latency > 1500 ? "degraded" : "operational";
          finalize(status, undefined, `Redis service responding (${text.trim()})`);
        } else {
          finalize("operational", undefined, `Redis port connected`);
        }
      });

      socket.on("timeout", () => {
        finalize("down", `Redis connection timed out after ${timeoutMs}ms`);
      });

      socket.on("error", (err: NodeJS.ErrnoException) => {
        let msg = err.message;
        if (err.code === "ECONNREFUSED") {
          msg = `Redis service not reachable on ${cleanHost}:${port} (Connection Refused)`;
        }
        finalize("down", msg);
      });

      socket.connect(port || 6379, cleanHost);
    });
  }

  // For MySQL, MySQL servers send an initial handshake packet on connect
  if (dbType === "mysql") {
    return new Promise((resolve) => {
      const start = performance.now();
      const socket = new net.Socket();
      let resolved = false;

      const finalize = (status: MonitorStatus, error?: string, details?: string) => {
        if (resolved) return;
        resolved = true;
        socket.destroy();
        const latency = Math.round(performance.now() - start);
        resolve({ status, latency, error, details });
      };

      socket.setTimeout(timeoutMs);

      socket.on("connect", () => {
        // Connected!
      });

      socket.on("data", (data) => {
        // MySQL sends protocol version & server version in initial greeting packet
        const str = data.toString("ascii");
        let serverVersion = "";
        const match = str.match(/([0-9]+\.[0-9]+\.[0-9]+[a-zA-Z0-9-]*)/);
        if (match) {
          serverVersion = ` (v${match[1]})`;
        }
        finalize("operational", undefined, `MySQL/MariaDB active${serverVersion}`);
      });

      socket.on("timeout", () => {
        finalize("down", `MySQL connection timed out after ${timeoutMs}ms`);
      });

      socket.on("error", (err: NodeJS.ErrnoException) => {
        let msg = err.message;
        if (err.code === "ECONNREFUSED") {
          msg = `MySQL service not running or port ${port} is closed (Connection Refused)`;
        }
        finalize("down", msg);
      });

      // Default port 3306
      socket.connect(port || 3306, cleanHost);
    });
  }

  // Generic DB or Postgres/Mongo fallback to TCP socket check
  const defaultPort = dbType === "postgres" ? 5432 : dbType === "mongodb" ? 27017 : port || 3306;
  return checkTcp(cleanHost, defaultPort, timeoutMs);
}

/**
 * Check DNS host resolution
 */
export async function checkDns(host: string): Promise<CheckResult> {
  const start = performance.now();
  const cleanHost = host.replace(/^https?:\/\//, "").split("/")[0].split(":")[0];

  try {
    const res = await dns.lookup(cleanHost);
    const latency = Math.round(performance.now() - start);
    return {
      status: "operational",
      latency,
      details: `Resolved IP: ${res.address} (IPv${res.family})`,
    };
  } catch (err: unknown) {
    const latency = Math.round(performance.now() - start);
    return {
      status: "down",
      latency,
      error: err instanceof Error ? err.message : "DNS resolution failed",
    };
  }
}

/**
 * Unified check dispatcher for a monitor instance
 */
export async function runMonitorCheck(monitor: Monitor): Promise<CheckResult> {
  const timeout = monitor.timeout || 5000;

  switch (monitor.type) {
    case "http":
      return checkHttp(
        monitor.target,
        monitor.method || "GET",
        monitor.expectedStatusCode || 200,
        timeout
      );

    case "database":
      return checkDatabase(
        monitor.dbType || "mysql",
        monitor.target,
        monitor.port || (monitor.dbType === "postgres" ? 5432 : monitor.dbType === "redis" ? 6379 : 3306),
        timeout
      );

    case "tcp":
      return checkTcp(monitor.target, monitor.port || 80, timeout);

    case "ping":
      return checkDns(monitor.target);

    default:
      return {
        status: "down",
        latency: 0,
        error: `Unsupported check type: ${monitor.type}`,
      };
  }
}
