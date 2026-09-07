import { NextResponse } from "next/server";
import { checkAllMonitors, calculateStats } from "@/lib/monitors-service";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const updatedMonitors = await checkAllMonitors();
    const stats = calculateStats(updatedMonitors);
    return NextResponse.json({ success: true, data: updatedMonitors, stats });
  } catch (error: unknown) {
    console.error("Failed to run health checks:", error);
    const msg = error instanceof Error ? error.message : "Failed to run health checks";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
