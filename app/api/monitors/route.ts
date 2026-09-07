import { NextResponse } from "next/server";
import { getAllMonitors, createMonitor, calculateStats } from "@/lib/monitors-service";
import { isAuthorizedEmail } from "@/lib/auth-config";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const monitors = await getAllMonitors();
    const stats = calculateStats(monitors);
    return NextResponse.json({ success: true, data: monitors, stats });
  } catch (error: unknown) {
    console.error("Failed to fetch monitors:", error);
    const msg = error instanceof Error ? error.message : "Failed to fetch monitors";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const adminEmail = request.headers.get("x-admin-email");
    if (!isAuthorizedEmail(adminEmail)) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Unauthorized: Hanya akun terotorisasi (fiqrin1805@gmail.com dan hasan@kwsg.co.id) yang dapat menambah target monitor." 
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    if (!body.name || !body.target || !body.type) {
      return NextResponse.json(
        { success: false, error: "Name, target, and type are required" },
        { status: 400 }
      );
    }

    const newMonitor = await createMonitor({
      name: body.name,
      type: body.type,
      category: body.category || "web",
      target: body.target,
      port: body.port ? Number(body.port) : undefined,
      dbType: body.dbType,
      method: body.method || "GET",
      expectedStatusCode: body.expectedStatusCode ? Number(body.expectedStatusCode) : 200,
      timeout: body.timeout ? Number(body.timeout) : 5000,
      checkInterval: body.checkInterval ? Number(body.checkInterval) : 1800,
      active: body.active ?? true,
      history: [],
    });

    return NextResponse.json({ success: true, data: newMonitor }, { status: 201 });
  } catch (error: unknown) {
    console.error("Failed to create monitor:", error);
    const msg = error instanceof Error ? error.message : "Failed to create monitor";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
