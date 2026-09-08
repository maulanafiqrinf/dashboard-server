import { NextResponse } from "next/server";
import { recordAgentReport, AgentReportInput, getAllMonitors } from "@/lib/monitors-service";
import { isPrivateIpOrHost } from "@/lib/checker";

export const dynamic = "force-dynamic";

const DEFAULT_SECRET = "kwsg-intranet-agent-key-2026";

function isAuthorizedAgent(request: Request, body?: { secretKey?: string }): boolean {
  const configuredSecret = process.env.AGENT_SECRET_KEY || DEFAULT_SECRET;

  const headerKey = request.headers.get("x-agent-secret");
  if (headerKey && headerKey.trim() === configuredSecret.trim()) return true;

  const authHeader = request.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7).trim();
    if (token === configuredSecret.trim()) return true;
  }

  if (body?.secretKey && body.secretKey.trim() === configuredSecret.trim()) {
    return true;
  }

  return false;
}

export async function GET() {
  const all = await getAllMonitors();
  const intranetTargets = all.filter(
    (m) => m.active && (m.checkSource === "agent" || isPrivateIpOrHost(m.target))
  );

  return NextResponse.json({
    status: "online",
    service: "Semen Indonesia Cooperative - Intranet Agent Ingestion Gateway",
    endpoint: "/api/agent/report",
    method: "POST",
    timestamp: new Date().toISOString(),
    targetsCount: intranetTargets.length,
    targets: intranetTargets.map((m) => ({
      id: m.id,
      name: m.name,
      target: m.target,
      type: m.type,
      category: m.category,
      port: m.port,
      dbType: m.dbType,
      method: m.method || "GET",
      expectedStatusCode: m.expectedStatusCode || 200,
      timeout: m.timeout || 5000,
      lastChecked: m.lastChecked,
      status: m.status,
    })),
    documentation: {
      authHeader: "x-agent-secret: <YOUR_SECRET_KEY>",
      batchPayload: {
        reports: [
          {
            target: "http://172.20.110.20/hrdonline",
            name: "HRD Online",
            status: "operational",
            latency: 35,
            statusCode: 200,
          },
          {
            target: "http://172.20.110.20/aplikasi-lain",
            name: "Aplikasi Lain",
            status: "operational",
            latency: 42,
            statusCode: 200,
          },
        ],
      },
    },
  });
}

export async function POST(request: Request) {
  try {
    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    if (!isAuthorizedAgent(request, body)) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized: Secret Key Agent Intranet salah atau tidak diberikan pada header 'x-agent-secret'.",
        },
        { status: 401 }
      );
    }

    // Support single report or batch reports
    const rawReports: any[] = Array.isArray(body.reports)
      ? body.reports
      : [body];

    const results = [];
    for (const item of rawReports) {
      if (!item.target && !item.monitorId) {
        continue;
      }

      const input: AgentReportInput = {
        monitorId: item.monitorId,
        target: item.target,
        name: item.name,
        status: item.status === "down" ? "down" : item.status === "degraded" ? "degraded" : "operational",
        latency: typeof item.latency === "number" ? item.latency : 0,
        statusCode: item.statusCode,
        error: item.error || undefined,
        category: item.category || "web",
        type: item.type || "http",
      };

      const updated = await recordAgentReport(input);
      results.push(updated);
    }

    return NextResponse.json({
      success: true,
      processed: results.length,
      timestamp: new Date().toISOString(),
      data: results,
    });
  } catch (error: unknown) {
    console.error("Failed to process agent report:", error);
    const msg = error instanceof Error ? error.message : "Failed to process agent report";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
