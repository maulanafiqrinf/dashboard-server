import { NextResponse } from "next/server";
import { checkAndUpdateMonitor } from "@/lib/monitors-service";

export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const updated = await checkAndUpdateMonitor(id);
    if (!updated) {
      return NextResponse.json({ success: false, error: "Monitor not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    console.error("Failed to check monitor:", error);
    const msg = error instanceof Error ? error.message : "Failed to check monitor";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
