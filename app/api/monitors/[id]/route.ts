import { NextResponse } from "next/server";
import { getMonitorById, updateMonitor, deleteMonitor } from "@/lib/monitors-service";
import { isAuthorizedEmail } from "@/lib/auth-config";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const monitor = await getMonitorById(id);
    if (!monitor) {
      return NextResponse.json({ success: false, error: "Monitor not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: monitor });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to fetch monitor";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminEmail = request.headers.get("x-admin-email");
    if (!isAuthorizedEmail(adminEmail)) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Unauthorized: Hanya akun terotorisasi (fiqrin1805@gmail.com dan hasan@kwsg.co.id) yang dapat mengubah data monitor." 
        },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const updated = await updateMonitor(id, body);
    if (!updated) {
      return NextResponse.json({ success: false, error: "Monitor not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to update monitor";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminEmail = request.headers.get("x-admin-email");
    if (!isAuthorizedEmail(adminEmail)) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Unauthorized: Hanya akun terotorisasi (fiqrin1805@gmail.com dan hasan@kwsg.co.id) yang dapat menghapus data monitor." 
        },
        { status: 403 }
      );
    }

    const { id } = await params;
    const ok = await deleteMonitor(id);
    return NextResponse.json({ success: ok });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to delete monitor";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
