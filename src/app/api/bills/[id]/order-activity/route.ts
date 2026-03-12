import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Bill from "@/lib/models/Bill";
import OrderHistory from "@/lib/models/OrderHistory";
import { requireAuth } from "@/lib/api-auth";
import mongoose from "mongoose";

/**
 * GET order-activity for a bill: timeline of orders added to / removed from this bill
 * (same data as "Bills for this order" on order detail, but from the bill's perspective).
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  try {
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid bill ID" }, { status: 400 });
    }
    await connectDB();
    const bill = await Bill.findById(id).select("billNumber").lean();
    if (!bill) return NextResponse.json({ error: "Bill not found" }, { status: 404 });
    const billNumber = (bill as { billNumber: string }).billNumber;
    const escaped = billNumber.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const actionRegex = new RegExp(escaped);

    const entries = await OrderHistory.find({
      statusName: { $in: ["Added to bill", "Removed from bill"] },
      action: actionRegex,
    })
      .sort({ performedAt: 1 })
      .populate("orderId", "orderNumber _id")
      .lean();

    const list = (entries as { _id: unknown; orderId: { _id: unknown; orderNumber?: string }; statusName: string; action: string; performedBy: string; performedAt: Date }[]).map(
      (e) => ({
        _id: e._id,
        orderId: e.orderId
          ? { _id: String((e.orderId as { _id: unknown })._id), orderNumber: (e.orderId as { orderNumber?: string }).orderNumber }
          : null,
        statusName: e.statusName,
        action: e.action,
        performedBy: e.performedBy,
        performedAt: e.performedAt,
      })
    );
    return NextResponse.json(list);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch order activity" }, { status: 500 });
  }
}
