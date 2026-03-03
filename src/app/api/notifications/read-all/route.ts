import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/api-auth";
import { NotificationService } from "@/lib/services/notificationService";

/**
 * PATCH /api/notifications/read-all
 * Mark all notifications as read (clear unread).
 */
export async function PATCH() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  try {
    await connectDB();
    const count = await NotificationService.markAllAsRead();
    return NextResponse.json({ marked: count });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to clear notifications" },
      { status: 500 }
    );
  }
}
