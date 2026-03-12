import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/api-auth";
import { NotificationService } from "@/lib/services/notificationService";

/**
 * GET /api/notifications/unread-count
 * Returns { count: number } for navbar badge.
 */
export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  try {
    await connectDB();
    const count = await NotificationService.getUnreadCount();
    return NextResponse.json({ count });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to get unread count" },
      { status: 500 }
    );
  }
}
