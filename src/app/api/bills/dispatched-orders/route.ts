import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Order from "@/lib/models/Order";
import Bill from "@/lib/models/Bill";
import { requireAuth } from "@/lib/api-auth";
import mongoose from "mongoose";

export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  try {
    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get("clientId");
    if (!clientId || !mongoose.Types.ObjectId.isValid(clientId)) {
      return NextResponse.json({ error: "Valid clientId required" }, { status: 400 });
    }
    await connectDB();
    const alreadyBilled = await Bill.find({ clientId }).select("orderIds").lean();
    const billedOrderIds = alreadyBilled.flatMap((b) => (b.orderIds as mongoose.Types.ObjectId[]));
    const orders = await Order.find({
      clientId,
      status: "Dispatch Stage",
      _id: { $nin: billedOrderIds },
    })
      .populate("clientId", "firstName lastName phoneNumber address businessName")
      .sort({ createdDate: 1 })
      .lean();
    return NextResponse.json(orders);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch dispatched orders" }, { status: 500 });
  }
}
