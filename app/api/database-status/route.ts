import { NextResponse } from "next/server";
import { checkFirestoreConnectivity } from "@/lib/monitors-service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const status = await checkFirestoreConnectivity();
    return NextResponse.json({
      success: true,
      ...status,
      projectId: "apt-footing-392911",
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error checking DB status";
    return NextResponse.json({
      success: false,
      connected: false,
      message: msg,
      projectId: "apt-footing-392911",
    });
  }
}
