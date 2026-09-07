import { NextResponse } from "next/server";
import { getAllIncidents } from "@/lib/monitors-service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const incidents = await getAllIncidents();
    return NextResponse.json({ success: true, data: incidents });
  } catch (error: unknown) {
    console.error("Failed to fetch incidents:", error);
    const msg = error instanceof Error ? error.message : "Failed to fetch incidents";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
