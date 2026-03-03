import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/api-auth";
import { NotificationService } from "@/lib/services/notificationService";

/**
 * GET /api/notifications
 * Returns all notifications (newest first), optional ?limit=
 */
export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const limit = Math.min(Number(searchParams.get("limit")) || 50, 100);
    const list = await NotificationService.getAllNotifications(limit);
    return NextResponse.json(list);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/notifications
 * Delete all notifications (clear from dropdown and recent list).
 */
export async function DELETE() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  try {
    await connectDB();
    const count = await NotificationService.deleteAll();
    return NextResponse.json({ deleted: count });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to clear notifications" },
      { status: 500 }
    );
  }
}
