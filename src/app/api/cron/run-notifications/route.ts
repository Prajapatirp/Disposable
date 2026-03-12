import { NextRequest, NextResponse } from "next/server";
import { SchedulerService } from "@/lib/services/schedulerService";

/**
 * Cron endpoint: run notification checks (business rules).
 *
 * LOGIC FLOW:
 * 1. Cron (e.g. Vercel Cron) calls this route on a schedule.
 * 2. Query param "check" (optional): low_stock | dispatch | pending_bills. If omitted, all three run.
 * 3. SchedulerService runs the selected checks:
 *    - checkLowStock(): products with any variant quantityAvailable < 10 → create LOW_STOCK (skip if unread exists for that product).
 *    - checkDispatchOrders(): orders with status "Dispatch Stage" → create DISPATCH_REMINDER per order (skip if unread exists).
 *    - checkPendingBills(): bills with status "Pending" → create BILL_PENDING per bill (skip if unread exists).
 * 4. NotificationService.createNotification() prevents duplicates by checking (referenceId, type, isRead: false).
 *
 * SCHEDULE: Every 12 hours (e.g. 00:00 and 12:00 UTC).
 * All checks (low stock, dispatch reminder, pending bills) run together.
 *
 * In local dev, cron does NOT run automatically. Use the "Run checks" button in the notification dropdown to trigger.
 * Secure with CRON_SECRET: set env and send Authorization: Bearer <CRON_SECRET>.
 */
export async function GET(req: NextRequest) {
  // Optional: secure cron with secret header (Vercel Cron sends CRON_SECRET)
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const check = searchParams.get("check");

    let result: { lowStock?: number; dispatchReminder?: number; pendingBills?: number };

    if (check === "low_stock") {
      result = { lowStock: (await SchedulerService.checkLowStock()).created };
    } else if (check === "dispatch") {
      result = { dispatchReminder: (await SchedulerService.checkDispatchOrders()).created };
    } else if (check === "pending_bills") {
      result = { pendingBills: (await SchedulerService.checkPendingBills()).created };
    } else {
      result = await SchedulerService.runAll();
    }

    return NextResponse.json({ ok: true, created: result });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Cron run failed", details: String(e) },
      { status: 500 }
    );
  }
}
